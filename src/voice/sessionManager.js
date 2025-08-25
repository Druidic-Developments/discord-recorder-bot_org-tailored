import { joinVoiceChannel, entersState, VoiceConnectionStatus } from '@discordjs/voice';
import { ChannelType, PermissionsBitField } from 'discord.js';
import { EventEmitter } from 'events';
import prism from 'prism-media';
import { SessionClock } from '../utils/timeline.js';
import { UserWriter } from './writer.js';
import { sessionDir as ensureSessionDir } from '../utils/paths.js';
import { CONFIG } from '../config.js';
import { Consent, Session, Track, getPolicyHash } from '../storage/db.js';

export class RecordingSession extends EventEmitter {
  constructor({ client, guild, channel, starterId, mode }) {
    super();
    this.client = client;
    this.guild = guild;
    this.channel = channel;
    this.starterId = starterId;
    this.mode = mode;
    this.clock = new SessionClock({ sampleRate: 48000, frameMs: 20 });
    this.samplesPerFrame = this.clock.samplesPerFrame;
    this.connection = null;
    this.receiver = null;
    this.writers = new Map();
    this.presentUsers = new Set();
    this.sessionId = new Date().toISOString().replace(/[:.]/g,'-');
    this.policyHash = getPolicyHash();
    this.alignmentMode = CONFIG.ALIGNMENT_MODE;
    this.padAfterOptout = CONFIG.PAD_AFTER_OPTOUT;
    this.sessionDir = ensureSessionDir(this.sessionId);
    this.ended = false;
  }

  async connect() {
    if (this.channel.type !== ChannelType.GuildVoice) throw new Error('Target is not a voice channel');
    const me = this.guild.members.me;
    const perms = this.channel.permissionsFor(me);
    if (!perms?.has(PermissionsBitField.Flags.ViewChannel) || !perms?.has(PermissionsBitField.Flags.Connect)) {
      throw new Error('Missing View Channel and/or Connect permissions in target channel');
    }

    this.connection = joinVoiceChannel({
      channelId: this.channel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: true
    });
    this.connection.on('error', e => this.emit('error', e));
    await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
    this.receiver = this.connection.receiver;

    for (const [memberId, member] of this.channel.members) {
      if (!member.user.bot) this.presentUsers.add(memberId);
    }

    if (this.mode === 'strict') {
      const blockers = [...this.presentUsers].filter(uid => !Consent.isConsented(uid, this.guild.id, this.policyHash));
      if (blockers.length) {
        throw new Error(`Strict mode: ${blockers.length} member(s) present without consent.`);
      }
    }

    this.clock.on('tick', (frameIndex) => {
      for (const [uid, writer] of this.writers) {
        writer.writeTick(frameIndex);
      }
    });
    this.clock.start();
    this._wireReceiver();
  }

  _wireReceiver() {
    this.receiver.speaking.on('start', (userId) => {
      if (!Consent.isConsented(userId, this.guild.id, this.policyHash)) return;
      this._ensureWriter(userId);
      this._subscribeUser(userId);
    });

    this.client.on('voiceStateUpdate', (oldS, newS) => {
      if (oldS.channelId === this.channel.id && newS.channelId !== this.channel.id) {
        this.presentUsers.delete(oldS.id);
      } else if (newS.channelId === this.channel.id) {
        if (!newS.member.user.bot) this.presentUsers.add(newS.id);
        if (Consent.isConsented(newS.id, this.guild.id, this.policyHash)) {
          const w = this._ensureWriter(newS.id);
          const nowFrame = this.clock.nowFrames();
          w.padToFrame(nowFrame);
          this._subscribeUser(newS.id);
        }
      }
    });
  }

  _ensureWriter(userId) {
    if (this.writers.has(userId)) return this.writers.get(userId);
    const member = this.guild.members.cache.get(userId);
    const username = member ? member.displayName : `user-${userId}`;
    const writer = new UserWriter({
      sessionId: this.sessionId,
      userId,
      username,
      sessionDir: this.sessionDir,
      guildName: this.guild.name,
      channelName: this.channel.name,
      fileExt: CONFIG.OUTPUT_FORMAT,
      samplesPerFrame: this.samplesPerFrame
    });
    this.writers.set(userId, writer);
    return writer;
  }

  _subscribeUser(userId) {
    if (!this.receiver) return;
    const opusStream = this.receiver.subscribe(userId, { end: { behavior: 'manual' } });
    const decoder = new prism.opus.Decoder({ rate: 48000, channels: 1, frameSize: this.samplesPerFrame });
    const pcmStream = opusStream.pipe(decoder);

    pcmStream.on('data', (chunk) => {
      const frameBytes = this.samplesPerFrame * 2;
      for (let i = 0; i + frameBytes <= chunk.length; i += frameBytes) {
        const frame = chunk.subarray(i, i + frameBytes);
        const writer = this._ensureWriter(userId);
        const frameIndex = this.clock.nowFrames();
        writer.enqueueFrame(frameIndex, frame);
      }
    });
    pcmStream.on('error', (e) => this.emit('error', e));
  }

  async stopAndFinalize() {
    if (this.ended) return;
    this.ended = true;

    // 1) Compute final frame now (before stopping clock)
    const finalFrame = this.clock.nowFrames();

    // 2) Stop the clock so no more scheduled writes occur
    this.clock.stop();

    // 3) Give a brief grace period for decoder flush
    await new Promise(r => setTimeout(r, 250));

    // 4) Stop receiving new audio
    try { this.receiver?.speaking.removeAllListeners(); } catch {}
    try { this.connection?.receiver?.subscriptions?.clear?.(); } catch {}

    // 5) Drain all writers up to finalFrame + a tiny cushion
    const flushTo = finalFrame + 1;
    for (const [, w] of this.writers) {
      w.drainTo(flushTo);
    }

    // 6) Destroy the connection
    try { this.connection?.destroy(); } catch {}

    // 7) Finalize & encode
    const results = [];
    for (const [uid, w] of this.writers) {
      const meta = await w.finalizeAndEncode({ sessionId: this.sessionId, frameMs: this.clock.frameMs });
      results.push({ userId: uid, username: w.username, ...meta, segments: w.segmentsMs(this.clock.frameMs) });
    }
    return results;
  }
}

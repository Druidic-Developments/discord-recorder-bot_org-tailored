import path from 'path';
import fs from 'fs';
import { PcmWriter, encodePcmToTarget } from '../utils/audio.js';
import { sha256OfFile } from '../utils/hash.js';
import { CONFIG } from '../config.js';

export class UserWriter {
  constructor({ sessionId, userId, username, sessionDir, guildName, channelName, fileExt, samplesPerFrame, firstOffsetFrames = 0 }) {
    this.userId = userId;
    this.username = username;
    this.fileExt = fileExt;
    this.samplesPerFrame = samplesPerFrame;
    this.firstOffsetFrames = firstOffsetFrames;
    this.baseName = `${username}-${userId}`;
    this.rawPath = path.join(sessionDir, `${this.baseName}.raw`);
    this.outPath = path.join(sessionDir, `${this.baseName}.${fileExt}`);
    this.writer = new PcmWriter({ filePath: this.rawPath, samplesPerFrame });
    this.framesQueue = new Map(); // frameIndex -> Buffer(PCM)
    this.present = false;
    this.consentActive = true;
  }

  enqueueFrame(frameIndex, pcmFrame) {
    this.framesQueue.set(frameIndex, pcmFrame);
  }

  /** Called each session tick for frameIndex */
  writeTick(frameIndex) {
    if (!this.consentActive) return 'inactive';
    const frame = this.framesQueue.get(frameIndex);
    if (frame) {
      this.writer.writeSpeechFrame(frame);
      this.framesQueue.delete(frameIndex);
      return 'speech';
    } else {
      this.writer.writeSilenceFrames(1);
      return 'silence';
    }
  }

  padToFrame(targetFrame) {
    const currentFrames = this.writer.writtenSamples / this.samplesPerFrame;
    const gap = targetFrame - currentFrames;
    if (gap > 0) this.writer.writeSilenceFrames(gap);
  }

  async finalizeAndEncode({ sessionId, sessionStart, sessionEnd }) {
    this.writer.close();

    await encodePcmToTarget(this.rawPath, this.outPath);
    const stat = fs.statSync(this.outPath);
    const sha = await sha256OfFile(this.outPath);
    const durationMs = Math.round((this.writer.writtenSamples / 48000) * 1000);
    try { fs.unlinkSync(this.rawPath); } catch {}
    return { path: this.outPath, sha256: sha, bytes: stat.size, durationMs, firstOffsetMs: Math.round(this.firstOffsetFrames * (1000*20/1_000)) };
  }

  segmentsMs(frameMs) {
    return this.writer.segments.map(seg => ({
      type: seg.type,
      start_ms: Math.round(seg.startFrame * frameMs),
      end_ms: Math.round(seg.endFrame * frameMs)
    }));
  }
}

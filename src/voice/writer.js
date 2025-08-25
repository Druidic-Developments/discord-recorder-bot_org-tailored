import path from 'path';
import fs from 'fs';
import { PcmWriter, encodePcmToTarget } from '../utils/audio.js';
import { sha256OfFile } from '../utils/hash.js';

/**
 * UserWriter buffers decoded PCM frames keyed by frame index and writes
 * one frame per session tick. It can also "drain" pending frames up to a
 * target frame index to ensure nothing is lost at /stop.
 */
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
    this.framesQueue = new Map(); // frameIndex -> Buffer
    this.present = false;
    this.consentActive = true;
  }

  enqueueFrame(frameIndex, pcmFrame) {
    this.framesQueue.set(frameIndex, pcmFrame);
  }

  /** Current written frame index (integer). */
  currentFrame() {
    return Math.floor(this.writer.writtenSamples / this.samplesPerFrame);
  }

  /** Write frames (speech or silence) up to targetFrame (exclusive). */
  drainTo(targetFrame) {
    let f = this.currentFrame();
    while (f < targetFrame) {
      const speech = this.framesQueue.get(f);
      if (speech) {
        this.writer.writeSpeechFrame(speech);
        this.framesQueue.delete(f);
      } else {
        this.writer.writeSilenceFrames(1);
      }
      f++;
    }
  }

  /** Called by the session clock once per frame. */
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
    const current = this.currentFrame();
    const gap = targetFrame - current;
    if (gap > 0) this.writer.writeSilenceFrames(gap);
  }

  async finalizeAndEncode({ sessionId, sessionStart, sessionEnd, frameMs = 20 }) {
    this.writer.close();
    await encodePcmToTarget(this.rawPath, this.outPath);
    const stat = fs.statSync(this.outPath);
    const sha = await sha256OfFile(this.outPath);
    const durationMs = Math.round((this.writer.writtenSamples / 48000) * 1000);
    try { fs.unlinkSync(this.rawPath); } catch {}
    return {
      path: this.outPath,
      sha256: sha,
      bytes: stat.size,
      durationMs,
      firstOffsetMs: Math.round(this.firstOffsetFrames * frameMs)
    };
  }

  segmentsMs(frameMs) {
    return this.writer.segments.map(seg => ({
      type: seg.type,
      start_ms: Math.round(seg.startFrame * frameMs),
      end_ms: Math.round(seg.endFrame * frameMs)
    }));
  }
}

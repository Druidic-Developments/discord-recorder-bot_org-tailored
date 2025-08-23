import { EventEmitter } from 'node:events';

/** SessionClock emits a 'tick' every frameMs; frameIndex increments from 0 at start. */
export class SessionClock extends EventEmitter {
  constructor({ sampleRate = 48000, frameMs = 20 } = {}) {
    super();
    this.sampleRate = sampleRate;
    this.frameMs = frameMs;
    this.samplesPerFrame = Math.round(sampleRate * (frameMs / 1000));
    this.startHr = null;
    this.timer = null;
    this.frameIndex = 0;
  }

  start() {
    if (this.timer) return;
    this.startHr = process.hrtime.bigint();
    this.frameIndex = 0;
    const interval = this.frameMs;
    this.timer = setInterval(() => {
      this.emit('tick', this.frameIndex++);
    }, interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  nowFrames() {
    if (!this.startHr) return 0;
    const ns = process.hrtime.bigint() - this.startHr;
    const ms = Number(ns / 1_000_000n);
    return Math.floor(ms / this.frameMs);
  }
}

import { describe, it, expect } from 'vitest';
import { PcmWriter } from '../src/utils/audio.js';

describe('silence padding math', () => {
  it('pads missing frames correctly', () => {
    const w = new PcmWriter({ filePath: '/mnt/data/tmp.raw', samplesPerFrame: 960 });
    w.writeSilenceFrames(3);
    w.writeSpeechFrame(Buffer.alloc(960*2, 1));
    w.writeSilenceFrames(2);
    w.close();
    expect(w.segments.length).toBe(3);
    expect(w.segments[0].type).toBe('silence');
    expect(w.segments[1].type).toBe('speech');
  });
});

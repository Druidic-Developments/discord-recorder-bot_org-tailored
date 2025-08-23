import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { CONFIG } from '../config.js';

/** Write raw PCM S16LE mono frames to a file. */
export class PcmWriter {
  constructor({ filePath, samplesPerFrame = 960 }) {
    this.filePath = filePath;
    this.fd = fs.openSync(filePath, 'w');
    this.samplesPerFrame = samplesPerFrame;
    this.writtenSamples = 0;
    this.currentSegment = null; // {type,startFrame}
    this.segments = [];
  }

  /** write one frame (Buffer of length samplesPerFrame*2 bytes) */
  writeSpeechFrame(frameBuf) {
    fs.writeSync(this.fd, frameBuf);
    this._appendSegment('speech', 1);
  }

  writeSilenceFrames(nFrames) {
    if (nFrames <= 0) return;
    const zeros = Buffer.alloc(nFrames * this.samplesPerFrame * 2, 0);
    fs.writeSync(this.fd, zeros);
    this._appendSegment('silence', nFrames);
  }

  _appendSegment(type, nFrames) {
    const startFrame = this.writtenSamples / this.samplesPerFrame;
    this.writtenSamples += nFrames * this.samplesPerFrame;

    if (!this.currentSegment || this.currentSegment.type !== type) {
      // close previous
      if (this.currentSegment) {
        this.currentSegment.endFrame = startFrame;
        this.segments.push(this.currentSegment);
      }
      this.currentSegment = { type, startFrame };
    }
    // otherwise, extend current segment implicitly by increasing writtenSamples
  }

  finalizeSegments() {
    if (this.currentSegment) {
      this.currentSegment.endFrame = this.writtenSamples / this.samplesPerFrame;
      this.segments.push(this.currentSegment);
      this.currentSegment = null;
    }
  }

  close() {
    this.finalizeSegments();
    fs.closeSync(this.fd);
  }
}

export async function encodePcmToTarget(rawPcmPath, outPath) {
  const ext = path.extname(outPath).slice(1).toLowerCase();
  const args = ['-f','s16le','-ar','48000','-ac','1','-i',rawPcmPath];
  if (ext === 'mp3') {
    args.push('-c:a','libmp3lame','-b:a', `${CONFIG.BITRATE}k`);
  } else if (ext === 'flac') {
    args.push('-c:a','flac');
  } else if (ext === 'wav') {
    args.push('-c:a','pcm_s16le');
  } else {
    throw new Error(`Unsupported format: ${ext}`);
  }
  args.push('-y', outPath);

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath || 'ffmpeg', args, { stdio: 'ignore' });
    proc.on('error', reject);
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
  });
}

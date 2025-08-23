import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID || null,

  AUDIO_DIR: process.env.AUDIO_DIR || './recordings',
  RETENTION_DAYS: parseInt(process.env.RETENTION_DAYS || '30', 10),
  OUTPUT_FORMAT: (process.env.OUTPUT_FORMAT || 'mp3').toLowerCase(),
  BITRATE: parseInt(process.env.BITRATE || '128', 10),
  ALIGNMENT_MODE: (process.env.ALIGNMENT_MODE || 'pad').toLowerCase(),
  PAD_AFTER_OPTOUT: String(process.env.PAD_AFTER_OPTOUT || 'false').toLowerCase() === 'true',

  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

export function ensureDirs() {
  fs.mkdirSync(CONFIG.AUDIO_DIR, { recursive: true });
  fs.mkdirSync(path.join(CONFIG.AUDIO_DIR, 'exports'), { recursive: true });
}

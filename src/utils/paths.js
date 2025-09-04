import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config.js';

export function tsToStamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function sessionDir(sessionId) {
  const dir = path.join(CONFIG.AUDIO_DIR, sessionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function userFileName(sessionId, guildName, channelName, username, userId, ext) {
  const safe = (s) => s.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 64);
  return `${tsToStamp()}-${safe(guildName)}-${safe(channelName)}-${safe(username)}-${userId}.${ext}`;
}

export function safeJoin(base, ...segments) {
  const baseResolved = path.resolve(base);
  const full = path.resolve(baseResolved, ...segments);
  if (!full.startsWith(baseResolved + path.sep)) {
    throw new Error('Attempted path traversal outside base directory');
  }
  return full;
}

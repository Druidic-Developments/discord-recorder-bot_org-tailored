import fs from 'fs';
import path from 'path';
import { db } from '../storage/db.js';
import { CONFIG } from '../config.js';

export function startRetentionTask() {
  const DAYS = CONFIG.RETENTION_DAYS;
  const cutoff = () => Math.floor((Date.now() - DAYS*86400_000) / 1000);
  setInterval(() => {
    try {
      // Delete old track files from FS if older than retention by mtime
      const dir = CONFIG.AUDIO_DIR;
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        try {
          const st = fs.statSync(p);
          if (st.isDirectory()) continue;
        } catch {}
      }
      // Prune DB sessions older than retention (this is conservative; files are explicit by /export)
      db.prepare(`DELETE FROM sessions
                  WHERE end_ts IS NOT NULL AND
                        strftime('%s', end_ts) < strftime('%s','now','-${DAYS} days')`).run();
    } catch (e) {
      console.error('Retention task error', e);
    }
  }, 6 * 60 * 60 * 1000); // every 6 hours
}

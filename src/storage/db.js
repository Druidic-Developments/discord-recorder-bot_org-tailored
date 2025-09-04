import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';
import { sha256OfString } from '../utils/hash.js';

const DB_PATH = path.join('storage', 'recorder.sqlite3');
fs.mkdirSync('storage', { recursive: true });

export const db = new Database(DB_PATH);

function bootstrap() {
  const schema = fs.readFileSync(path.join('storage', 'schema.sql'), 'utf-8');
  db.exec(schema);

  // Cache policy hash in kv
  const policy = fs.readFileSync('POLICY.md', 'utf-8');
  const hash = sha256OfString(policy);
  db.prepare('INSERT OR REPLACE INTO kv(key,value) VALUES (?,?)').run('policy_hash', hash);
}
bootstrap();

export function getPolicyHash() {
  const row = db.prepare('SELECT value FROM kv WHERE key=?').get('policy_hash');
  return row?.value;
}

export const Consent = {
  upsert({ userId, guildId, consent, policyHash }) {
    db.prepare(`
      INSERT INTO consents(user_id,guild_id,consent,policy_hash,updated_at)
      VALUES (@userId,@guildId,@consent,@policyHash,datetime('now'))
      ON CONFLICT(user_id,guild_id) DO UPDATE SET
        consent=excluded.consent, policy_hash=excluded.policy_hash, updated_at=datetime('now')
    `).run({ userId, guildId, consent: consent ? 1 : 0, policyHash });
  },
  get(userId, guildId) {
    return db.prepare('SELECT * FROM consents WHERE user_id=? AND guild_id=?').get(userId, guildId);
  },
  isConsented(userId, guildId, policyHash) {
    const row = this.get(userId,guildId);
    return !!(row && row.consent === 1 && row.policy_hash === policyHash);
  },
  deleteUser(userId, guildId) {
    db.prepare('DELETE FROM consents WHERE user_id=? AND guild_id=?').run(userId, guildId);
  }
};

export const Session = {
  create({ id, guildId, channelId, starterId, mode, policyHash, alignmentMode, retentionDays }) {
    db.prepare(`INSERT INTO sessions(id,guild_id,channel_id,starter_id,mode,policy_hash,start_ts,alignment_mode,retention_days)
                VALUES (@id,@guildId,@channelId,@starterId,@mode,@policyHash,datetime('now'),@alignmentMode,@retentionDays)`)
      .run({ id, guildId, channelId, starterId, mode, policyHash, alignmentMode, retentionDays });
  },
  end(id) {
    db.prepare("UPDATE sessions SET end_ts=datetime('now') WHERE id=?").run(id);
  },
  get(id) { return db.prepare('SELECT * FROM sessions WHERE id=?').get(id); },
  latestInGuild(guildId) {
    return db.prepare('SELECT * FROM sessions WHERE guild_id=? ORDER BY start_ts DESC LIMIT 1').get(guildId);
  }
};

export const Track = {
  insert({ sessionId, userId, username, path, durationMs, sha256, bytes, firstOffsetMs }) {
    db.prepare(`INSERT INTO tracks(session_id,user_id,username,path,duration_ms,sha256,bytes,first_offset_ms)
                VALUES (@sessionId,@userId,@username,@path,@durationMs,@sha256,@bytes,@firstOffsetMs)`)
      .run({ sessionId, userId, username, path, durationMs, sha256, bytes, firstOffsetMs });
  },
  deleteByUserInGuild({ userId, guildId }) {
    const sessions = db.prepare('SELECT id FROM sessions WHERE guild_id=?').all(guildId);
    const ids = sessions.map(s => s.id);
    if (!ids.length) return 0;
    const marks = ids.map(()=>'?').join(',');
    const rows = db.prepare(`SELECT path FROM tracks WHERE session_id IN (${marks}) AND user_id=?`).all(...ids, userId);
    const base = path.resolve(CONFIG.AUDIO_DIR);
    for (const row of rows) {
      try {
        const p = path.resolve(row.path);
        if (p.startsWith(base + path.sep)) fs.unlinkSync(p);
      } catch {}
    }
    db.prepare(`DELETE FROM tracks WHERE session_id IN (${marks}) AND user_id=?`).run(...ids, userId);
    return rows.length;
  }
};

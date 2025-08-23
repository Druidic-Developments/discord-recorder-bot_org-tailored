PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS consents (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  consent INTEGER NOT NULL,
  policy_hash TEXT NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, guild_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  starter_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  policy_hash TEXT NOT NULL,
  start_ts DATETIME NOT NULL,
  end_ts DATETIME,
  alignment_mode TEXT NOT NULL,
  retention_days INTEGER
);

CREATE TABLE IF NOT EXISTS tracks (
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  path TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  first_offset_ms INTEGER NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT
);

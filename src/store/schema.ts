/** DDL applied on database open. Idempotent — safe to run on every startup. */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS rooms (
  id            TEXT PRIMARY KEY,
  task          TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'decision',
  facilitation  TEXT NOT NULL DEFAULT 'auto',
  status        TEXT NOT NULL DEFAULT 'open',
  round         INTEGER NOT NULL DEFAULT 0,
  summary       TEXT NOT NULL DEFAULT '',
  outcome       TEXT,
  doc           TEXT NOT NULL DEFAULT '',
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id      TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  token   TEXT NOT NULL UNIQUE,
  team    TEXT NOT NULL,
  role    TEXT NOT NULL,
  status  TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);
CREATE INDEX IF NOT EXISTS idx_participants_room ON participants(room_id);

CREATE TABLE IF NOT EXISTS messages (
  seq      INTEGER PRIMARY KEY AUTOINCREMENT,
  id       TEXT NOT NULL UNIQUE,
  room_id  TEXT NOT NULL,
  from_id  TEXT NOT NULL,
  ts       INTEGER NOT NULL,
  act      TEXT NOT NULL,
  payload  TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);
CREATE INDEX IF NOT EXISTS idx_messages_room_seq ON messages(room_id, seq);
`;

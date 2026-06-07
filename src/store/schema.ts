/** DDL applied on database open. Idempotent — safe to run on every startup. */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS rooms (
  id          TEXT PRIMARY KEY,
  task        TEXT NOT NULL,
  template_id TEXT NOT NULL,
  phase       TEXT NOT NULL,
  round       INTEGER NOT NULL DEFAULT 0,
  summary     TEXT NOT NULL DEFAULT '',
  outcome     TEXT,
  doc         TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL
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
  seq         INTEGER PRIMARY KEY AUTOINCREMENT,
  id          TEXT NOT NULL UNIQUE,
  room_id     TEXT NOT NULL,
  from_id     TEXT NOT NULL,
  ts          INTEGER NOT NULL,
  act         TEXT NOT NULL,
  payload     TEXT NOT NULL,
  ref_version INTEGER,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);
CREATE INDEX IF NOT EXISTS idx_messages_room_seq ON messages(room_id, seq);

CREATE TABLE IF NOT EXISTS contract_versions (
  room_id       TEXT NOT NULL,
  version       INTEGER NOT NULL,
  proposed_by   TEXT NOT NULL,
  body          TEXT NOT NULL,
  superseded_by INTEGER,
  PRIMARY KEY (room_id, version),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS signatures (
  room_id        TEXT NOT NULL,
  version        INTEGER NOT NULL,
  participant_id TEXT NOT NULL,
  PRIMARY KEY (room_id, version, participant_id)
);

CREATE TABLE IF NOT EXISTS verifications (
  room_id        TEXT NOT NULL,
  version        INTEGER NOT NULL,
  participant_id TEXT NOT NULL,
  PRIMARY KEY (room_id, version, participant_id)
);
`;

import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from './schema.js';

/**
 * Open (or create) the hub database at `path` and apply the schema.
 *
 * Pass `:memory:` for an ephemeral database (used by tests). File-backed databases
 * use WAL journaling so room state survives an unclean process exit.
 */
export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  if (path !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec(SCHEMA_SQL);
  // Lightweight, idempotent migrations so existing databases pick up new columns.
  ensureColumn(db, 'rooms', 'kind', "TEXT NOT NULL DEFAULT 'decision'");
  return db;
}

/** Add a column to a table if it is not already present. No-op on up-to-date schemas. */
function ensureColumn(db: DatabaseSync, table: string, column: string, decl: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as Array<{
    name: string;
  }>;
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
  }
}

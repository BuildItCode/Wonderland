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
  return db;
}

import type { DatabaseSync } from 'node:sqlite';
import type { Store } from '../domain/index.js';
import { SqliteRoomRepository } from './room-repository.js';
import { SqliteParticipantRepository } from './participant-repository.js';
import { SqliteMessageRepository } from './message-repository.js';

/** Assemble the full {@link Store} over an open database connection. */
export function createStore(db: DatabaseSync): Store {
  return {
    rooms: new SqliteRoomRepository(db),
    participants: new SqliteParticipantRepository(db),
    messages: new SqliteMessageRepository(db),
  };
}

export { openDatabase } from './db.js';

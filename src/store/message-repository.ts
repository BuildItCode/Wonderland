import type { DatabaseSync } from 'node:sqlite';
import {
  messageSchema,
  type Message,
  type MessageId,
  type MessageRepository,
  type ParticipantId,
  type RoomId,
} from '../domain/index.js';

interface MessageRow {
  seq: number;
  id: string;
  room_id: string;
  from_id: string;
  ts: number;
  act: string;
  payload: string;
}

function toMessage(row: MessageRow): Message {
  return messageSchema.parse({
    id: row.id,
    from: row.from_id,
    ts: row.ts,
    act: row.act,
    payload: JSON.parse(row.payload),
  });
}

/** SQLite-backed {@link MessageRepository}. */
export class SqliteMessageRepository implements MessageRepository {
  constructor(private readonly db: DatabaseSync) {}

  append(roomId: RoomId, message: Message): void {
    this.db
      .prepare(
        `INSERT INTO messages (id, room_id, from_id, ts, act, payload)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(message.id, roomId, message.from, message.ts, message.act, JSON.stringify(message.payload));
  }

  listSince(roomId: RoomId, sinceId?: MessageId): Message[] {
    if (sinceId !== undefined) {
      const cursor = this.db.prepare('SELECT seq FROM messages WHERE id = ?').get(sinceId) as
        | { seq: number }
        | undefined;
      const sinceSeq = cursor?.seq ?? 0;
      const rows = this.db
        .prepare('SELECT * FROM messages WHERE room_id = ? AND seq > ? ORDER BY seq')
        .all(roomId, sinceSeq) as unknown as MessageRow[];
      return rows.map(toMessage);
    }
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY seq')
      .all(roomId) as unknown as MessageRow[];
    return rows.map(toMessage);
  }

  listByParticipant(roomId: RoomId, participantId: ParticipantId): Message[] {
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE room_id = ? AND from_id = ? ORDER BY seq')
      .all(roomId, participantId) as unknown as MessageRow[];
    return rows.map(toMessage);
  }
}

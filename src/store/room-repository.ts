import type { DatabaseSync } from 'node:sqlite';
import {
  roomSchema,
  type Outcome,
  type Phase,
  type Room,
  type RoomId,
  type RoomRepository,
} from '../domain/index.js';

interface RoomRow {
  id: string;
  task: string;
  template_id: string;
  phase: string;
  round: number;
  summary: string;
  outcome: string | null;
  created_at: number;
}

/** SQLite-backed {@link RoomRepository}. */
export class SqliteRoomRepository implements RoomRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(room: Room): void {
    this.db
      .prepare(
        `INSERT INTO rooms (id, task, template_id, phase, round, summary, outcome, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        room.id,
        room.task,
        room.templateId,
        room.phase,
        room.round,
        room.summary,
        room.outcome,
        room.createdAt,
      );
  }

  get(roomId: RoomId): Room | null {
    const row = this.db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as
      | RoomRow
      | undefined;
    if (!row) {
      return null;
    }
    return roomSchema.parse({
      id: row.id,
      task: row.task,
      templateId: row.template_id,
      phase: row.phase,
      round: row.round,
      summary: row.summary,
      outcome: row.outcome,
      createdAt: row.created_at,
    });
  }

  setPhase(roomId: RoomId, phase: Phase): void {
    this.db.prepare('UPDATE rooms SET phase = ? WHERE id = ?').run(phase, roomId);
  }

  setSummary(roomId: RoomId, summary: string): void {
    this.db.prepare('UPDATE rooms SET summary = ? WHERE id = ?').run(summary, roomId);
  }

  setRound(roomId: RoomId, round: number): void {
    this.db.prepare('UPDATE rooms SET round = ? WHERE id = ?').run(round, roomId);
  }

  setOutcome(roomId: RoomId, outcome: Outcome): void {
    this.db.prepare('UPDATE rooms SET outcome = ? WHERE id = ?').run(outcome, roomId);
  }

  setDoc(roomId: RoomId, doc: string): void {
    this.db.prepare('UPDATE rooms SET doc = ? WHERE id = ?').run(doc, roomId);
  }

  getDoc(roomId: RoomId): string | null {
    const row = this.db.prepare('SELECT doc FROM rooms WHERE id = ?').get(roomId) as
      | { doc: string }
      | undefined;
    return row ? row.doc : null;
  }
}

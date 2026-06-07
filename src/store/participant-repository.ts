import type { DatabaseSync } from 'node:sqlite';
import {
  participantSchema,
  type LinkToken,
  type Participant,
  type ParticipantId,
  type ParticipantRepository,
  type Presence,
  type ResolvedParticipant,
  type RoomId,
} from '../domain/index.js';

interface ParticipantRow {
  id: string;
  room_id: string;
  token: string;
  team: string;
  role: string;
  status: string;
}

function toParticipant(row: ParticipantRow): Participant {
  return participantSchema.parse({
    id: row.id,
    team: row.team,
    role: row.role,
    status: row.status,
  });
}

/** SQLite-backed {@link ParticipantRepository}. */
export class SqliteParticipantRepository implements ParticipantRepository {
  constructor(private readonly db: DatabaseSync) {}

  add(roomId: RoomId, participant: Participant, token: LinkToken): void {
    this.db
      .prepare(
        `INSERT INTO participants (id, room_id, token, team, role, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(participant.id, roomId, token, participant.team, participant.role, participant.status);
  }

  getByToken(token: LinkToken): ResolvedParticipant | null {
    const row = this.db.prepare('SELECT * FROM participants WHERE token = ?').get(token) as
      | ParticipantRow
      | undefined;
    if (!row) {
      return null;
    }
    return { ...toParticipant(row), roomId: row.room_id };
  }

  getById(roomId: RoomId, participantId: ParticipantId): Participant | null {
    const row = this.db
      .prepare('SELECT * FROM participants WHERE room_id = ? AND id = ?')
      .get(roomId, participantId) as ParticipantRow | undefined;
    return row ? toParticipant(row) : null;
  }

  listByRoom(roomId: RoomId): Participant[] {
    const rows = this.db
      .prepare('SELECT * FROM participants WHERE room_id = ? ORDER BY role, id')
      .all(roomId) as unknown as ParticipantRow[];
    return rows.map(toParticipant);
  }

  setStatus(roomId: RoomId, participantId: ParticipantId, status: Presence): void {
    this.db
      .prepare('UPDATE participants SET status = ? WHERE room_id = ? AND id = ?')
      .run(status, roomId, participantId);
  }
}

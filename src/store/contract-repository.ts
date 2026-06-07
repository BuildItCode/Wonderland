import type { DatabaseSync } from 'node:sqlite';
import {
  contractVersionSchema,
  type ContractRepository,
  type ContractVersion,
  type ParticipantId,
  type RoomId,
} from '../domain/index.js';

interface ContractRow {
  room_id: string;
  version: number;
  proposed_by: string;
  body: string;
  superseded_by: number | null;
}

interface SignatureRow {
  participant_id: string;
}

/** SQLite-backed {@link ContractRepository}. */
export class SqliteContractRepository implements ContractRepository {
  constructor(private readonly db: DatabaseSync) {}

  addVersion(roomId: RoomId, version: ContractVersion): void {
    this.db
      .prepare(
        `INSERT INTO contract_versions (room_id, version, proposed_by, body, superseded_by)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        roomId,
        version.version,
        version.proposedBy,
        JSON.stringify(version.body),
        version.supersededBy ?? null,
      );
    for (const signatory of version.signatures) {
      this.addSignature(roomId, version.version, signatory);
    }
  }

  getVersion(roomId: RoomId, version: number): ContractVersion | null {
    const row = this.db
      .prepare('SELECT * FROM contract_versions WHERE room_id = ? AND version = ?')
      .get(roomId, version) as ContractRow | undefined;
    return row ? this.toContractVersion(row) : null;
  }

  getLatest(roomId: RoomId): ContractVersion | null {
    const row = this.db
      .prepare('SELECT * FROM contract_versions WHERE room_id = ? ORDER BY version DESC LIMIT 1')
      .get(roomId) as ContractRow | undefined;
    return row ? this.toContractVersion(row) : null;
  }

  addSignature(roomId: RoomId, version: number, participantId: ParticipantId): void {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO signatures (room_id, version, participant_id) VALUES (?, ?, ?)',
      )
      .run(roomId, version, participantId);
  }

  markSuperseded(roomId: RoomId, version: number, supersededBy: number): void {
    this.db
      .prepare('UPDATE contract_versions SET superseded_by = ? WHERE room_id = ? AND version = ?')
      .run(supersededBy, roomId, version);
  }

  latestSignedVersion(roomId: RoomId, participantId: ParticipantId): number | null {
    const row = this.db
      .prepare(
        'SELECT MAX(version) AS v FROM signatures WHERE room_id = ? AND participant_id = ?',
      )
      .get(roomId, participantId) as { v: number | null } | undefined;
    return row?.v ?? null;
  }

  addVerification(roomId: RoomId, version: number, participantId: ParticipantId): void {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO verifications (room_id, version, participant_id) VALUES (?, ?, ?)',
      )
      .run(roomId, version, participantId);
  }

  verifiedBy(roomId: RoomId, version: number): ParticipantId[] {
    const rows = this.db
      .prepare(
        'SELECT participant_id FROM verifications WHERE room_id = ? AND version = ? ORDER BY participant_id',
      )
      .all(roomId, version) as unknown as SignatureRow[];
    return rows.map((row) => row.participant_id);
  }

  private signaturesFor(roomId: RoomId, version: number): ParticipantId[] {
    const rows = this.db
      .prepare(
        'SELECT participant_id FROM signatures WHERE room_id = ? AND version = ? ORDER BY participant_id',
      )
      .all(roomId, version) as unknown as SignatureRow[];
    return rows.map((row) => row.participant_id);
  }

  private toContractVersion(row: ContractRow): ContractVersion {
    return contractVersionSchema.parse({
      version: row.version,
      proposedBy: row.proposed_by,
      body: JSON.parse(row.body),
      signatures: this.signaturesFor(row.room_id, row.version),
      supersededBy: row.superseded_by ?? undefined,
    });
  }
}

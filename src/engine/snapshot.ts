import type { RoomSnapshot, TemplateMeta } from '../domain/index.js';
import { toTemplateMeta } from '../templates/index.js';
import type { EngineDeps } from './deps.js';
import { requireParticipant, requireRoom } from './guards.js';

/** List available templates as public metadata. */
export function listTemplates(deps: EngineDeps): TemplateMeta[] {
  return deps.templates.list().map(toTemplateMeta);
}

/** Compose a read-only snapshot of room state (does not require an open room). */
export function roomSnapshot(deps: EngineDeps, token: string): RoomSnapshot {
  const me = requireParticipant(deps.store, token);
  const room = requireRoom(deps.store, me.roomId);
  const participants = deps.store.participants.listByRoom(room.id).map((participant) => ({
    id: participant.id,
    team: participant.team,
    role: participant.role,
    status: participant.status,
  }));
  const latest = deps.store.contracts.getLatest(room.id);
  const contract = latest
    ? {
        version: latest.version,
        proposedBy: latest.proposedBy,
        signatures: latest.signatures,
        verifiedBy: deps.store.contracts.verifiedBy(room.id, latest.version),
      }
    : null;
  return {
    roomId: room.id,
    task: room.task,
    phase: room.phase,
    round: room.round,
    summary: room.summary,
    outcome: room.outcome,
    participants,
    contract,
  };
}

import type { ProposalView, RoomSnapshot } from '../domain/index.js';
import type { EngineDeps } from './deps.js';
import { requireParticipant, requireRoom } from './guards.js';
import { pendingParticipants, stances } from './consensus.js';

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
  const { proposal, byParticipant } = stances(deps, room);
  const proposalView: ProposalView | null = proposal
    ? {
        version: proposal.version,
        by: proposal.by,
        title: proposal.title,
        text: proposal.text,
        agreed: [...byParticipant].filter(([, s]) => s === 'agree').map(([id]) => id),
        blocked: [...byParticipant].filter(([, s]) => s === 'block').map(([id]) => id),
      }
    : null;
  return {
    roomId: room.id,
    task: room.task,
    facilitation: room.facilitation,
    status: room.status,
    round: room.round,
    summary: room.summary,
    outcome: room.outcome,
    participants,
    proposal: proposalView,
    pending: pendingParticipants(deps, room),
  };
}

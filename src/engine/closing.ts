import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  type DeclareResult,
  type Outcome,
  type Room,
} from '../domain/index.js';
import type { EngineDeps } from './deps.js';
import { requireParticipant, requireRoom } from './guards.js';
import { allAgreed, pendingParticipants, stances } from './consensus.js';
import { buildDoc } from './doc.js';

/** Replace the living room summary (facilitator only). */
export function updateSummary(deps: EngineDeps, token: string, summary: string): void {
  const me = requireParticipant(deps.store, token);
  if (me.role !== 'facilitator') {
    throw new ForbiddenError('Only the facilitator can update the summary.');
  }
  const room = requireRoom(deps.store, me.roomId);
  if (room.status === 'closed') {
    throw new ConflictError('Room is closed.');
  }
  deps.store.rooms.setSummary(room.id, summary);
}

/**
 * Close the room with an outcome, persist and return the finalized document.
 *
 * - **decision** room: facilitator only; a `resolved` outcome requires every participant to
 *   have agreed to the current proposal (`unsolvable` may be declared at any time).
 * - **discussion** room: stays open through agreement, so *any* participant may close it at
 *   any time with any outcome.
 *
 * Closing invalidates the role-links for further action (join/post reject a closed room).
 */
export function declare(deps: EngineDeps, token: string, outcome: Outcome): DeclareResult {
  const me = requireParticipant(deps.store, token);
  const room = requireRoom(deps.store, me.roomId);
  if (room.status === 'closed') {
    throw new ConflictError('Room is already closed.');
  }
  if (room.kind === 'decision') {
    if (me.role !== 'facilitator') {
      throw new ForbiddenError('Only the facilitator can declare an outcome in a decision room.');
    }
    if (outcome === 'resolved' && !allAgreed(deps, room)) {
      const detail = stances(deps, room).proposal
        ? `pending: ${pendingParticipants(deps, room).join(', ')}`
        : 'no proposal has been put forward yet';
      throw new ConflictError(`Cannot resolve — ${detail}.`);
    }
  }
  return close(deps, room, outcome);
}

/** Finalize the doc and close the room. Shared by `declare` and the auto-facilitator. */
export function close(deps: EngineDeps, room: Room, outcome: Outcome): DeclareResult {
  const doc = buildDoc(deps, room, outcome);
  deps.store.rooms.setDoc(room.id, doc);
  deps.store.rooms.setOutcome(room.id, outcome);
  deps.store.rooms.setStatus(room.id, 'closed');
  return { doc };
}

/** Read the finalized document (any participant; survives close). */
export function readDoc(deps: EngineDeps, token: string): { doc: string } {
  const me = requireParticipant(deps.store, token);
  const doc = deps.store.rooms.getDoc(me.roomId);
  if (!doc) {
    throw new NotFoundError('No document available yet.');
  }
  return { doc };
}

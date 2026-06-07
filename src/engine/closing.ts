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
import { unsignedContractors, unverifiedContractors } from './consensus.js';
import { buildDoc } from './doc.js';

/** Replace the living room summary (facilitator only). */
export function updateSummary(deps: EngineDeps, token: string, summary: string): void {
  const me = requireParticipant(deps.store, token);
  if (me.role !== 'facilitator') {
    throw new ForbiddenError('Only the facilitator can update the summary.');
  }
  const room = requireRoom(deps.store, me.roomId);
  if (room.phase === 'closed') {
    throw new ConflictError('Room is closed.');
  }
  deps.store.rooms.setSummary(room.id, summary);
}

/**
 * Close the room with an outcome, persist and return the finalized document.
 *
 * Ratified/verified outcomes require unanimous signatures on the latest contract.
 * Closing sets the phase to `closed`, which invalidates the role-links for any
 * further action (join/post/advance all reject a closed room).
 */
export function declare(deps: EngineDeps, token: string, outcome: Outcome): DeclareResult {
  const me = requireParticipant(deps.store, token);
  if (me.role !== 'facilitator') {
    throw new ForbiddenError('Only the facilitator can declare an outcome.');
  }
  const room = requireRoom(deps.store, me.roomId);
  if (room.phase === 'closed') {
    throw new ConflictError('Room is already closed.');
  }
  if (outcome === 'ratified' || outcome === 'verified') {
    assertConsensus(deps, room, outcome);
  }
  if (outcome === 'verified') {
    assertVerified(deps, room);
  }
  const doc = buildDoc(deps, room, outcome);
  deps.store.rooms.setDoc(room.id, doc);
  deps.store.rooms.setOutcome(room.id, outcome);
  deps.store.rooms.setPhase(room.id, 'closed');
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

function assertConsensus(deps: EngineDeps, room: Room, outcome: Outcome): void {
  const contract = deps.store.contracts.getLatest(room.id);
  if (!contract) {
    throw new ConflictError(`Cannot ${outcome} without an agreed contract.`);
  }
  const missing = unsignedContractors(deps, room);
  if (missing.length > 0) {
    throw new ConflictError(`Cannot ${outcome}: missing signatures from ${missing.join(', ')}.`);
  }
}

function assertVerified(deps: EngineDeps, room: Room): void {
  const contract = deps.store.contracts.getLatest(room.id);
  if (!contract?.body.verification) {
    throw new ConflictError('Cannot verify: no agreed test artifact.');
  }
  const missing = unverifiedContractors(deps, room);
  if (missing.length > 0) {
    throw new ConflictError(`Cannot verify: missing pass from ${missing.join(', ')}.`);
  }
}

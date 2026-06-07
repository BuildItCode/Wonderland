import type { ParticipantId, Room } from '../domain/index.js';
import type { EngineDeps } from './deps.js';

/** Ids of the contractors in a room. */
export function contractorIds(deps: EngineDeps, room: Room): ParticipantId[] {
  return deps.store.participants
    .listByRoom(room.id)
    .filter((participant) => participant.role === 'contractor')
    .map((participant) => participant.id);
}

/**
 * Contractors who have not signed the latest contract version.
 *
 * If no contract version exists yet, consensus is vacuously satisfied (empty list),
 * so a room can still advance out of the framing phase before any proposal.
 */
export function unsignedContractors(deps: EngineDeps, room: Room): ParticipantId[] {
  const latest = deps.store.contracts.getLatest(room.id);
  if (!latest) {
    return [];
  }
  const signed = new Set(latest.signatures);
  return contractorIds(deps, room).filter((id) => !signed.has(id));
}

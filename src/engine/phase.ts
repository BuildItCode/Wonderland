import { ConflictError, ForbiddenError, type AdvanceResult } from '../domain/index.js';
import type { EngineDeps } from './deps.js';
import { requireParticipant, requireRoom, requireTemplate } from './guards.js';
import { unsignedContractors, unverifiedContractors } from './consensus.js';

/**
 * Advance the room to the next phase (facilitator only).
 *
 * The consensus gate is mechanical: if a contract version exists, every contractor
 * must have signed the latest version, otherwise the advance is blocked and the
 * unsigned contractors are returned.
 */
export function advancePhase(deps: EngineDeps, token: string): AdvanceResult {
  const me = requireParticipant(deps.store, token);
  if (me.role !== 'facilitator') {
    throw new ForbiddenError('Only the facilitator can advance the phase.');
  }
  const room = requireRoom(deps.store, me.roomId);
  if (room.phase === 'closed') {
    throw new ConflictError('Room is closed.');
  }
  const template = requireTemplate(deps.templates, room.templateId);
  const nextPhase = template.phases[template.phases.indexOf(room.phase) + 1];
  if (nextPhase === undefined) {
    throw new ConflictError(`Already at the final phase '${room.phase}'.`);
  }
  const missing = unsignedContractors(deps, room);
  if (missing.length > 0) {
    return { blocked: 'consensus', missing };
  }
  if (room.phase === 'propose' && template.exit === 'verified-solution') {
    const latest = deps.store.contracts.getLatest(room.id);
    if (!latest?.body.verification) {
      throw new ConflictError(
        'A verified-solution contract must agree a test artifact before implementing.',
      );
    }
  }
  if (room.phase === 'verify') {
    const unverified = unverifiedContractors(deps, room);
    if (unverified.length > 0) {
      return { blocked: 'verification', missing: unverified };
    }
  }
  deps.store.rooms.setPhase(room.id, nextPhase);
  return { phase: nextPhase };
}

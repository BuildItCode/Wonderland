import { ConflictError, ForbiddenError, type VerifyResult } from '../domain/index.js';
import type { EngineDeps } from './deps.js';
import { requireParticipant, requireRoom } from './guards.js';
import { unverifiedContractors } from './consensus.js';
import { appendNote } from './notes.js';

/**
 * Submit a verification result for a contract version (contractor only, verify phase).
 *
 * A pass is recorded against the version; a fail is noted in the transcript so the
 * facilitator can decide to regress. Returns the contractors still outstanding.
 */
export function submitVerification(
  deps: EngineDeps,
  token: string,
  version: number,
  passed: boolean,
): VerifyResult {
  const me = requireParticipant(deps.store, token);
  if (me.role !== 'contractor') {
    throw new ForbiddenError('Only contractors submit verification.');
  }
  const room = requireRoom(deps.store, me.roomId);
  if (room.phase !== 'verify') {
    throw new ConflictError('Verification is only accepted in the verify phase.');
  }
  const latest = deps.store.contracts.getLatest(room.id);
  if (!latest || latest.version !== version) {
    throw new ConflictError(`Version ${version} is not the current contract.`);
  }
  if (!latest.body.verification) {
    throw new ConflictError('No agreed test artifact to verify against.');
  }
  if (passed) {
    deps.store.contracts.addVerification(room.id, version, me.id);
  } else {
    appendNote(deps, room, me.id, `Verification failed for v${version}.`);
  }
  return { remaining: unverifiedContractors(deps, room) };
}

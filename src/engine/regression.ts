import {
  ConflictError,
  ForbiddenError,
  type Phase,
  type RegressResult,
  type Room,
} from '../domain/index.js';
import type { EngineDeps } from './deps.js';
import { requireParticipant, requireRoom, requireTemplate } from './guards.js';
import { buildDoc } from './doc.js';
import { appendNote } from './notes.js';

/**
 * Core regression: bump the round counter, then either re-open negotiation with a
 * fresh re-signable contract version, or — if the round cap is exceeded — close the
 * room as unsolvable.
 */
export function regressRoom(
  deps: EngineDeps,
  room: Room,
  byId: string,
  toPhase: Phase,
): RegressResult {
  const template = requireTemplate(deps.templates, room.templateId);
  const round = room.round + 1;
  deps.store.rooms.setRound(room.id, round);
  if (round > template.roundCap) {
    deps.store.rooms.setDoc(room.id, buildDoc(deps, room, 'unsolvable'));
    deps.store.rooms.setOutcome(room.id, 'unsolvable');
    deps.store.rooms.setPhase(room.id, 'closed');
    return { outcome: 'unsolvable' };
  }
  mintResignableVersion(deps, room, byId);
  deps.store.rooms.setPhase(room.id, toPhase);
  return { phase: toPhase };
}

/**
 * Regress to an earlier phase explicitly (facilitator only). Records the reason in
 * the transcript so the decision is auditable.
 */
export function regressPhase(
  deps: EngineDeps,
  token: string,
  to: Phase,
  reason: string,
): RegressResult {
  const me = requireParticipant(deps.store, token);
  if (me.role !== 'facilitator') {
    throw new ForbiddenError('Only the facilitator can regress the phase.');
  }
  const room = requireRoom(deps.store, me.roomId);
  if (room.phase === 'closed') {
    throw new ConflictError('Room is closed.');
  }
  const template = requireTemplate(deps.templates, room.templateId);
  const currentIndex = template.phases.indexOf(room.phase);
  const targetIndex = template.phases.indexOf(to);
  if (targetIndex < 0 || targetIndex >= currentIndex) {
    throw new ConflictError(`Cannot regress to '${to}' from '${room.phase}'.`);
  }
  appendNote(deps, room, me.id, `Regression to ${to}: ${reason}`);
  return regressRoom(deps, room, me.id, to);
}

/**
 * If a fatal failure lands in a phase past `propose`, automatically re-open
 * negotiation (or fail the room when the round cap is exhausted).
 */
export function maybeRegressOnFailure(deps: EngineDeps, room: Room, fromId: string): void {
  const template = requireTemplate(deps.templates, room.templateId);
  const proposeIndex = template.phases.indexOf('propose');
  const currentIndex = template.phases.indexOf(room.phase);
  if (proposeIndex >= 0 && currentIndex > proposeIndex) {
    regressRoom(deps, room, fromId, 'propose');
  }
}

function mintResignableVersion(deps: EngineDeps, room: Room, byId: string): void {
  const latest = deps.store.contracts.getLatest(room.id);
  if (!latest) {
    return;
  }
  const next = latest.version + 1;
  deps.store.contracts.addVersion(room.id, {
    version: next,
    proposedBy: byId,
    body: latest.body,
    signatures: [],
  });
  deps.store.contracts.markSuperseded(room.id, latest.version, next);
}

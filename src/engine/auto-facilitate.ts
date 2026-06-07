import type { Room, Template } from '../domain/index.js';
import type { EngineDeps } from './deps.js';
import { contractorIds, unsignedContractors, unverifiedContractors } from './consensus.js';
import { appendNote } from './notes.js';
import { buildDoc } from './doc.js';

const PHASE_HINTS: Record<string, string> = {
  propose:
    'Propose phase — put a contract forward (propose) and sign it (accept). The room advances automatically once every contractor has signed.',
  implement:
    'Implement phase — build your side, report results (inform / kind "result"), then set_status "done".',
  verify: 'Verify phase — run the agreed test and call submit_verification.',
  ratify: 'Ratify phase — agreement reached; closing.',
};

/**
 * Rule-based chair (no LLM). Invoked after joins/posts/status/verification; advances
 * the phase, posts the next-phase prompt, maintains a state-digest summary, and
 * auto-declares the outcome — all from the same consensus rules the gate already uses.
 */
export function runAutoFacilitation(deps: EngineDeps, roomId: string): void {
  const template = templateFor(deps, roomId);
  if (!template?.autoFacilitate) {
    return;
  }
  for (let guard = 0; guard < 12; guard += 1) {
    const room = deps.store.rooms.get(roomId);
    if (!room || room.phase === 'closed') {
      break;
    }
    if (room.phase === 'ratify') {
      closeIfReady(deps, room, template);
      break;
    }
    const next = template.phases[template.phases.indexOf(room.phase) + 1];
    if (next === undefined || !canAdvance(deps, room, template)) {
      break;
    }
    deps.store.rooms.setPhase(roomId, next);
    appendNote(deps, room, 'system', PHASE_HINTS[next] ?? `Phase: ${next}.`);
    writeSummary(deps, roomId, template);
  }
  writeSummary(deps, roomId, template);
}

function canAdvance(deps: EngineDeps, room: Room, template: Template): boolean {
  switch (room.phase) {
    case 'frame':
      return contractorsAll(deps, room, (status) => status !== 'invited' && status !== 'preparing');
    case 'propose': {
      const latest = deps.store.contracts.getLatest(room.id);
      if (!latest) {
        return false;
      }
      return unsignedContractors(deps, room).length === 0 && hasArtifact(latest.body, template);
    }
    case 'implement':
      return contractorsAll(deps, room, (status) => status === 'done');
    case 'verify':
      return unverifiedContractors(deps, room).length === 0;
    default:
      return false;
  }
}

function closeIfReady(deps: EngineDeps, room: Room, template: Template): void {
  if (!deps.store.contracts.getLatest(room.id)) {
    return;
  }
  if (unsignedContractors(deps, room).length > 0) {
    return;
  }
  if (template.exit === 'verified-solution' && unverifiedContractors(deps, room).length > 0) {
    return;
  }
  const outcome = template.exit === 'verified-solution' ? 'verified' : 'ratified';
  deps.store.rooms.setDoc(room.id, buildDoc(deps, room, outcome));
  deps.store.rooms.setOutcome(room.id, outcome);
  deps.store.rooms.setPhase(room.id, 'closed');
  appendNote(deps, room, 'system', `Room closed automatically: ${outcome}.`);
}

function hasArtifact(body: { verification?: string }, template: Template): boolean {
  return template.exit !== 'verified-solution' || Boolean(body.verification);
}

function contractorsAll(
  deps: EngineDeps,
  room: Room,
  predicate: (status: string) => boolean,
): boolean {
  const contractors = deps.store.participants
    .listByRoom(room.id)
    .filter((participant) => participant.role === 'contractor');
  return contractors.length > 0 && contractors.every((participant) => predicate(participant.status));
}

function writeSummary(deps: EngineDeps, roomId: string, _template: Template): void {
  const room = deps.store.rooms.get(roomId);
  if (!room) {
    return;
  }
  const latest = deps.store.contracts.getLatest(roomId);
  const total = contractorIds(deps, room).length;
  let summary = `Phase: ${room.phase}.`;
  summary += latest
    ? ` Contract v${latest.version} "${latest.body.title}" — signed ${latest.signatures.length}/${total}.`
    : ' No contract yet.';
  deps.store.rooms.setSummary(roomId, summary);
}

function templateFor(deps: EngineDeps, roomId: string): Template | undefined {
  const room = deps.store.rooms.get(roomId);
  return room ? deps.templates.get(room.templateId) : undefined;
}

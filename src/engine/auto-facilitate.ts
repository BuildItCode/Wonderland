import type { Room } from '../domain/index.js';
import type { EngineDeps } from './deps.js';
import { contractorIds, unsignedContractors } from './consensus.js';
import { appendNote } from './notes.js';
import { buildDoc } from './doc.js';

const PHASE_HINTS: Record<string, string> = {
  propose:
    'Propose phase — put a contract forward (propose) and sign it (accept). The room advances automatically once every contractor has signed.',
  implement:
    'Implement phase — build your side, report results (inform / kind "result"), then set_status "done".',
  ratify: 'Ratify phase — agreement reached; closing.',
};

/**
 * Rule-based chair (no LLM). Invoked after joins/posts/status; advances the phase,
 * posts the next-phase prompt, maintains a state-digest summary, and auto-declares —
 * all from the same consensus rules the gate already uses.
 */
export function runAutoFacilitation(deps: EngineDeps, roomId: string): void {
  const seed = deps.store.rooms.get(roomId);
  const template = seed ? deps.templates.get(seed.templateId) : undefined;
  if (!template?.autoFacilitate) {
    return;
  }
  for (let guard = 0; guard < 12; guard += 1) {
    const room = deps.store.rooms.get(roomId);
    if (!room || room.phase === 'closed') {
      break;
    }
    if (room.phase === 'ratify') {
      closeIfReady(deps, room);
      break;
    }
    const next = template.phases[template.phases.indexOf(room.phase) + 1];
    if (next === undefined || !canAdvance(deps, room)) {
      break;
    }
    deps.store.rooms.setPhase(roomId, next);
    appendNote(deps, room, 'system', PHASE_HINTS[next] ?? `Phase: ${next}.`);
    writeSummary(deps, roomId);
  }
  writeSummary(deps, roomId);
}

function canAdvance(deps: EngineDeps, room: Room): boolean {
  switch (room.phase) {
    case 'frame':
      return contractorsAll(deps, room, (status) => status !== 'invited' && status !== 'preparing');
    case 'propose': {
      const latest = deps.store.contracts.getLatest(room.id);
      return latest !== null && unsignedContractors(deps, room).length === 0;
    }
    case 'implement':
      return contractorsAll(deps, room, (status) => status === 'done');
    default:
      return false;
  }
}

function closeIfReady(deps: EngineDeps, room: Room): void {
  if (!deps.store.contracts.getLatest(room.id) || unsignedContractors(deps, room).length > 0) {
    return;
  }
  deps.store.rooms.setDoc(room.id, buildDoc(deps, room, 'ratified'));
  deps.store.rooms.setOutcome(room.id, 'ratified');
  deps.store.rooms.setPhase(room.id, 'closed');
  appendNote(deps, room, 'system', 'Room closed automatically: ratified.');
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

function writeSummary(deps: EngineDeps, roomId: string): void {
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

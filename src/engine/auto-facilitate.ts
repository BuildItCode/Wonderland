import type { EngineDeps } from './deps.js';
import { allAgreed, participantIds, stances } from './consensus.js';
import { appendNote } from './notes.js';
import { close } from './closing.js';

/** Max proposals an auto room will entertain before declaring the task unsolvable. */
const ROUND_CAP = 8;

/**
 * Rule-based chair (no LLM). Invoked after joins/posts. In an auto room it closes the
 * room the instant every participant agrees (resolved) or the proposal cap is exceeded
 * (unsolvable), and otherwise keeps a state-digest summary. Agent rooms are left alone.
 */
export function runAutoFacilitation(deps: EngineDeps, roomId: string): void {
  const room = deps.store.rooms.get(roomId);
  if (!room || room.facilitation !== 'auto' || room.status === 'closed') {
    return;
  }
  if (allAgreed(deps, room)) {
    close(deps, room, 'resolved');
    appendNote(deps, room, 'system', 'Room closed automatically: resolved — all participants agreed.');
    return;
  }
  if (room.round > ROUND_CAP) {
    close(deps, room, 'unsolvable');
    appendNote(
      deps,
      room,
      'system',
      `Room closed automatically: unsolvable — no agreement reached after ${room.round} proposals.`,
    );
    return;
  }
  writeSummary(deps, roomId);
}

function writeSummary(deps: EngineDeps, roomId: string): void {
  const room = deps.store.rooms.get(roomId);
  if (!room) {
    return;
  }
  const { proposal, byParticipant } = stances(deps, room);
  if (!proposal) {
    deps.store.rooms.setSummary(roomId, 'No proposal yet — waiting for someone to propose a solution.');
    return;
  }
  const ids = participantIds(deps, room);
  const agreed = ids.filter((id) => byParticipant.get(id) === 'agree').length;
  const label = proposal.title ?? truncate(proposal.text, 60);
  const proposer = deps.store.participants.listByRoom(roomId).find((p) => p.id === proposal.by);
  deps.store.rooms.setSummary(
    roomId,
    `Proposal v${proposal.version} by ${proposer?.team ?? proposal.by}: "${label}" — agreed ${agreed}/${ids.length}.`,
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

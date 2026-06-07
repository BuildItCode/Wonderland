import type { ParticipantId, Room, Stance } from '../domain/index.js';
import type { EngineDeps } from './deps.js';

/** The current proposal: the latest `propose` in the transcript. */
export interface Proposal {
  version: number;
  by: ParticipantId;
  title?: string;
  text: string;
}

/** The current proposal plus each participant's stance on it. */
export interface Stances {
  proposal: Proposal | null;
  byParticipant: Map<ParticipantId, 'agree' | 'block'>;
}

/** Ids of the working participants (role `participant`) — those whose agreement is required. */
export function participantIds(deps: EngineDeps, room: Room): ParticipantId[] {
  return deps.store.participants
    .listByRoom(room.id)
    .filter((p) => p.role === 'participant')
    .map((p) => p.id);
}

/**
 * Resolve the current proposal and the stance of each participant on it.
 *
 * The proposal is the last `propose` message; a stance is the participant's last
 * `agree`/`block` *after* that proposal. Putting a proposal forward counts as the
 * proposer's own agreement (overridable by a later `block`). A new proposal resets
 * everyone else's stance.
 */
export function stances(deps: EngineDeps, room: Room): Stances {
  const messages = deps.store.messages.listSince(room.id);
  let proposal: Proposal | null = null;
  let proposalIndex = -1;
  let version = 0;
  let index = -1;
  for (const m of messages) {
    index += 1;
    if (m.act === 'propose') {
      version += 1;
      proposalIndex = index;
      proposal = { version, by: m.from, title: m.payload.title, text: m.payload.text };
    }
  }
  const byParticipant = new Map<ParticipantId, 'agree' | 'block'>();
  if (proposal) {
    // proposing your solution endorses it; a later block from the proposer overrides this
    byParticipant.set(proposal.by, 'agree');
  }
  const after = proposalIndex >= 0 ? messages.slice(proposalIndex + 1) : [];
  for (const m of after) {
    if (m.act === 'agree') {
      byParticipant.set(m.from, 'agree');
    } else if (m.act === 'block') {
      byParticipant.set(m.from, 'block');
    }
  }
  return { proposal, byParticipant };
}

/** Working participants who have not agreed to the current proposal (all of them if none exists). */
export function pendingParticipants(deps: EngineDeps, room: Room): ParticipantId[] {
  const { proposal, byParticipant } = stances(deps, room);
  const ids = participantIds(deps, room);
  if (!proposal) {
    return ids;
  }
  return ids.filter((id) => byParticipant.get(id) !== 'agree');
}

/** True when a proposal exists and every working participant has agreed to it. */
export function allAgreed(deps: EngineDeps, room: Room): boolean {
  const { proposal, byParticipant } = stances(deps, room);
  if (!proposal) {
    return false;
  }
  const ids = participantIds(deps, room);
  return ids.length > 0 && ids.every((id) => byParticipant.get(id) === 'agree');
}

/** A single participant's stance on the current proposal. */
export function stanceOf(deps: EngineDeps, room: Room, participantId: ParticipantId): Stance {
  const { proposal, byParticipant } = stances(deps, room);
  if (!proposal) {
    return 'none';
  }
  return byParticipant.get(participantId) ?? 'none';
}

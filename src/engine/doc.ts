import type { Outcome, ParticipantId, Room } from '../domain/index.js';
import type { EngineDeps } from './deps.js';
import { participantIds, stances } from './consensus.js';

/** Build the finalized document for a closing room. */
export function buildDoc(deps: EngineDeps, room: Room, outcome: Outcome): string {
  return outcome === 'unsolvable' ? buildFailureDoc(deps, room) : buildSuccessDoc(deps, room);
}

function buildSuccessDoc(deps: EngineDeps, room: Room): string {
  const lines: string[] = [`# ${room.task} — resolved`, '', '## Summary'];
  lines.push(room.summary.trim() || '_No summary recorded._');

  const { proposal } = stances(deps, room);
  lines.push('', '## Agreed Solution');
  if (proposal) {
    if (proposal.title) {
      lines.push(`**${proposal.title}**`, '');
    }
    lines.push(proposal.text);
  } else {
    lines.push('_No proposal on record._');
  }

  lines.push('', '## Sign-off');
  for (const id of participantIds(deps, room)) {
    lines.push(`- **${teamOf(deps, room, id)}**: agreed`);
  }
  return lines.join('\n');
}

function buildFailureDoc(deps: EngineDeps, room: Room): string {
  const lines: string[] = [`# ${room.task} — unsolvable`, '', '## Summary'];
  lines.push(room.summary.trim() || '_No summary recorded._');

  const { proposal } = stances(deps, room);
  lines.push('', '## Last Proposal');
  if (proposal) {
    lines.push(proposal.title ? `**${proposal.title}**\n\n${proposal.text}` : proposal.text);
  } else {
    lines.push('_No proposal was put forward._');
  }

  lines.push('', '## Blocking Issues');
  const blocks = blockReasons(deps, room);
  if (blocks.length > 0) {
    for (const block of blocks) {
      lines.push(`- **${teamOf(deps, room, block.from)}**: ${block.reason}`);
    }
  } else {
    lines.push('- (none recorded in the transcript)');
  }

  lines.push(
    '',
    '## Recommended Human Action',
    '- Review the blocking issues above.',
    '- Decide whether to revise the proposal, relax a constraint, or escalate to the teams directly.',
  );
  return lines.join('\n');
}

function teamOf(deps: EngineDeps, room: Room, id: ParticipantId): string {
  return deps.store.participants.listByRoom(room.id).find((p) => p.id === id)?.team ?? id;
}

function blockReasons(deps: EngineDeps, room: Room): Array<{ from: ParticipantId; reason: string }> {
  const reasons: Array<{ from: ParticipantId; reason: string }> = [];
  for (const message of deps.store.messages.listSince(room.id)) {
    if (message.act === 'block') {
      reasons.push({ from: message.from, reason: message.payload.reason });
    }
  }
  return reasons;
}

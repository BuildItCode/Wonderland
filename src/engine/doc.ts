import type { Outcome, Room } from '../domain/index.js';
import type { EngineDeps } from './deps.js';

/** Build the finalized document for a closing room. */
export function buildDoc(deps: EngineDeps, room: Room, outcome: Outcome): string {
  return outcome === 'unsolvable'
    ? buildFailureDoc(deps, room)
    : buildSuccessDoc(deps, room, outcome);
}

function buildSuccessDoc(deps: EngineDeps, room: Room, outcome: Outcome): string {
  const lines: string[] = [`# ${room.task} — ${outcome}`, '', '## Summary'];
  lines.push(room.summary.trim() || '_No summary recorded._');

  const contract = deps.store.contracts.getLatest(room.id);
  if (contract) {
    lines.push('', `## Agreed Contract (v${contract.version})`, `**${contract.body.title}**`, '');
    lines.push('Interface:', contract.body.interface);
    if (contract.body.terms.length > 0) {
      lines.push('', 'Terms:');
      for (const term of contract.body.terms) {
        lines.push(`- **${term.key}**: ${term.detail}`);
      }
    }
  }

  lines.push('', '## Task Split');
  for (const contractor of contractorTeams(deps, room)) {
    lines.push(`- **${contractor}**: implement and integrate your side of the agreed contract.`);
  }
  return lines.join('\n');
}

function buildFailureDoc(deps: EngineDeps, room: Room): string {
  const lines: string[] = [`# ${room.task} — unsolvable`, '', '## Summary'];
  lines.push(room.summary.trim() || '_No summary recorded._');

  lines.push('', '## Decisions Reached');
  const contract = deps.store.contracts.getLatest(room.id);
  if (contract) {
    const total = contractorTeams(deps, room).length;
    lines.push(
      `Last contract under negotiation: v${contract.version} "${contract.body.title}" — signed by ${contract.signatures.length}/${total} contractors.`,
    );
  } else {
    lines.push('No contract was agreed.');
  }

  lines.push('', '## Blocking Issues');
  const reasons = blockingReasons(deps, room);
  if (reasons.length > 0) {
    for (const reason of reasons) {
      lines.push(`- ${reason}`);
    }
  } else {
    lines.push('- (none recorded in the transcript)');
  }

  lines.push(
    '',
    '## Recommended Human Action',
    '- Review the blocking issues above.',
    '- Decide whether to amend the contract, relax a constraint, or escalate to the teams directly.',
  );
  return lines.join('\n');
}

function contractorTeams(deps: EngineDeps, room: Room): string[] {
  return deps.store.participants
    .listByRoom(room.id)
    .filter((participant) => participant.role === 'contractor')
    .map((participant) => participant.team);
}

function blockingReasons(deps: EngineDeps, room: Room): string[] {
  const reasons: string[] = [];
  for (const message of deps.store.messages.listSince(room.id)) {
    if (message.act === 'failure') {
      reasons.push(message.payload.reason);
    }
  }
  return reasons;
}

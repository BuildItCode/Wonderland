import {
  ConflictError,
  ValidationError,
  type Briefing,
  type CreateRoomInput,
  type CreateRoomResult,
  type JoinResult,
  type Participant,
  type Role,
  type RoleLink,
  type Room,
} from '../domain/index.js';
import { toTemplateMeta } from '../templates/index.js';
import type { EngineDeps } from './deps.js';
import { requireParticipant, requireRoom, requireTemplate } from './guards.js';
import { procedureText, roleInstructions } from './briefing-text.js';
import { runAutoFacilitation } from './auto-facilitate.js';

/** Create a room and mint one role-link per party. */
export function createRoom(deps: EngineDeps, input: CreateRoomInput): CreateRoomResult {
  const template = requireTemplate(deps.templates, input.templateId);
  assertValidParties(input, template.autoFacilitate ?? false);
  const roomId = deps.ids.room();
  const room: Room = {
    id: roomId,
    task: input.task,
    templateId: template.id,
    phase: template.initialPhase,
    round: 0,
    summary: '',
    outcome: null,
    createdAt: deps.clock.now(),
  };
  deps.store.rooms.create(room);
  const links = input.parties.map((party) => invite(deps, roomId, party));
  return { roomId, url: `/rooms/${roomId}`, links };
}

/** Read-only, pre-join briefing for a token. Does not mutate state. */
export function resolveLink(deps: EngineDeps, token: string): Briefing {
  const me = requireParticipant(deps.store, token);
  const room = requireRoom(deps.store, me.roomId);
  if (room.phase === 'closed') {
    throw new ConflictError('Room is closed; this link is no longer valid.');
  }
  const template = requireTemplate(deps.templates, room.templateId);
  const attendees = deps.store.participants
    .listByRoom(room.id)
    .map((participant) => ({ team: participant.team, role: participant.role }));
  return {
    roomId: room.id,
    task: room.task,
    template: toTemplateMeta(template),
    yourRole: me.role,
    yourTeam: me.team,
    attendees,
    procedure: procedureText(template),
    instructions: roleInstructions(template, me.role),
  };
}

/** Bind the caller's identity (idempotent) and return the room snapshot. */
export function join(deps: EngineDeps, token: string): JoinResult {
  const me = requireParticipant(deps.store, token);
  const room = requireRoom(deps.store, me.roomId);
  if (room.phase === 'closed') {
    throw new ConflictError('Room is closed; this link is no longer valid.');
  }
  if (me.status === 'invited' || me.status === 'preparing') {
    deps.store.participants.setStatus(room.id, me.id, 'joined');
  }
  runAutoFacilitation(deps, me.roomId);
  const current = deps.store.rooms.get(me.roomId) ?? room;
  return { participantId: me.id, phase: current.phase, summary: current.summary };
}

function assertValidParties(input: CreateRoomInput, autoFacilitate: boolean): void {
  const facilitators = input.parties.filter((party) => party.role === 'facilitator').length;
  const contractors = input.parties.filter((party) => party.role === 'contractor').length;
  if (autoFacilitate) {
    if (facilitators > 1) {
      throw new ValidationError('An auto-facilitated room allows at most one facilitator.');
    }
  } else if (facilitators !== 1) {
    throw new ValidationError('A room requires exactly one facilitator.');
  }
  if (contractors < 1) {
    throw new ValidationError('A room requires at least one contractor.');
  }
}

function invite(deps: EngineDeps, roomId: string, party: { team: string; role: Role }): RoleLink {
  const participant: Participant = {
    id: deps.ids.participant(),
    team: party.team,
    role: party.role,
    status: 'invited',
  };
  const token = deps.ids.token();
  deps.store.participants.add(roomId, participant, token);
  return { token, roomId, role: party.role, team: party.team };
}

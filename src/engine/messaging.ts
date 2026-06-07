import {
  ConflictError,
  ValidationError,
  messageSchema,
  speechActSchema,
  type Message,
  type MyState,
  type Phase,
  type PostResult,
  type Presence,
  type Room,
  type SpeechAct,
  type SpeechActType,
  type Template,
} from '../domain/index.js';
import type { EngineDeps } from './deps.js';
import { requireParticipant, requireRoom, requireTemplate } from './guards.js';
import { maybeRegressOnFailure } from './regression.js';

/** Append a typed speech act to the transcript, applying its contract side effects. */
export function post(
  deps: EngineDeps,
  token: string,
  act: SpeechActType,
  payload: unknown,
  refVersion?: number,
): PostResult {
  const me = requireParticipant(deps.store, token);
  const room = requireRoom(deps.store, me.roomId);
  if (room.phase === 'closed') {
    throw new ConflictError('Room is closed.');
  }
  const template = requireTemplate(deps.templates, room.templateId);
  assertActAllowed(template, room.phase, act);
  const speechAct = parseSpeechAct(act, payload);
  const ref = applyActEffects(deps, room, me.id, speechAct, refVersion);
  const message = messageSchema.parse({
    id: deps.ids.message(),
    from: me.id,
    ts: deps.clock.now(),
    refVersion: ref,
    act: speechAct.act,
    payload: speechAct.payload,
  });
  deps.store.messages.append(room.id, message);
  if (speechAct.act === 'failure' && speechAct.payload.fatal) {
    maybeRegressOnFailure(deps, room, me.id);
  }
  return { messageId: message.id };
}

/** Update the caller's presence status. */
export function setStatus(deps: EngineDeps, token: string, status: Presence): void {
  const me = requireParticipant(deps.store, token);
  deps.store.participants.setStatus(me.roomId, me.id, status);
}

/** List transcript messages, optionally only those after a cursor message id. */
export function readRoom(deps: EngineDeps, token: string, since?: string): Message[] {
  const me = requireParticipant(deps.store, token);
  return deps.store.messages.listSince(me.roomId, since);
}

/** One-call catch-up view for the caller, for resuming after a disconnect. */
export function myState(deps: EngineDeps, token: string): MyState {
  const me = requireParticipant(deps.store, token);
  return {
    me: me.id,
    status: me.status,
    myMessages: deps.store.messages.listByParticipant(me.roomId, me.id),
    signedVersion: deps.store.contracts.latestSignedVersion(me.roomId, me.id),
    assignedTasks: assignedTasksFor(deps, me.roomId, me.id),
  };
}

function assignedTasksFor(deps: EngineDeps, roomId: string, participantId: string): string[] {
  const latest = deps.store.contracts.getLatest(roomId);
  if (!latest || !latest.signatures.includes(participantId)) {
    return [];
  }
  return latest.body.terms.map((term) => `${term.key}: ${term.detail}`);
}

function assertActAllowed(template: Template, phase: Phase, act: SpeechActType): void {
  const allowed = template.allowedActs[phase] ?? [];
  if (!allowed.includes(act)) {
    throw new ConflictError(`Act '${act}' is not allowed in phase '${phase}'.`);
  }
}

function parseSpeechAct(act: SpeechActType, payload: unknown): SpeechAct {
  const result = speechActSchema.safeParse({ act, payload });
  if (!result.success) {
    throw new ValidationError(`Invalid ${act} payload.`, { cause: result.error });
  }
  return result.data;
}

function applyActEffects(
  deps: EngineDeps,
  room: Room,
  fromId: string,
  speechAct: SpeechAct,
  refVersion?: number,
): number | undefined {
  switch (speechAct.act) {
    case 'propose': {
      const latest = deps.store.contracts.getLatest(room.id);
      const version = (latest?.version ?? 0) + 1;
      deps.store.contracts.addVersion(room.id, {
        version,
        proposedBy: fromId,
        body: speechAct.payload.body,
        signatures: [],
      });
      return version;
    }
    case 'accept': {
      const version = speechAct.payload.version;
      if (!deps.store.contracts.getVersion(room.id, version)) {
        throw new ConflictError(`No contract version ${version} to accept.`);
      }
      deps.store.contracts.addSignature(room.id, version, fromId);
      return version;
    }
    case 'reject':
      return speechAct.payload.version;
    default:
      return refVersion;
  }
}

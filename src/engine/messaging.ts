import {
  ConflictError,
  ValidationError,
  messageSchema,
  speechActSchema,
  type Message,
  type MyState,
  type PostResult,
  type Presence,
  type SpeechAct,
  type SpeechActType,
} from '../domain/index.js';
import type { EngineDeps } from './deps.js';
import { requireParticipant, requireRoom } from './guards.js';
import { runAutoFacilitation } from './auto-facilitate.js';
import { stanceOf } from './consensus.js';

/** Append a typed speech act to the transcript, then let the hub re-evaluate consensus. */
export function post(
  deps: EngineDeps,
  token: string,
  act: SpeechActType,
  payload: unknown,
): PostResult {
  const me = requireParticipant(deps.store, token);
  const room = requireRoom(deps.store, me.roomId);
  if (room.status === 'closed') {
    throw new ConflictError('Room is closed.');
  }
  const speechAct = parseSpeechAct(act, payload);
  const message = messageSchema.parse({
    id: deps.ids.message(),
    from: me.id,
    ts: deps.clock.now(),
    act: speechAct.act,
    payload: speechAct.payload,
  });
  deps.store.messages.append(room.id, message);
  if (speechAct.act === 'propose') {
    deps.store.rooms.setRound(room.id, room.round + 1);
  }
  runAutoFacilitation(deps, room.id);
  return { messageId: message.id };
}

/** Update the caller's presence status. Presence is informational — it does not gate consensus. */
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
  const room = requireRoom(deps.store, me.roomId);
  return {
    me: me.id,
    status: me.status,
    myMessages: deps.store.messages.listByParticipant(me.roomId, me.id),
    stance: stanceOf(deps, room, me.id),
  };
}

function parseSpeechAct(act: SpeechActType, payload: unknown): SpeechAct {
  // Some MCP clients serialize free-form payloads as a JSON string — accept that too.
  let value = payload;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      // leave as-is; validation below will reject it
    }
  }
  const result = speechActSchema.safeParse({ act, payload: value });
  if (!result.success) {
    throw new ValidationError(`Invalid ${act} payload.`, { cause: result.error });
  }
  return result.data;
}

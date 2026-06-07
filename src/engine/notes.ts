import { messageSchema, type Room } from '../domain/index.js';
import type { EngineDeps } from './deps.js';

/** Append a system inform note to the transcript (used for facilitator/engine annotations). */
export function appendNote(deps: EngineDeps, room: Room, fromId: string, text: string): void {
  const message = messageSchema.parse({
    id: deps.ids.message(),
    from: fromId,
    ts: deps.clock.now(),
    act: 'inform',
    payload: { kind: 'note', text },
  });
  deps.store.messages.append(room.id, message);
}

import {
  NotFoundError,
  type ResolvedParticipant,
  type Room,
  type RoomId,
  type Store,
} from '../domain/index.js';

/** Resolve a token to its participant, or throw NotFound. */
export function requireParticipant(store: Store, token: string): ResolvedParticipant {
  const me = store.participants.getByToken(token);
  if (!me) {
    throw new NotFoundError('Unknown link token.');
  }
  return me;
}

/** Fetch a room by id, or throw NotFound. */
export function requireRoom(store: Store, roomId: RoomId): Room {
  const room = store.rooms.get(roomId);
  if (!room) {
    throw new NotFoundError('Room not found.');
  }
  return room;
}

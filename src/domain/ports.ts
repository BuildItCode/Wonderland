import type { Room, Participant } from './room.js';
import type { Message } from './speech-acts.js';
import type { Outcome, Presence, RoomStatus } from './enums.js';
import type { ParticipantId, RoomId, LinkToken, MessageId } from './ids.js';

/** A participant together with the room it belongs to, returned when resolving a token. */
export interface ResolvedParticipant extends Participant {
  roomId: RoomId;
}

/** Persistence for room aggregates. */
export interface RoomRepository {
  /** Insert a new room. */
  create(room: Room): void;
  /** Fetch a room by id, or null if it does not exist. */
  get(roomId: RoomId): Room | null;
  /** Open or close the room. */
  setStatus(roomId: RoomId, status: RoomStatus): void;
  /** Replace the room's living summary. */
  setSummary(roomId: RoomId, summary: string): void;
  /** Update the proposal-round counter. */
  setRound(roomId: RoomId, round: number): void;
  /** Record the terminal outcome on close. */
  setOutcome(roomId: RoomId, outcome: Outcome): void;
  /** Persist the finalized document. */
  setDoc(roomId: RoomId, doc: string): void;
  /** Read the finalized document, or null/empty if none has been written. */
  getDoc(roomId: RoomId): string | null;
}

/** Persistence for participants and their link-token identity binding. */
export interface ParticipantRepository {
  /** Insert a participant slot bound to a role-link token. */
  add(roomId: RoomId, participant: Participant, token: LinkToken): void;
  /** Resolve a role-link token to its participant and room, or null if unknown. */
  getByToken(token: LinkToken): ResolvedParticipant | null;
  /** Fetch a participant within a room by id. */
  getById(roomId: RoomId, participantId: ParticipantId): Participant | null;
  /** List all participants in a room. */
  listByRoom(roomId: RoomId): Participant[];
  /** Update a participant's presence status. */
  setStatus(roomId: RoomId, participantId: ParticipantId, status: Presence): void;
}

/** Append-only persistence for the transcript. */
export interface MessageRepository {
  /** Append a message to a room's transcript. */
  append(roomId: RoomId, message: Message): void;
  /** List messages in order; if `sinceId` is given, only those after it. */
  listSince(roomId: RoomId, sinceId?: MessageId): Message[];
  /** List a single participant's own messages in order. */
  listByParticipant(roomId: RoomId, participantId: ParticipantId): Message[];
}

/** The full persistence surface the engine depends on. */
export interface Store {
  rooms: RoomRepository;
  participants: ParticipantRepository;
  messages: MessageRepository;
}

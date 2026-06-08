import type { Briefing, MyState, RoleLink } from './room.js';
import type { Message } from './speech-acts.js';
import type { LinkToken, MessageId, ParticipantId, RoomId } from './ids.js';
import type {
  Facilitation,
  Outcome,
  Presence,
  Role,
  RoomKind,
  RoomStatus,
  SpeechActType,
} from './enums.js';

/** Input to create a room: the task, what kind, who drives it, and the parties to invite. */
export interface CreateRoomInput {
  task: string;
  /** `decision` (default) closes on consensus; `discussion` stays open until a participant closes it. */
  kind?: RoomKind;
  /** Who chairs the room. `auto` (default) = the hub; `agent` = a facilitator agent. */
  facilitation?: Facilitation;
  parties: { team: string; role: Role }[];
}

/** Result of creating a room: its id, addressable url, and the minted role-links. */
export interface CreateRoomResult {
  roomId: RoomId;
  url: string;
  links: RoleLink[];
}

/** Result of joining: the bound participant id and the current room view. */
export interface JoinResult {
  participantId: ParticipantId;
  status: RoomStatus;
  summary: string;
}

/** Result of posting a speech act. */
export interface PostResult {
  messageId: MessageId;
}

/** The current proposal under consideration, with who has agreed to / blocked it. */
export interface ProposalView {
  version: number;
  by: ParticipantId;
  title?: string;
  text: string;
  agreed: ParticipantId[];
  blocked: ParticipantId[];
}

/** A read-only snapshot of room state for display. */
export interface RoomSnapshot {
  roomId: RoomId;
  task: string;
  kind: RoomKind;
  facilitation: Facilitation;
  status: RoomStatus;
  round: number;
  summary: string;
  outcome: Outcome | null;
  participants: Array<{ id: ParticipantId; team: string; role: Role; status: Presence }>;
  proposal: ProposalView | null;
  /** Participants (working role) who have not yet agreed to the current proposal. */
  pending: ParticipantId[];
}

/** Result of declaring an outcome: the finalized document. */
export interface DeclareResult {
  doc: string;
}

/**
 * The tool-facing operations of the hub. The transport layer maps MCP tools onto
 * this interface; the engine implements it. Side effects are persisted via the store.
 */
export interface HubService {
  /** Create a room and mint one role-link per party. */
  createRoom(input: CreateRoomInput): CreateRoomResult;
  /** Read-only, pre-join briefing for a role-link token. */
  resolveLink(token: LinkToken): Briefing;
  /** Bind the caller's stable identity and return the current room view. */
  join(token: LinkToken): JoinResult;
  /** Append a typed speech act (propose / agree / block / say) to the transcript. */
  post(token: LinkToken, act: SpeechActType, payload: unknown): PostResult;
  /** Update the caller's presence status. */
  setStatus(token: LinkToken, status: Presence): void;
  /** List transcript messages, optionally only those after a cursor. */
  readRoom(token: LinkToken, since?: MessageId): Message[];
  /** One-call catch-up view for the caller. */
  myState(token: LinkToken): MyState;
  /** Replace the living summary (facilitator only). */
  updateSummary(token: LinkToken, summary: string): void;
  /** Close the room with an outcome and finalize the document (facilitator only). */
  declare(token: LinkToken, outcome: Outcome): DeclareResult;
  /** Read the finalized document (any participant; survives close). */
  readDoc(token: LinkToken): { doc: string };
  /** A read-only snapshot of room state for display (works after close). */
  roomSnapshot(token: LinkToken): RoomSnapshot;
}

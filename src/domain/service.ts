import type { Briefing, MyState, RoleLink, TemplateMeta } from './room.js';
import type { Message } from './speech-acts.js';
import type { LinkToken, MessageId, ParticipantId, RoomId } from './ids.js';
import type { Outcome, Phase, Presence, Role, SpeechActType } from './enums.js';

/** Input to create a room: the task, chosen template, and the parties to invite. */
export interface CreateRoomInput {
  task: string;
  templateId: string;
  parties: { team: string; role: Role }[];
}

/** Result of creating a room: its id, addressable url, and the minted role-links. */
export interface CreateRoomResult {
  roomId: RoomId;
  url: string;
  links: RoleLink[];
}

/** Result of joining: the bound participant id and the current room snapshot. */
export interface JoinResult {
  participantId: ParticipantId;
  phase: Phase;
  summary: string;
}

/** Result of posting a speech act. */
export interface PostResult {
  messageId: MessageId;
}

/** Result of an advance attempt: the new phase, or a consensus block listing who must still sign. */
export type AdvanceResult = { phase: Phase } | { blocked: 'consensus'; missing: ParticipantId[] };

/** A read-only snapshot of room state for display. */
export interface RoomSnapshot {
  roomId: RoomId;
  task: string;
  phase: Phase;
  round: number;
  summary: string;
  outcome: Outcome | null;
  participants: Array<{ id: ParticipantId; team: string; role: Role; status: Presence }>;
  contract: {
    version: number;
    proposedBy: ParticipantId;
    signatures: ParticipantId[];
  } | null;
}

/** Result of a regression: the phase re-opened, or an unsolvable outcome when the round cap is hit. */
export type RegressResult = { phase: Phase } | { outcome: Outcome };

/** Result of declaring an outcome: the finalized document. */
export interface DeclareResult {
  doc: string;
}

/**
 * The tool-facing operations of the hub. The transport layer maps MCP tools onto
 * this interface; the engine implements it. Side effects are persisted via the store.
 */
export interface HubService {
  /** Create a room and mint one facilitator + N contractor role-links. */
  createRoom(input: CreateRoomInput): CreateRoomResult;
  /** Read-only, pre-join briefing for a role-link token. */
  resolveLink(token: LinkToken): Briefing;
  /** Bind the caller's stable identity and return the current room snapshot. */
  join(token: LinkToken): JoinResult;
  /** Append a typed speech act to the transcript. */
  post(token: LinkToken, act: SpeechActType, payload: unknown, refVersion?: number): PostResult;
  /** Update the caller's presence status. */
  setStatus(token: LinkToken, status: Presence): void;
  /** List transcript messages, optionally only those after a cursor. */
  readRoom(token: LinkToken, since?: MessageId): Message[];
  /** One-call catch-up view for the caller. */
  myState(token: LinkToken): MyState;
  /** Replace the living summary (facilitator only). */
  updateSummary(token: LinkToken, summary: string): void;
  /** Advance to the next phase if consensus allows (facilitator only). */
  advancePhase(token: LinkToken): AdvanceResult;
  /** Regress to an earlier phase (facilitator only), forcing contract re-signature. */
  regressPhase(token: LinkToken, to: Phase, reason: string): RegressResult;
  /** Close the room with an outcome and finalize the document (facilitator only). */
  declare(token: LinkToken, outcome: Outcome): DeclareResult;
  /** Read the finalized document (any participant; survives close). */
  readDoc(token: LinkToken): { doc: string };
  /** List available templates (for selection / UX). */
  listTemplates(): TemplateMeta[];
  /** A read-only snapshot of room state for display (works after close). */
  roomSnapshot(token: LinkToken): RoomSnapshot;
}

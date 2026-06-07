import type {
  Briefing,
  CreateRoomInput,
  CreateRoomResult,
  DeclareResult,
  JoinResult,
  Message,
  MyState,
  HubService,
  Outcome,
  PostResult,
  Presence,
  RoomSnapshot,
  SpeechActType,
} from '../domain/index.js';
import type { EngineDeps } from './deps.js';
import { createRoom, join, resolveLink } from './lifecycle.js';
import { myState, post, readRoom, setStatus } from './messaging.js';
import { declare, readDoc, updateSummary } from './closing.js';
import { roomSnapshot } from './snapshot.js';

/**
 * Public facade over the engine operations. Holds the injected dependencies and
 * delegates each call to a focused ops module — the complete `HubService`.
 */
export class HubEngine implements HubService {
  constructor(private readonly deps: EngineDeps) {}

  /** Create a room and mint role-links. */
  createRoom(input: CreateRoomInput): CreateRoomResult {
    return createRoom(this.deps, input);
  }

  /** Read-only briefing for a token. */
  resolveLink(token: string): Briefing {
    return resolveLink(this.deps, token);
  }

  /** Bind identity and return the room view. */
  join(token: string): JoinResult {
    return join(this.deps, token);
  }

  /** Append a typed speech act. */
  post(token: string, act: SpeechActType, payload: unknown): PostResult {
    return post(this.deps, token, act, payload);
  }

  /** Update presence status. */
  setStatus(token: string, status: Presence): void {
    setStatus(this.deps, token, status);
  }

  /** List transcript messages, optionally after a cursor. */
  readRoom(token: string, since?: string): Message[] {
    return readRoom(this.deps, token, since);
  }

  /** One-call catch-up view for the caller. */
  myState(token: string): MyState {
    return myState(this.deps, token);
  }

  /** Replace the living summary (facilitator only). */
  updateSummary(token: string, summary: string): void {
    updateSummary(this.deps, token, summary);
  }

  /** Close the room with an outcome and finalize the doc (facilitator only). */
  declare(token: string, outcome: Outcome): DeclareResult {
    return declare(this.deps, token, outcome);
  }

  /** Read the finalized document (any participant; survives close). */
  readDoc(token: string): { doc: string } {
    return readDoc(this.deps, token);
  }

  /** Read-only snapshot of room state for display. */
  roomSnapshot(token: string): RoomSnapshot {
    return roomSnapshot(this.deps, token);
  }
}

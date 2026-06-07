import type {
  AdvanceResult,
  Briefing,
  CreateRoomInput,
  CreateRoomResult,
  DeclareResult,
  JoinResult,
  Message,
  MyState,
  HubService,
  Outcome,
  Phase,
  PostResult,
  Presence,
  RegressResult,
  RoomSnapshot,
  SpeechActType,
  TemplateMeta,
  VerifyResult,
} from '../domain/index.js';
import type { EngineDeps } from './deps.js';
import { createRoom, join, resolveLink } from './lifecycle.js';
import { myState, post, readRoom, setStatus } from './messaging.js';
import { advancePhase } from './phase.js';
import { regressPhase } from './regression.js';
import { submitVerification } from './verification.js';
import { declare, readDoc, updateSummary } from './closing.js';
import { listTemplates, roomSnapshot } from './snapshot.js';

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

  /** Bind identity and return the room snapshot. */
  join(token: string): JoinResult {
    return join(this.deps, token);
  }

  /** Append a typed speech act. */
  post(token: string, act: SpeechActType, payload: unknown, refVersion?: number): PostResult {
    return post(this.deps, token, act, payload, refVersion);
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

  /** Advance to the next phase if consensus allows (facilitator only). */
  advancePhase(token: string): AdvanceResult {
    return advancePhase(this.deps, token);
  }

  /** Regress to an earlier phase, forcing re-signature (facilitator only). */
  regressPhase(token: string, to: Phase, reason: string): RegressResult {
    return regressPhase(this.deps, token, to, reason);
  }

  /** Submit a verification pass/fail for a contract version (contractor only, verify phase). */
  submitVerification(token: string, version: number, passed: boolean): VerifyResult {
    return submitVerification(this.deps, token, version, passed);
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

  /** List available templates. */
  listTemplates(): TemplateMeta[] {
    return listTemplates(this.deps);
  }

  /** Read-only snapshot of room state for display. */
  roomSnapshot(token: string): RoomSnapshot {
    return roomSnapshot(this.deps, token);
  }
}

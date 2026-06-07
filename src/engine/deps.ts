import { nanoid } from 'nanoid';
import type { Store, TemplateRegistry } from '../domain/index.js';

/** Injectable time source — keeps the engine's logic pure and testable. */
export interface Clock {
  now(): number;
}

/** Injectable identifier factory for rooms, participants, tokens, and messages. */
export interface IdGenerator {
  room(): string;
  participant(): string;
  token(): string;
  message(): string;
}

/** Everything the engine operations need, injected for testability. */
export interface EngineDeps {
  store: Store;
  templates: TemplateRegistry;
  clock: Clock;
  ids: IdGenerator;
}

/** The wall-clock implementation used in production. */
export function createSystemClock(): Clock {
  return { now: () => Date.now() };
}

/** Nanoid-based identifier factory used in production. */
export function createNanoidIdGenerator(): IdGenerator {
  return {
    room: () => `r_${nanoid()}`,
    participant: () => `p_${nanoid()}`,
    token: () => `tok_${nanoid(24)}`,
    message: () => `m_${nanoid()}`,
  };
}

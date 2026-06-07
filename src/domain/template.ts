import type { Phase, SpeechActType } from './enums.js';
import type { ExitCriterion } from './room.js';

/** Internal configuration of a negotiation protocol. `TemplateMeta` is its public subset. */
export interface Template {
  id: string;
  phases: Phase[];
  initialPhase: Phase;
  exit: ExitCriterion;
  roundCap: number;
  allowedActs: Partial<Record<Phase, SpeechActType[]>>;
}

/** Lookup for available templates by id. */
export interface TemplateRegistry {
  /** Resolve a template by id, or undefined if unknown. */
  get(id: string): Template | undefined;
  /** All registered templates. */
  list(): Template[];
}

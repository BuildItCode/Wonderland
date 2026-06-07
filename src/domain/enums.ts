import { z } from 'zod';

/** The typed speech acts agents exchange (FIPA-inspired, Contract Net negotiation). */
export const speechActTypeSchema = z.enum([
  'inform',
  'propose',
  'accept',
  'reject',
  'request',
  'failure',
]);

/** Union of the valid speech-act tags. */
export type SpeechActType = z.infer<typeof speechActTypeSchema>;

/** Ordered phases a room moves through; `closed` is terminal. */
export const phaseSchema = z.enum(['frame', 'propose', 'implement', 'verify', 'ratify', 'closed']);

/** Union of the valid room phases. */
export type Phase = z.infer<typeof phaseSchema>;

/** Terminal outcome recorded when a room closes. */
export const outcomeSchema = z.enum(['ratified', 'verified', 'unsolvable']);

/** Union of the valid terminal outcomes. */
export type Outcome = z.infer<typeof outcomeSchema>;

/** Role a participant holds in a room. */
export const roleSchema = z.enum(['facilitator', 'contractor']);

/** Union of the valid participant roles. */
export type Role = z.infer<typeof roleSchema>;

/** Presence signal a participant broadcasts so others can orchestrate async work. */
export const presenceSchema = z.enum([
  'invited',
  'preparing',
  'joined',
  'thinking',
  'implementing',
  'blocked',
  'proposing',
  'ratified',
  'done',
]);

/** Union of the valid presence states. */
export type Presence = z.infer<typeof presenceSchema>;

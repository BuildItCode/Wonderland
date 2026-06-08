import { z } from 'zod';

/**
 * The free-form speech acts agents exchange.
 *
 * `propose` puts a candidate solution forward (plain text); `agree` / `block` are a
 * participant's stance on the current proposal; `say` is open discussion. Consensus is
 * derived from the transcript — no contracts, signatures, or phases.
 */
export const speechActTypeSchema = z.enum(['propose', 'agree', 'block', 'say']);

/** Union of the valid speech-act tags. */
export type SpeechActType = z.infer<typeof speechActTypeSchema>;

/** Lifecycle of a room: `open` until it closes with an outcome. */
export const roomStatusSchema = z.enum(['open', 'closed']);

/** Union of the valid room statuses. */
export type RoomStatus = z.infer<typeof roomStatusSchema>;

/** Terminal outcome recorded when a room closes. */
export const outcomeSchema = z.enum(['resolved', 'unsolvable']);

/** Union of the valid terminal outcomes. */
export type Outcome = z.infer<typeof outcomeSchema>;

/** Role a participant holds in a room. */
export const roleSchema = z.enum(['facilitator', 'participant']);

/** Union of the valid participant roles. */
export type Role = z.infer<typeof roleSchema>;

/** Who drives the room: the hub itself (rule-based, no LLM) or a facilitator agent. */
export const facilitationSchema = z.enum(['auto', 'agent']);

/** Union of the valid facilitation modes. */
export type Facilitation = z.infer<typeof facilitationSchema>;

/**
 * What a room is for.
 * - `decision` — closes once consensus is reached (auto) or the facilitator declares.
 * - `discussion` — stays open even after everyone agrees; closes only when a participant declares.
 */
export const roomKindSchema = z.enum(['decision', 'discussion']);

/** Union of the valid room kinds. */
export type RoomKind = z.infer<typeof roomKindSchema>;

/** Presence signal a participant broadcasts so others can orchestrate async work. */
export const presenceSchema = z.enum(['invited', 'joined', 'thinking', 'blocked', 'done']);

/** Union of the valid presence states. */
export type Presence = z.infer<typeof presenceSchema>;

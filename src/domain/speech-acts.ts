import { z } from 'zod';
import { idSchema } from './ids.js';

/** Puts a candidate solution forward in plain text. The latest `propose` is the current proposal. */
export const proposePayloadSchema = z
  .object({
    title: z.string().min(1).optional(),
    text: z.string().min(1),
  })
  .strict();

/** A participant agrees the current proposal resolves the task for their side. */
export const agreePayloadSchema = z.object({ note: z.string().optional() }).strict();

/** A participant objects to the current proposal, with a reason. */
export const blockPayloadSchema = z.object({ reason: z.string().min(1) }).strict();

/** Free-form discussion that carries no stance. */
export const sayPayloadSchema = z.object({ text: z.string().min(1) }).strict();

/** A speech act = an act tag plus its validated, act-specific payload (wire shape for `post`). */
export const speechActSchema = z.discriminatedUnion('act', [
  z.object({ act: z.literal('propose'), payload: proposePayloadSchema }).strict(),
  z.object({ act: z.literal('agree'), payload: agreePayloadSchema }).strict(),
  z.object({ act: z.literal('block'), payload: blockPayloadSchema }).strict(),
  z.object({ act: z.literal('say'), payload: sayPayloadSchema }).strict(),
]);

/** A validated speech act as submitted by a participant. */
export type SpeechAct = z.infer<typeof speechActSchema>;

const envelopeShape = {
  id: idSchema,
  from: idSchema,
  ts: z.number().int().nonnegative(),
};

/** A persisted, append-only transcript entry: a speech act plus envelope metadata. */
export const messageSchema = z.discriminatedUnion('act', [
  z.object({ ...envelopeShape, act: z.literal('propose'), payload: proposePayloadSchema }).strict(),
  z.object({ ...envelopeShape, act: z.literal('agree'), payload: agreePayloadSchema }).strict(),
  z.object({ ...envelopeShape, act: z.literal('block'), payload: blockPayloadSchema }).strict(),
  z.object({ ...envelopeShape, act: z.literal('say'), payload: sayPayloadSchema }).strict(),
]);

/** A single entry in a room's transcript. */
export type Message = z.infer<typeof messageSchema>;

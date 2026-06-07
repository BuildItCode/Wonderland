import { z } from 'zod';
import { idSchema } from './ids.js';
import { contractBodySchema } from './contract.js';

/** Capability manifest, work result, or free note carried by an `inform` act. */
export const informPayloadSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('capability'),
      service: z.string().min(1),
      surface: z.string().min(1),
      constraints: z.array(z.string()).default([]),
    })
    .strict(),
  z
    .object({
      kind: z.literal('result'),
      summary: z.string().min(1),
      artifacts: z.array(z.string()).default([]),
    })
    .strict(),
  z
    .object({
      kind: z.literal('note'),
      text: z.string().min(1),
    })
    .strict(),
]);

/** Payload of an `inform` act. */
export type InformPayload = z.infer<typeof informPayloadSchema>;

/** Payload that puts a new contract version forward for signature. */
export const proposePayloadSchema = z.object({ body: contractBodySchema }).strict();

/** Payload that signs the referenced contract version. */
export const acceptPayloadSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

/** Payload that refuses the referenced version, with a reason and optional counter. */
export const rejectPayloadSchema = z
  .object({
    version: z.number().int().positive(),
    reason: z.string().min(1),
    counter: contractBodySchema.optional(),
  })
  .strict();

/** Payload that asks a specific participant for information or an action. */
export const requestPayloadSchema = z
  .object({
    to: idSchema,
    ask: z.string().min(1),
  })
  .strict();

/** Payload reporting a problem; a `fatal` failure can trigger regression or unsolvable. */
export const failurePayloadSchema = z
  .object({
    reason: z.string().min(1),
    fatal: z.boolean().default(false),
  })
  .strict();

/** A speech act = an act tag plus its validated, act-specific payload (wire shape for `post`). */
export const speechActSchema = z.discriminatedUnion('act', [
  z.object({ act: z.literal('inform'), payload: informPayloadSchema }).strict(),
  z.object({ act: z.literal('propose'), payload: proposePayloadSchema }).strict(),
  z.object({ act: z.literal('accept'), payload: acceptPayloadSchema }).strict(),
  z.object({ act: z.literal('reject'), payload: rejectPayloadSchema }).strict(),
  z.object({ act: z.literal('request'), payload: requestPayloadSchema }).strict(),
  z.object({ act: z.literal('failure'), payload: failurePayloadSchema }).strict(),
]);

/** A validated speech act as submitted by a participant. */
export type SpeechAct = z.infer<typeof speechActSchema>;

const envelopeShape = {
  id: idSchema,
  from: idSchema,
  ts: z.number().int().nonnegative(),
  refVersion: z.number().int().positive().optional(),
};

/** A persisted, append-only transcript entry: a speech act plus envelope metadata. */
export const messageSchema = z.discriminatedUnion('act', [
  z.object({ ...envelopeShape, act: z.literal('inform'), payload: informPayloadSchema }).strict(),
  z.object({ ...envelopeShape, act: z.literal('propose'), payload: proposePayloadSchema }).strict(),
  z.object({ ...envelopeShape, act: z.literal('accept'), payload: acceptPayloadSchema }).strict(),
  z.object({ ...envelopeShape, act: z.literal('reject'), payload: rejectPayloadSchema }).strict(),
  z.object({ ...envelopeShape, act: z.literal('request'), payload: requestPayloadSchema }).strict(),
  z.object({ ...envelopeShape, act: z.literal('failure'), payload: failurePayloadSchema }).strict(),
]);

/** A single entry in a room's transcript. */
export type Message = z.infer<typeof messageSchema>;

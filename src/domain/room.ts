import { z } from 'zod';
import { idSchema } from './ids.js';
import { phaseSchema, presenceSchema, roleSchema, outcomeSchema } from './enums.js';
import { messageSchema } from './speech-acts.js';

/** Exit criterion a template enforces before a room may close successfully. */
export const exitCriterionSchema = z.enum(['ratified-contract', 'verified-solution']);

/** Union of the valid exit criteria. */
export type ExitCriterion = z.infer<typeof exitCriterionSchema>;

/** Public, read-only description of a template's negotiation procedure. */
export const templateMetaSchema = z
  .object({
    id: z.string().min(1),
    phases: z.array(phaseSchema).min(1),
    exit: exitCriterionSchema,
    roundCap: z.number().int().positive(),
  })
  .strict();

/** The procedure a room follows, as surfaced to agents. */
export type TemplateMeta = z.infer<typeof templateMetaSchema>;

/** A single attendee entry as shown in a briefing. */
export const attendeeSchema = z.object({ team: z.string().min(1), role: roleSchema }).strict();

/** What a role-link reveals before joining, so an agent can prepare. */
export const briefingSchema = z
  .object({
    roomId: idSchema,
    task: z.string().min(1),
    template: templateMetaSchema,
    yourRole: roleSchema,
    yourTeam: z.string().min(1),
    attendees: z.array(attendeeSchema),
  })
  .strict();

/** The read-only, pre-join view returned by resolving a role-link. */
export type Briefing = z.infer<typeof briefingSchema>;

/** A participant slot within a room. */
export const participantSchema = z
  .object({
    id: idSchema,
    team: z.string().min(1),
    role: roleSchema,
    status: presenceSchema,
  })
  .strict();

/** A facilitator or contractor occupying a room. */
export type Participant = z.infer<typeof participantSchema>;

/** A bearer token addressing exactly one role in one room. */
export const roleLinkSchema = z
  .object({
    token: idSchema,
    roomId: idSchema,
    role: roleSchema,
    team: z.string().min(1),
  })
  .strict();

/** A shareable link that binds a stable identity on join. */
export type RoleLink = z.infer<typeof roleLinkSchema>;

/** One-call catch-up view for a returning agent. */
export const myStateSchema = z
  .object({
    me: idSchema,
    status: presenceSchema,
    myMessages: z.array(messageSchema).default([]),
    signedVersion: z.number().int().positive().nullable(),
    assignedTasks: z.array(z.string()).default([]),
  })
  .strict();

/** A participant's own slice of room state, for resuming after a disconnect. */
export type MyState = z.infer<typeof myStateSchema>;

/** Full room aggregate persisted by the hub. */
export const roomSchema = z
  .object({
    id: idSchema,
    task: z.string().min(1),
    templateId: z.string().min(1),
    phase: phaseSchema,
    round: z.number().int().nonnegative(),
    summary: z.string().default(''),
    outcome: outcomeSchema.nullable(),
    createdAt: z.number().int().nonnegative(),
  })
  .strict();

/** The persisted state of a single room. */
export type Room = z.infer<typeof roomSchema>;

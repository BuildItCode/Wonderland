import { z } from 'zod';
import { idSchema } from './ids.js';
import {
  facilitationSchema,
  outcomeSchema,
  presenceSchema,
  roleSchema,
  roomStatusSchema,
} from './enums.js';
import { messageSchema } from './speech-acts.js';

/** A participant's stance on the current proposal. */
export const stanceSchema = z.enum(['none', 'agree', 'block']);

/** Union of the valid stances. */
export type Stance = z.infer<typeof stanceSchema>;

/** A single attendee entry as shown in a briefing. */
export const attendeeSchema = z.object({ team: z.string().min(1), role: roleSchema }).strict();

/** What a role-link reveals: the task, how the room works, and this role's instructions. */
export const briefingSchema = z
  .object({
    roomId: idSchema,
    task: z.string().min(1),
    facilitation: facilitationSchema,
    yourRole: roleSchema,
    yourTeam: z.string().min(1),
    attendees: z.array(attendeeSchema),
    procedure: z.string().min(1),
    instructions: z.string().min(1),
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

/** A facilitator or working participant occupying a room. */
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
    stance: stanceSchema,
  })
  .strict();

/** A participant's own slice of room state, for resuming after a disconnect. */
export type MyState = z.infer<typeof myStateSchema>;

/** Full room aggregate persisted by the hub. */
export const roomSchema = z
  .object({
    id: idSchema,
    task: z.string().min(1),
    facilitation: facilitationSchema,
    status: roomStatusSchema,
    round: z.number().int().nonnegative(),
    summary: z.string().default(''),
    outcome: outcomeSchema.nullable(),
    createdAt: z.number().int().nonnegative(),
  })
  .strict();

/** The persisted state of a single room. */
export type Room = z.infer<typeof roomSchema>;

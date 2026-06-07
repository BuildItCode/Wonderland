import { z } from 'zod';

/** Schema for any opaque, hub-issued identifier (room, participant, message, token). */
export const idSchema = z.string().min(1);

/** Unique identifier for a room. */
export type RoomId = string;

/** Unique identifier for a participant within a room. */
export type ParticipantId = string;

/** Unique identifier for a single transcript message. */
export type MessageId = string;

/** Opaque bearer token that both addresses a room role and binds a stable identity. */
export type LinkToken = string;

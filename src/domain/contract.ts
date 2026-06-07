import { z } from 'zod';
import { idSchema } from './ids.js';

/** A single behavioural or interface term that parties negotiate over. */
export const contractTermSchema = z
  .object({
    key: z.string().min(1),
    detail: z.string().min(1),
  })
  .strict();

/** A negotiated interface or behavioural term. */
export type ContractTerm = z.infer<typeof contractTermSchema>;

/** The body of a proposed agreement: the interface surface plus behavioural terms. */
export const contractBodySchema = z
  .object({
    title: z.string().min(1),
    interface: z.string().min(1),
    terms: z.array(contractTermSchema).default([]),
  })
  .strict();

/** The content of a proposed agreement, independent of its version metadata. */
export type ContractBody = z.infer<typeof contractBodySchema>;

/** A versioned, signable agreement. An `accept` is a signature on a specific version. */
export const contractVersionSchema = z
  .object({
    version: z.number().int().positive(),
    proposedBy: idSchema,
    body: contractBodySchema,
    signatures: z.array(idSchema).default([]),
    supersededBy: z.number().int().positive().optional(),
  })
  .strict();

/** A single version of the contract under negotiation, with its signatures. */
export type ContractVersion = z.infer<typeof contractVersionSchema>;

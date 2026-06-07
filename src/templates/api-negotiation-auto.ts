import type { Template } from '../domain/index.js';

/**
 * api-negotiation, but the hub chairs it. No facilitator agent required: the hub
 * auto-advances the phase the moment the consensus rules are satisfied, posts the
 * next-phase prompt, and auto-declares on ratify. Purely rule-based (no LLM).
 */
export const API_NEGOTIATION_AUTO: Template = {
  id: 'api-negotiation-auto',
  phases: ['frame', 'propose', 'implement', 'ratify'],
  initialPhase: 'frame',
  exit: 'ratified-contract',
  roundCap: 8,
  autoFacilitate: true,
  allowedActs: {
    frame: ['inform', 'request'],
    propose: ['propose', 'accept', 'reject', 'inform', 'request'],
    implement: ['inform', 'request', 'failure'],
    ratify: ['accept', 'inform'],
  },
};

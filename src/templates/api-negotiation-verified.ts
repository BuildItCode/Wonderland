import type { Template } from '../domain/index.js';

/**
 * API negotiation that ends in a *verified* solution: parties agree a shared test
 * (carried on the contract), implement, then each contractor must pass verification
 * before the room can ratify.
 */
export const API_NEGOTIATION_VERIFIED: Template = {
  id: 'api-negotiation-verified',
  phases: ['frame', 'propose', 'implement', 'verify', 'ratify'],
  initialPhase: 'frame',
  exit: 'verified-solution',
  roundCap: 8,
  allowedActs: {
    frame: ['inform', 'request'],
    propose: ['propose', 'accept', 'reject', 'inform', 'request'],
    implement: ['inform', 'request', 'failure'],
    verify: ['inform', 'request', 'failure'],
    ratify: ['accept', 'inform'],
  },
};

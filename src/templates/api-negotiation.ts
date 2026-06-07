import type { Template } from '../domain/index.js';

/**
 * The flagship template: two services negotiate an API contract.
 *
 * M1 scope — linear phases ending at a ratified contract. The `verify` phase and
 * `verified-solution` exit are layered on in M3.
 */
export const API_NEGOTIATION: Template = {
  id: 'api-negotiation',
  phases: ['frame', 'propose', 'implement', 'ratify'],
  initialPhase: 'frame',
  exit: 'ratified-contract',
  roundCap: 8,
  allowedActs: {
    frame: ['inform', 'request'],
    propose: ['propose', 'accept', 'reject', 'inform', 'request'],
    implement: ['inform', 'request', 'failure'],
    ratify: ['accept', 'inform'],
  },
};

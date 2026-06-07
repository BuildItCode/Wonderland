import type { Template } from '../domain/index.js';

/**
 * A different protocol: two teams jointly debug a cross-boundary issue.
 *
 * Shorter than api-negotiation — there is no separate implement phase. Teams frame
 * the symptoms (failures allowed up front), agree a root-cause + fix as the contract,
 * and ratify. A tighter round cap reflects that debugging should converge fast.
 */
export const CROSS_TEAM_DEBUG: Template = {
  id: 'cross-team-debug',
  phases: ['frame', 'propose', 'ratify'],
  initialPhase: 'frame',
  exit: 'ratified-contract',
  roundCap: 4,
  allowedActs: {
    frame: ['inform', 'request', 'failure'],
    propose: ['propose', 'accept', 'reject', 'inform', 'request', 'failure'],
    ratify: ['accept', 'inform'],
  },
};

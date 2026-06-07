import type { Store } from '../domain/index.js';
import { HubEngine } from './hub-engine.js';
import {
  createNanoidIdGenerator,
  createSystemClock,
  type Clock,
  type IdGenerator,
} from './deps.js';

/** Options for assembling the engine; `clock` and `ids` default to production impls. */
export interface CreateEngineOptions {
  store: Store;
  clock?: Clock;
  ids?: IdGenerator;
}

/** Assemble the hub engine, defaulting the clock and id generator. */
export function createEngine(options: CreateEngineOptions): HubEngine {
  return new HubEngine({
    store: options.store,
    clock: options.clock ?? createSystemClock(),
    ids: options.ids ?? createNanoidIdGenerator(),
  });
}

export { HubEngine } from './hub-engine.js';
export * from './deps.js';

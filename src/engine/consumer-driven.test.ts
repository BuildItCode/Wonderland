import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase, createStore } from '../store/index.js';
import { createTemplateRegistry } from '../templates/index.js';
import { createEngine, type IdGenerator } from './index.js';
import type { RoleLink, Store } from '../domain/index.js';
import { HubEngine } from './hub-engine.js';

function seqIdGenerator(): IdGenerator {
  let r = 0;
  let p = 0;
  let t = 0;
  let m = 0;
  return {
    room: () => `r${++r}`,
    participant: () => `p${++p}`,
    token: () => `tok${++t}`,
    message: () => `m${++m}`,
  };
}

let db: DatabaseSync;
let store: Store;
let engine: HubEngine;
let links: RoleLink[];

function tokenFor(team: string): string {
  const link = links.find((l) => l.team === team);
  if (!link) {
    throw new Error(`no link for ${team}`);
  }
  return link.token;
}

// Team B is the consumer of Team A's API in these scenarios.
beforeEach(() => {
  db = openDatabase(':memory:');
  store = createStore(db);
  engine = createEngine({
    store,
    templates: createTemplateRegistry(),
    clock: { now: () => 1000 },
    ids: seqIdGenerator(),
  });
  links = engine.createRoom({
    task: 'integrate payments',
    templateId: 'api-negotiation-verified',
    parties: [
      { team: 'platform', role: 'facilitator' },
      { team: 'A', role: 'contractor' },
      { team: 'B', role: 'contractor' },
    ],
  }).links;
  engine.advancePhase(tokenFor('platform')); // frame -> propose
});

afterEach(() => {
  db.close();
});

describe('consumer-driven contract (AC5, AC10)', () => {
  it('lets the consumer declare the test; once both sign, the room can implement', () => {
    // consumer B declares the expectation (the shared test) in its proposal
    engine.post(tokenFor('B'), 'propose', {
      body: {
        title: 'Charges API',
        interface: 'POST /charges',
        verification: 'Consumer Pact: charge succeeds and a webhook is delivered within 5s.',
      },
    });
    // provider A agrees, consumer B agrees
    engine.post(tokenFor('A'), 'accept', { version: 1 });
    engine.post(tokenFor('B'), 'accept', { version: 1 });

    const latest = store.contracts.getLatest('r1');
    expect(latest?.signatures).toHaveLength(2);
    expect(latest?.body.verification).toContain('Consumer Pact');

    expect(engine.advancePhase(tokenFor('platform'))).toEqual({ phase: 'implement' });
  });

  it('does not let a provider-only test satisfy the gate', () => {
    // provider A proposes its own test, only A signs
    engine.post(tokenFor('A'), 'propose', {
      body: { title: 'Charges API', interface: 'POST /charges', verification: 'provider self-test' },
    });
    engine.post(tokenFor('A'), 'accept', { version: 1 });

    expect(engine.advancePhase(tokenFor('platform'))).toEqual({
      blocked: 'consensus',
      missing: ['p3'],
    });
  });

  it('blocks implementing a verified-solution contract with no agreed test', () => {
    engine.post(tokenFor('A'), 'propose', { body: { title: 'Charges API', interface: 'POST /charges' } });
    engine.post(tokenFor('A'), 'accept', { version: 1 });
    engine.post(tokenFor('B'), 'accept', { version: 1 });

    expect(() => engine.advancePhase(tokenFor('platform'))).toThrow(/test artifact/);
  });
});

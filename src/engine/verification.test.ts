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

/** Drive the verified template to the verify phase with a signed v1. */
function reachVerify(verification?: string): void {
  const fac = tokenFor('platform');
  engine.advancePhase(fac); // frame -> propose
  engine.post(tokenFor('A'), 'propose', {
    body: {
      title: 'Charges API',
      interface: 'POST /charges',
      ...(verification ? { verification } : {}),
    },
  });
  engine.post(tokenFor('A'), 'accept', { version: 1 });
  engine.post(tokenFor('B'), 'accept', { version: 1 });
  engine.advancePhase(fac); // propose -> implement
  engine.advancePhase(fac); // implement -> verify
}

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
});

afterEach(() => {
  db.close();
});

describe('verification gate (AC10)', () => {
  it('blocks ratify until every contractor passes, then verifies', () => {
    reachVerify('Run the shared Pact suite; both sides green.');

    engine.submitVerification(tokenFor('A'), 1, true);
    expect(engine.advancePhase(tokenFor('platform'))).toMatchObject({ blocked: 'verification' });

    engine.submitVerification(tokenFor('B'), 1, true);
    expect(engine.advancePhase(tokenFor('platform'))).toEqual({ phase: 'ratify' });

    const { doc } = engine.declare(tokenFor('platform'), 'verified');
    expect(doc).toContain('— verified');
    expect(doc).toContain('## Verification');
    expect(doc).toContain('Run the shared Pact suite');
  });

  it('refuses to declare verified while a pass is missing', () => {
    reachVerify('shared test');
    engine.submitVerification(tokenFor('A'), 1, true);
    expect(() => engine.declare(tokenFor('platform'), 'verified')).toThrow(/missing pass/);
  });

  it('refuses verification when no test artifact was agreed', () => {
    // sign a no-artifact contract, then force into verify to exercise the defensive guard
    engine.advancePhase(tokenFor('platform'));
    engine.post(tokenFor('A'), 'propose', { body: { title: 'v1', interface: 'x' } });
    engine.post(tokenFor('A'), 'accept', { version: 1 });
    engine.post(tokenFor('B'), 'accept', { version: 1 });
    store.rooms.setPhase('r1', 'verify');
    expect(() => engine.submitVerification(tokenFor('A'), 1, true)).toThrow(/No agreed test artifact/);
  });
});

describe('submitVerification authority', () => {
  it('rejects submission outside the verify phase', () => {
    expect(() => engine.submitVerification(tokenFor('A'), 1, true)).toThrow(/verify phase/);
  });

  it('rejects a non-contractor', () => {
    reachVerify('shared test');
    expect(() => engine.submitVerification(tokenFor('platform'), 1, true)).toThrow(/contractors/);
  });
});

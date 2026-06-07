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

/** Drive the room to the implement phase with a signed v1 contract. */
function reachImplement(): void {
  store.rooms.setPhase('r1', 'propose');
  engine.post(tokenFor('A'), 'propose', { body: { title: 'v1', interface: 'POST /charges' } });
  engine.post(tokenFor('A'), 'accept', { version: 1 });
  engine.post(tokenFor('B'), 'accept', { version: 1 });
  engine.advancePhase(tokenFor('platform'));
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
    templateId: 'api-negotiation',
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

describe('failure-triggered regression (AC8)', () => {
  it('a fatal failure in implement re-opens propose with a fresh re-signable version', () => {
    reachImplement();
    engine.post(tokenFor('B'), 'failure', { reason: 'webhook fires before commit', fatal: true });

    expect(store.rooms.get('r1')?.phase).toBe('propose');
    expect(store.rooms.get('r1')?.round).toBe(1);
    const latest = store.contracts.getLatest('r1');
    expect(latest).toMatchObject({ version: 2, signatures: [] });
    expect(store.contracts.getVersion('r1', 1)?.supersededBy).toBe(2);
  });

  it('forces re-signature: advance stays blocked until the new version is signed', () => {
    reachImplement();
    engine.post(tokenFor('B'), 'failure', { reason: 'bad', fatal: true });

    expect(engine.advancePhase(tokenFor('platform'))).toMatchObject({ blocked: 'consensus' });
    engine.post(tokenFor('A'), 'accept', { version: 2 });
    engine.post(tokenFor('B'), 'accept', { version: 2 });
    expect(engine.advancePhase(tokenFor('platform'))).toEqual({ phase: 'implement' });
  });

  it('a non-fatal failure does not regress', () => {
    reachImplement();
    engine.post(tokenFor('B'), 'failure', { reason: 'minor', fatal: false });
    expect(store.rooms.get('r1')?.phase).toBe('implement');
    expect(store.rooms.get('r1')?.round).toBe(0);
  });

  it('exceeding the round cap closes the room as unsolvable', () => {
    reachImplement();
    store.rooms.setRound('r1', 8); // api-negotiation roundCap = 8
    engine.post(tokenFor('B'), 'failure', { reason: 'irreconcilable', fatal: true });
    const room = store.rooms.get('r1');
    expect(room?.outcome).toBe('unsolvable');
    expect(room?.phase).toBe('closed');
  });
});

describe('explicit regressPhase', () => {
  it('lets the facilitator regress and records the reason', () => {
    reachImplement();
    expect(engine.regressPhase(tokenFor('platform'), 'propose', 'commit ordering mismatch')).toEqual({
      phase: 'propose',
    });
    expect(store.rooms.get('r1')?.round).toBe(1);
    const recorded = engine
      .readRoom(tokenFor('platform'))
      .some(
        (m) =>
          m.act === 'inform' &&
          m.payload.kind === 'note' &&
          m.payload.text.includes('Regression to propose: commit ordering mismatch'),
      );
    expect(recorded).toBe(true);
  });

  it('rejects a non-facilitator', () => {
    reachImplement();
    expect(() => engine.regressPhase(tokenFor('A'), 'propose', 'x')).toThrow(/facilitator/);
  });

  it('rejects regressing to a non-earlier phase', () => {
    reachImplement();
    expect(() => engine.regressPhase(tokenFor('platform'), 'ratify', 'x')).toThrow(/Cannot regress/);
  });
});

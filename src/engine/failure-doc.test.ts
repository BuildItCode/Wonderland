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

describe('declare(unsolvable)', () => {
  it('emits a failure doc with blockers + human next-actions, then invalidates links', () => {
    reachImplement();
    engine.post(tokenFor('B'), 'failure', { reason: 'cannot expose webhook externally', fatal: false });

    const { doc } = engine.declare(tokenFor('platform'), 'unsolvable');
    expect(doc).toContain('— unsolvable');
    expect(doc).toContain('## Blocking Issues');
    expect(doc).toContain('cannot expose webhook externally');
    expect(doc).toContain('## Recommended Human Action');

    expect(() => engine.post(tokenFor('A'), 'inform', { kind: 'note', text: 'x' })).toThrow(/closed/);
    // doc is retrievable post-close
    expect(engine.readDoc(tokenFor('A')).doc).toBe(doc);
  });
});

describe('round-cap auto-close', () => {
  it('persists a failure doc capturing the blocker', () => {
    reachImplement();
    store.rooms.setRound('r1', 8);
    engine.post(tokenFor('B'), 'failure', { reason: 'irreconcilable difference', fatal: true });

    expect(store.rooms.get('r1')?.outcome).toBe('unsolvable');
    const doc = engine.readDoc(tokenFor('A')).doc;
    expect(doc).toContain('— unsolvable');
    expect(doc).toContain('irreconcilable difference');
  });
});

describe('readDoc', () => {
  it('throws before a doc has been finalized', () => {
    expect(() => engine.readDoc(tokenFor('A'))).toThrow(/No document/);
  });
});

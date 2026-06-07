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

describe('advancePhase — authority', () => {
  it('rejects a non-facilitator', () => {
    expect(() => engine.advancePhase(tokenFor('A'))).toThrow(/facilitator/);
  });

  it('advances frame -> propose with no contract yet', () => {
    expect(engine.advancePhase(tokenFor('platform'))).toEqual({ phase: 'propose' });
  });

  it('throws once past the final phase', () => {
    store.rooms.setPhase('r1', 'ratify');
    expect(() => engine.advancePhase(tokenFor('platform'))).toThrow(/final phase/);
  });
});

describe('advancePhase — consensus gate (AC5)', () => {
  beforeEach(() => {
    store.rooms.setPhase('r1', 'propose');
    engine.post(tokenFor('A'), 'propose', { body: { title: 'v1', interface: 'POST /charges' } });
  });

  it('blocks while a contractor has not signed, listing who is missing', () => {
    engine.post(tokenFor('A'), 'accept', { version: 1 });
    const result = engine.advancePhase(tokenFor('platform'));
    expect(result).toEqual({ blocked: 'consensus', missing: ['p3'] });
    expect(store.rooms.get('r1')?.phase).toBe('propose');
  });

  it('advances once every contractor has signed', () => {
    engine.post(tokenFor('A'), 'accept', { version: 1 });
    engine.post(tokenFor('B'), 'accept', { version: 1 });
    expect(engine.advancePhase(tokenFor('platform'))).toEqual({ phase: 'implement' });
  });
});

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

describe('post — phase gating (AC4)', () => {
  it('accepts a capability inform in the frame phase', () => {
    const result = engine.post(tokenFor('A'), 'inform', {
      kind: 'capability',
      service: 'payments',
      surface: 'POST /charges',
    });
    expect(result.messageId).toBe('m1');
  });

  it('rejects an act not allowed in the current phase', () => {
    expect(() =>
      engine.post(tokenFor('A'), 'propose', { body: { title: 'v1', interface: 'x' } }),
    ).toThrow(/not allowed in phase 'frame'/);
  });

  it('rejects a malformed payload', () => {
    expect(() => engine.post(tokenFor('A'), 'inform', { kind: 'capability' })).toThrow(
      /Invalid inform/,
    );
  });
});

describe('read_room — delta cursor', () => {
  it('returns only messages after the cursor', () => {
    const first = engine.post(tokenFor('A'), 'inform', { kind: 'note', text: 'one' });
    engine.post(tokenFor('B'), 'inform', { kind: 'note', text: 'two' });

    expect(engine.readRoom(tokenFor('A')).map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(engine.readRoom(tokenFor('A'), first.messageId).map((m) => m.id)).toEqual(['m2']);
  });
});

describe('set_status', () => {
  it('updates the caller presence', () => {
    engine.setStatus(tokenFor('A'), 'implementing');
    expect(engine.myState(tokenFor('A')).status).toBe('implementing');
  });
});

describe('contract side effects', () => {
  beforeEach(() => {
    store.rooms.setPhase('r1', 'propose');
  });

  it('propose creates a new contract version', () => {
    engine.post(tokenFor('A'), 'propose', { body: { title: 'v1', interface: 'POST /charges' } });
    const latest = store.contracts.getLatest('r1');
    expect(latest).toMatchObject({ version: 1, proposedBy: 'p2' });
  });

  it('accept signs the referenced version and surfaces in my_state', () => {
    engine.post(tokenFor('A'), 'propose', { body: { title: 'v1', interface: 'x' } });
    engine.post(tokenFor('A'), 'accept', { version: 1 });
    expect(engine.myState(tokenFor('A')).signedVersion).toBe(1);
  });

  it('rejects accepting a non-existent version', () => {
    expect(() => engine.post(tokenFor('A'), 'accept', { version: 99 })).toThrow(
      /No contract version 99/,
    );
  });
});

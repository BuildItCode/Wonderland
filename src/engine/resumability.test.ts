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

describe('my_state catch-up (AC6, AC9)', () => {
  it('reconstructs the same identity, status, and messages on reconnect', () => {
    const a = tokenFor('A');
    const joined = engine.join(a);
    engine.setStatus(a, 'implementing');
    engine.post(a, 'inform', { kind: 'capability', service: 'payments', surface: 'POST /charges' });

    // a fresh call with the same link behaves like a reconnect
    const state = engine.myState(a);
    expect(state.me).toBe(joined.participantId);
    expect(state.status).toBe('implementing');
    expect(state.myMessages.map((m) => m.id)).toEqual(['m1']);
    expect(state.signedVersion).toBeNull();
    expect(state.assignedTasks).toEqual([]);
  });

  it('surfaces signed version and assigned tasks once the contractor commits', () => {
    const a = tokenFor('A');
    store.rooms.setPhase('r1', 'propose');
    engine.post(a, 'propose', {
      body: {
        title: 'Charges API',
        interface: 'POST /charges',
        terms: [{ key: 'idempotency', detail: 'Idempotency-Key header required' }],
      },
    });
    engine.post(a, 'accept', { version: 1 });

    const state = engine.myState(a);
    expect(state.signedVersion).toBe(1);
    expect(state.assignedTasks).toEqual(['idempotency: Idempotency-Key header required']);
  });

  it('shows no assigned tasks to a contractor who has not signed', () => {
    const a = tokenFor('A');
    const b = tokenFor('B');
    store.rooms.setPhase('r1', 'propose');
    engine.post(a, 'propose', {
      body: { title: 'v1', interface: 'x', terms: [{ key: 'k', detail: 'd' }] },
    });
    engine.post(a, 'accept', { version: 1 });

    expect(engine.myState(b).assignedTasks).toEqual([]);
  });
});

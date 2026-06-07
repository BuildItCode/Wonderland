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
    task: 'Checkout needs to charge cards and receive payment events',
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

describe('full api-negotiation run (AC7, AC12)', () => {
  it('reaches a ratified doc with contract + task split, then invalidates links', () => {
    const fac = tokenFor('platform');
    const a = tokenFor('A');
    const b = tokenFor('B');

    engine.join(fac);
    engine.join(a);
    engine.join(b);

    // frame
    engine.post(a, 'inform', { kind: 'capability', service: 'payments', surface: 'POST /charges' });
    engine.post(b, 'inform', { kind: 'capability', service: 'checkout', surface: 'needs charge + events' });
    engine.updateSummary(fac, 'Gap: payments webhooks are internal-only.');
    expect(engine.advancePhase(fac)).toEqual({ phase: 'propose' });

    // propose + renegotiate
    engine.post(a, 'propose', {
      body: { title: 'Charges API', interface: 'POST /charges', terms: [] },
    });
    engine.post(b, 'reject', { version: 1, reason: 'need webhook retry policy' });
    engine.post(a, 'propose', {
      body: {
        title: 'Charges API v2',
        interface: 'POST /charges + webhooks',
        terms: [
          { key: 'idempotency', detail: 'Idempotency-Key header required' },
          { key: 'retry', detail: 'webhooks retried 3x with backoff' },
        ],
      },
    });
    engine.post(a, 'accept', { version: 2 });
    engine.post(b, 'accept', { version: 2 });
    expect(engine.advancePhase(fac)).toEqual({ phase: 'implement' });

    // implement
    engine.setStatus(a, 'implementing');
    engine.post(a, 'inform', { kind: 'result', summary: 'exposed webhook + idempotency' });
    engine.post(b, 'inform', { kind: 'result', summary: 'charge client + webhook receiver' });
    expect(engine.advancePhase(fac)).toEqual({ phase: 'ratify' });

    // ratify + close
    const { doc } = engine.declare(fac, 'ratified');
    expect(doc).toContain('Agreed Contract (v2)');
    expect(doc).toContain('Charges API v2');
    expect(doc).toContain('POST /charges + webhooks');
    expect(doc).toContain('retry');
    expect(doc).toContain('## Task Split');
    expect(doc).toContain('- **A**');
    expect(doc).toContain('- **B**');

    // AC12: links invalidated
    expect(store.rooms.get('r1')?.phase).toBe('closed');
    expect(() => engine.post(a, 'inform', { kind: 'note', text: 'late' })).toThrow(/closed/);
    expect(() => engine.join(a)).toThrow(/closed/);
    expect(() => engine.declare(fac, 'ratified')).toThrow(/already closed/);
    // read access survives for the post-mortem record
    expect(engine.readRoom(a).length).toBeGreaterThan(0);
  });
});

describe('declare guards', () => {
  it('refuses to ratify without an agreed contract', () => {
    store.rooms.setPhase('r1', 'propose');
    expect(() => engine.declare(tokenFor('platform'), 'ratified')).toThrow(/without an agreed/);
  });

  it('refuses to ratify while signatures are missing', () => {
    store.rooms.setPhase('r1', 'propose');
    engine.post(tokenFor('A'), 'propose', { body: { title: 'v1', interface: 'x' } });
    engine.post(tokenFor('A'), 'accept', { version: 1 });
    expect(() => engine.declare(tokenFor('platform'), 'ratified')).toThrow(/missing signatures/);
  });

  it('rejects a non-facilitator updating the summary', () => {
    expect(() => engine.updateSummary(tokenFor('A'), 'sneaky')).toThrow(/facilitator/);
  });
});

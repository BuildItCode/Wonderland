import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase, createStore } from '../store/index.js';
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
  engine = createEngine({ store, clock: { now: () => 1000 }, ids: seqIdGenerator() });
  links = engine.createRoom({
    task: 'integrate payments',
    facilitation: 'agent',
    parties: [
      { team: 'platform', role: 'facilitator' },
      { team: 'A', role: 'participant' },
      { team: 'B', role: 'participant' },
    ],
  }).links;
});

afterEach(() => {
  db.close();
});

describe('full agent run (resolved)', () => {
  it('reaches a resolved doc with the agreed solution + sign-off, then invalidates links', () => {
    const fac = tokenFor('platform');
    const a = tokenFor('A');
    const b = tokenFor('B');

    engine.join(fac);
    engine.join(a);
    engine.join(b);

    engine.post(a, 'say', { text: 'what surface do you need?' });
    engine.post(a, 'propose', {
      title: 'Charges API',
      text: 'POST /charges with an Idempotency-Key header; webhooks retried 3x.',
    });
    engine.post(a, 'agree', {});
    engine.post(b, 'agree', { note: 'works for checkout' });
    engine.updateSummary(fac, 'Agreed on the charges endpoint.');

    const { doc } = engine.declare(fac, 'resolved');
    expect(doc).toContain('# integrate payments — resolved');
    expect(doc).toContain('## Agreed Solution');
    expect(doc).toContain('Charges API');
    expect(doc).toContain('POST /charges');
    expect(doc).toContain('## Sign-off');
    expect(doc).toContain('- **A**: agreed');
    expect(doc).toContain('- **B**: agreed');

    // links invalidated after close
    expect(store.rooms.get('r1')?.status).toBe('closed');
    expect(() => engine.post(a, 'say', { text: 'late' })).toThrow(/closed/);
    expect(() => engine.join(a)).toThrow(/closed/);
    expect(() => engine.declare(fac, 'resolved')).toThrow(/already closed/);
    // read access survives for the post-mortem record
    expect(engine.readDoc(a).doc).toBe(doc);
  });
});

describe('declare guards', () => {
  it('refuses to resolve without a proposal', () => {
    expect(() => engine.declare(tokenFor('platform'), 'resolved')).toThrow(/Cannot resolve/);
  });

  it('refuses to resolve while a participant has not agreed', () => {
    engine.post(tokenFor('A'), 'propose', { text: 'plan' });
    engine.post(tokenFor('A'), 'agree', {});
    expect(() => engine.declare(tokenFor('platform'), 'resolved')).toThrow(/pending: p3/);
  });

  it("does not count the facilitator's agreement toward the gate", () => {
    engine.post(tokenFor('A'), 'propose', { text: 'plan' });
    engine.post(tokenFor('A'), 'agree', {});
    engine.post(tokenFor('platform'), 'agree', {}); // facilitator agreeing must not substitute for B
    expect(() => engine.declare(tokenFor('platform'), 'resolved')).toThrow(/pending: p3/);
  });

  it('allows unsolvable to be declared at any time', () => {
    const { doc } = engine.declare(tokenFor('platform'), 'unsolvable');
    expect(doc).toContain('— unsolvable');
  });

  it('rejects a non-facilitator declaring or updating the summary', () => {
    expect(() => engine.declare(tokenFor('A'), 'unsolvable')).toThrow(/facilitator/);
    expect(() => engine.updateSummary(tokenFor('A'), 'sneaky')).toThrow(/facilitator/);
  });
});

describe('readDoc', () => {
  it('throws before a doc has been finalized', () => {
    expect(() => engine.readDoc(tokenFor('A'))).toThrow(/No document/);
  });
});

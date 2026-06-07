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
  // an agent room never auto-closes, so consensus state can be inspected mid-flight
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

describe('post — speech acts', () => {
  it('records a say then a propose, bumping the round', () => {
    expect(engine.post(tokenFor('A'), 'say', { text: 'ready' }).messageId).toBe('m1');
    engine.post(tokenFor('A'), 'propose', { title: 'sum', text: '1 + 1 = 2' });
    expect(store.rooms.get('r1')?.round).toBe(1);
  });

  it('rejects a malformed payload', () => {
    expect(() => engine.post(tokenFor('A'), 'propose', {})).toThrow(/Invalid propose/);
    expect(() => engine.post(tokenFor('A'), 'block', {})).toThrow(/Invalid block/);
  });

  it('accepts a JSON-string payload (some MCP clients stringify it)', () => {
    const id = engine.post(tokenFor('A'), 'say', JSON.stringify({ text: 'hi' })).messageId;
    expect(engine.readRoom(tokenFor('A')).find((m) => m.id === id)?.act).toBe('say');
  });
});

describe('my_state — stance on the current proposal', () => {
  it('reflects agree and block, and resets when a new proposal supersedes', () => {
    engine.post(tokenFor('A'), 'propose', { text: 'plan v1' });
    engine.post(tokenFor('A'), 'agree', {});
    engine.post(tokenFor('B'), 'block', { reason: 'needs retries' });
    expect(engine.myState(tokenFor('A')).stance).toBe('agree');
    expect(engine.myState(tokenFor('B')).stance).toBe('block');

    // a fresh proposal clears every stance
    engine.post(tokenFor('B'), 'propose', { text: 'plan v2 with retries' });
    expect(engine.myState(tokenFor('A')).stance).toBe('none');
    expect(engine.myState(tokenFor('B')).stance).toBe('none');
  });
});

describe('snapshot — pending + agreement', () => {
  it('tracks who still needs to agree', () => {
    engine.post(tokenFor('A'), 'propose', { text: 'plan' });
    engine.post(tokenFor('A'), 'agree', {});
    const snap = engine.roomSnapshot(tokenFor('platform'));
    expect(snap.proposal?.version).toBe(1);
    expect(snap.proposal?.agreed).toEqual(['p2']);
    expect(snap.pending).toEqual(['p3']);
  });
});

describe('read_room — delta cursor', () => {
  it('returns only messages after the cursor', () => {
    const first = engine.post(tokenFor('A'), 'say', { text: 'one' });
    engine.post(tokenFor('B'), 'say', { text: 'two' });
    expect(engine.readRoom(tokenFor('A')).map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(engine.readRoom(tokenFor('A'), first.messageId).map((m) => m.id)).toEqual(['m2']);
  });
});

describe('set_status', () => {
  it('updates the caller presence', () => {
    engine.setStatus(tokenFor('A'), 'thinking');
    expect(engine.myState(tokenFor('A')).status).toBe('thinking');
  });
});

describe('closed room', () => {
  it('rejects posting after the room is declared', () => {
    engine.declare(tokenFor('platform'), 'unsolvable');
    expect(() => engine.post(tokenFor('A'), 'say', { text: 'late' })).toThrow(/closed/);
  });
});

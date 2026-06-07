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

const agentParties = [
  { team: 'platform', role: 'facilitator' as const },
  { team: 'A', role: 'participant' as const },
  { team: 'B', role: 'participant' as const },
];
const autoParties = [
  { team: 'C', role: 'participant' as const },
  { team: 'D', role: 'participant' as const },
];

let db: DatabaseSync;
let store: Store;
let engine: HubEngine;

function tokenFor(links: RoleLink[], team: string): string {
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
});

afterEach(() => {
  db.close();
});

describe('multiple rooms on one hub', () => {
  it('keeps rooms isolated and scopes tokens to their own room', () => {
    const roomA = engine.createRoom({ task: 'integrate payments', facilitation: 'agent', parties: agentParties });
    const roomB = engine.createRoom({ task: 'debug settlement', facilitation: 'auto', parties: autoParties });
    expect(roomA.roomId).not.toBe(roomB.roomId);

    // drive room A only (agent room: stays open, but consensus is tracked)
    engine.post(tokenFor(roomA.links, 'A'), 'propose', { text: 'charges API' });
    engine.post(tokenFor(roomA.links, 'A'), 'agree', {});
    engine.post(tokenFor(roomA.links, 'B'), 'agree', {});

    const a = engine.roomSnapshot(tokenFor(roomA.links, 'platform'));
    const b = engine.roomSnapshot(tokenFor(roomB.links, 'C'));

    expect(a.proposal?.version).toBe(1);
    expect(a.pending).toEqual([]);
    // room B is untouched
    expect(b.round).toBe(0);
    expect(b.proposal).toBeNull();
    expect(b.status).toBe('open');
  });

  it('resolves each token to its own room and facilitation mode', () => {
    const roomA = engine.createRoom({ task: 'integrate payments', facilitation: 'agent', parties: agentParties });
    const roomB = engine.createRoom({ task: 'debug settlement', facilitation: 'auto', parties: autoParties });

    const fromA = engine.resolveLink(tokenFor(roomA.links, 'A'));
    const fromB = engine.resolveLink(tokenFor(roomB.links, 'C'));

    expect(fromA.roomId).toBe(roomA.roomId);
    expect(fromA.facilitation).toBe('agent');
    expect(fromB.roomId).toBe(roomB.roomId);
    expect(fromB.facilitation).toBe('auto');
    expect(fromA.roomId).not.toBe(fromB.roomId);
  });
});

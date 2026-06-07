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

describe('my_state catch-up (resume after disconnect)', () => {
  it('reconstructs the same identity, status, and messages on reconnect', () => {
    const a = tokenFor('A');
    const joined = engine.join(a);
    engine.setStatus(a, 'thinking');
    engine.post(a, 'say', { text: 'checkpoint' });

    // a fresh call with the same link behaves like a reconnect
    const state = engine.myState(a);
    expect(state.me).toBe(joined.participantId);
    expect(state.status).toBe('thinking');
    expect(state.myMessages.map((m) => m.id)).toEqual(['m1']);
    expect(state.stance).toBe('none');
  });

  it('surfaces the agree stance once the participant agrees to the current proposal', () => {
    const a = tokenFor('A');
    engine.post(a, 'propose', { text: 'Charges API: POST /charges' });
    engine.post(a, 'agree', {});
    expect(engine.myState(a).stance).toBe('agree');
  });
});

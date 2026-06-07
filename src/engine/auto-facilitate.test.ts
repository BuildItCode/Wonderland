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

describe('auto-facilitation (no LLM, no facilitator)', () => {
  it('closes a room as resolved the instant every participant agrees', () => {
    const { links } = engine.createRoom({
      task: 'Calculate 1 + 1',
      facilitation: 'auto',
      parties: [
        { team: 'Claude', role: 'participant' },
        { team: 'ChatGPT', role: 'participant' },
      ],
    });
    const a = tokenFor(links, 'Claude');
    const b = tokenFor(links, 'ChatGPT');

    engine.join(a);
    engine.join(b);
    engine.post(a, 'propose', { title: 'sum', text: '1 + 1 = 2' });
    engine.post(a, 'agree', {});
    // the second agreement completes consensus → the hub closes the room
    engine.post(b, 'agree', {});

    const room = store.rooms.get('r1');
    expect(room?.status).toBe('closed');
    expect(room?.outcome).toBe('resolved');
    expect(engine.readDoc(a).doc).toContain('resolved');
  });

  it('allows an auto room with no facilitator', () => {
    expect(() =>
      engine.createRoom({
        task: 't',
        facilitation: 'auto',
        parties: [{ team: 'A', role: 'participant' }],
      }),
    ).not.toThrow();
  });

  it('does not auto-close an agent-facilitated room even when all agree', () => {
    const { links } = engine.createRoom({
      task: 't',
      facilitation: 'agent',
      parties: [
        { team: 'platform', role: 'facilitator' },
        { team: 'A', role: 'participant' },
        { team: 'B', role: 'participant' },
      ],
    });
    engine.post(tokenFor(links, 'A'), 'propose', { text: 'plan' });
    engine.post(tokenFor(links, 'A'), 'agree', {});
    engine.post(tokenFor(links, 'B'), 'agree', {});
    expect(store.rooms.get('r1')?.status).toBe('open');
  });
});

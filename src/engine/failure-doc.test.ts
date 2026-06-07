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

describe('declare(unsolvable)', () => {
  it('emits a failure doc with blockers + human next-actions, then invalidates links', () => {
    const { links } = engine.createRoom({
      task: 'integrate payments',
      facilitation: 'agent',
      parties: [
        { team: 'platform', role: 'facilitator' },
        { team: 'A', role: 'participant' },
        { team: 'B', role: 'participant' },
      ],
    });
    engine.post(tokenFor(links, 'A'), 'propose', { text: 'expose the webhook externally' });
    engine.post(tokenFor(links, 'B'), 'block', { reason: 'cannot expose webhook externally' });

    const { doc } = engine.declare(tokenFor(links, 'platform'), 'unsolvable');
    expect(doc).toContain('— unsolvable');
    expect(doc).toContain('## Last Proposal');
    expect(doc).toContain('## Blocking Issues');
    expect(doc).toContain('cannot expose webhook externally');
    expect(doc).toContain('## Recommended Human Action');

    expect(() => engine.post(tokenFor(links, 'A'), 'say', { text: 'x' })).toThrow(/closed/);
    expect(engine.readDoc(tokenFor(links, 'A')).doc).toBe(doc);
  });
});

describe('auto room — proposal cap', () => {
  it('closes unsolvable once the proposal cap is exceeded without agreement', () => {
    const { links } = engine.createRoom({
      task: 'pick a name',
      facilitation: 'auto',
      parties: [
        { team: 'A', role: 'participant' },
        { team: 'B', role: 'participant' },
      ],
    });
    const a = tokenFor(links, 'A');
    // 9 proposals (> cap of 8) with no agreement → the hub gives up
    for (let i = 1; i <= 9; i += 1) {
      if (store.rooms.get('r1')?.status === 'closed') {
        break;
      }
      engine.post(a, 'propose', { text: `candidate ${i}` });
    }
    const room = store.rooms.get('r1');
    expect(room?.status).toBe('closed');
    expect(room?.outcome).toBe('unsolvable');
    expect(engine.readDoc(a).doc).toContain('— unsolvable');
  });
});

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

function discussionRoom(): RoleLink[] {
  return engine.createRoom({
    task: 'brainstorm a name',
    kind: 'discussion',
    facilitation: 'auto',
    parties: [
      { team: 'A', role: 'participant' },
      { team: 'B', role: 'participant' },
    ],
  }).links;
}

beforeEach(() => {
  db = openDatabase(':memory:');
  store = createStore(db);
  engine = createEngine({ store, clock: { now: () => 1000 }, ids: seqIdGenerator() });
});

afterEach(() => {
  db.close();
});

describe('open discussion rooms', () => {
  it('stays open even when every participant agrees', () => {
    const links = discussionRoom();
    const a = tokenFor(links, 'A');
    const b = tokenFor(links, 'B');
    engine.post(a, 'propose', { text: 'call it Wonderland' }); // proposer auto-agrees
    engine.post(b, 'agree', {});

    const snap = engine.roomSnapshot(a);
    expect(snap.status).toBe('open'); // a decision room would have closed here
    expect(snap.pending).toEqual([]); // ...even though everyone has agreed
  });

  it('closes only when a participant declares, and any participant may do so', () => {
    const links = discussionRoom();
    const a = tokenFor(links, 'A');
    engine.post(a, 'propose', { text: 'call it Wonderland' });

    // a non-facilitator participant can close a discussion room at any time
    const { doc } = engine.declare(a, 'resolved');
    expect(doc).toContain('— resolved');
    expect(store.rooms.get('r1')?.status).toBe('closed');
    expect(store.rooms.get('r1')?.outcome).toBe('resolved');
  });

  it('does not require full agreement to close', () => {
    const links = discussionRoom();
    engine.post(tokenFor(links, 'A'), 'propose', { text: 'option one' });
    // B never agreed; a participant can still close it
    expect(() => engine.declare(tokenFor(links, 'B'), 'resolved')).not.toThrow();
    expect(store.rooms.get('r1')?.status).toBe('closed');
  });
});

describe('decision rooms (unchanged)', () => {
  it('still restricts declare to the facilitator', () => {
    const { links } = engine.createRoom({
      task: 'pick a stack',
      kind: 'decision',
      facilitation: 'auto',
      parties: [
        { team: 'A', role: 'participant' },
        { team: 'B', role: 'participant' },
      ],
    });
    engine.post(tokenFor(links, 'A'), 'propose', { text: 'go with X' });
    // no facilitator in an auto decision room, so a participant cannot declare
    expect(() => engine.declare(tokenFor(links, 'A'), 'resolved')).toThrow(/facilitator/);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase, createStore } from '../store/index.js';
import { createTemplateRegistry } from '../templates/index.js';
import { createEngine, type IdGenerator } from './index.js';
import type { CreateRoomInput, RoleLink, Store } from '../domain/index.js';
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

const parties: CreateRoomInput['parties'] = [
  { team: 'platform', role: 'facilitator' },
  { team: 'A', role: 'contractor' },
  { team: 'B', role: 'contractor' },
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
  engine = createEngine({
    store,
    templates: createTemplateRegistry(),
    clock: { now: () => 1000 },
    ids: seqIdGenerator(),
  });
});

afterEach(() => {
  db.close();
});

describe('multiple rooms on one hub', () => {
  it('keeps rooms isolated and scopes tokens to their own room', () => {
    const roomA = engine.createRoom({ task: 'integrate payments', templateId: 'api-negotiation', parties });
    const roomB = engine.createRoom({ task: 'debug settlement', templateId: 'cross-team-debug', parties });
    expect(roomA.roomId).not.toBe(roomB.roomId);

    // drive room A only
    engine.advancePhase(tokenFor(roomA.links, 'platform'));
    engine.post(tokenFor(roomA.links, 'A'), 'propose', { body: { title: 'v1', interface: 'POST /charges' } });
    engine.post(tokenFor(roomA.links, 'A'), 'accept', { version: 1 });
    engine.post(tokenFor(roomA.links, 'B'), 'accept', { version: 1 });

    const a = engine.roomSnapshot(tokenFor(roomA.links, 'platform'));
    const b = engine.roomSnapshot(tokenFor(roomB.links, 'platform'));

    expect(a.phase).toBe('propose');
    expect(a.contract?.version).toBe(1);
    // room B is untouched
    expect(b.phase).toBe('frame');
    expect(b.round).toBe(0);
    expect(b.contract).toBeNull();
  });

  it('resolves each token to its own room and template', () => {
    const roomA = engine.createRoom({ task: 'integrate payments', templateId: 'api-negotiation', parties });
    const roomB = engine.createRoom({ task: 'debug settlement', templateId: 'cross-team-debug', parties });

    const fromA = engine.resolveLink(tokenFor(roomA.links, 'A'));
    const fromB = engine.resolveLink(tokenFor(roomB.links, 'A'));

    expect(fromA.roomId).toBe(roomA.roomId);
    expect(fromA.template.id).toBe('api-negotiation');
    expect(fromB.roomId).toBe(roomB.roomId);
    expect(fromB.template.id).toBe('cross-team-debug');
  });
});

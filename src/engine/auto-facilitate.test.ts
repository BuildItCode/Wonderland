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

describe('auto-facilitation (no LLM, no facilitator)', () => {
  it('runs a room to a ratified close driven only by the hub', () => {
    const { links } = engine.createRoom({
      task: 'Calculate 1 + 1',
      templateId: 'api-negotiation-auto',
      parties: [
        { team: 'Claude', role: 'contractor' },
        { team: 'ChatGPT', role: 'contractor' },
      ],
    });
    const a = tokenFor(links, 'Claude');
    const b = tokenFor(links, 'ChatGPT');

    engine.join(a);
    // when the last contractor joins, the hub auto-advances frame -> propose
    expect(engine.join(b).phase).toBe('propose');

    engine.post(a, 'propose', { body: { title: 'sum', interface: 'add(1,1) -> 2' } });
    engine.post(a, 'accept', { version: 1 });
    // second signature completes consensus -> hub auto-advances propose -> implement
    engine.post(b, 'accept', { version: 1 });
    expect(store.rooms.get('r1')?.phase).toBe('implement');

    engine.setStatus(a, 'done');
    // last "done" -> hub advances to ratify and auto-declares
    engine.setStatus(b, 'done');

    const room = store.rooms.get('r1');
    expect(room?.phase).toBe('closed');
    expect(room?.outcome).toBe('ratified');
    expect(engine.readDoc(a).doc).toContain('ratified');
  });

  it('allows an auto room with no facilitator', () => {
    expect(() =>
      engine.createRoom({
        task: 't',
        templateId: 'api-negotiation-auto',
        parties: [{ team: 'A', role: 'contractor' }],
      }),
    ).not.toThrow();
  });

  it('does not auto-advance a non-auto template', () => {
    const { links } = engine.createRoom({
      task: 't',
      templateId: 'api-negotiation',
      parties: [
        { team: 'platform', role: 'facilitator' },
        { team: 'A', role: 'contractor' },
        { team: 'B', role: 'contractor' },
      ],
    });
    engine.join(tokenFor(links, 'platform'));
    engine.join(tokenFor(links, 'A'));
    expect(engine.join(tokenFor(links, 'B')).phase).toBe('frame');
  });
});

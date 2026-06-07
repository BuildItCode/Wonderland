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

function roomLinks(templateId: string): RoleLink[] {
  return engine.createRoom({
    task: 'cross-team work',
    templateId,
    parties: [
      { team: 'platform', role: 'facilitator' },
      { team: 'A', role: 'contractor' },
      { team: 'B', role: 'contractor' },
    ],
  }).links;
}

function tk(links: RoleLink[], team: string): string {
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

describe('template registry', () => {
  it('lists all registered templates', () => {
    const ids = createTemplateRegistry()
      .list()
      .map((t) => t.id)
      .sort();
    expect(ids).toEqual(['api-negotiation', 'api-negotiation-verified', 'cross-team-debug']);
  });
});

describe('per-template config enforcement (AC11)', () => {
  it('briefs the cross-team-debug procedure', () => {
    const links = roomLinks('cross-team-debug');
    const briefing = engine.resolveLink(tk(links, 'A'));
    expect(briefing.template).toEqual({
      id: 'cross-team-debug',
      phases: ['frame', 'propose', 'ratify'],
      exit: 'ratified-contract',
      roundCap: 4,
    });
  });

  it('enforces different allowed acts per template (failure in frame)', () => {
    const debug = roomLinks('cross-team-debug'); // r1
    const api = roomLinks('api-negotiation'); // r2

    expect(engine.post(tk(debug, 'A'), 'failure', { reason: 'service 500s', fatal: false }).messageId).toBeTruthy();
    expect(() => engine.post(tk(api, 'A'), 'failure', { reason: 'x', fatal: false })).toThrow(
      /not allowed in phase 'frame'/,
    );
  });

  it('advances along each template own phase list', () => {
    const debug = roomLinks('cross-team-debug'); // r1
    store.rooms.setPhase('r1', 'propose');
    engine.post(tk(debug, 'A'), 'propose', { body: { title: 'root cause', interface: 'fix' } });
    engine.post(tk(debug, 'A'), 'accept', { version: 1 });
    engine.post(tk(debug, 'B'), 'accept', { version: 1 });
    expect(engine.advancePhase(tk(debug, 'platform'))).toEqual({ phase: 'ratify' });

    const api = roomLinks('api-negotiation'); // r2
    store.rooms.setPhase('r2', 'propose');
    engine.post(tk(api, 'A'), 'propose', { body: { title: 'v1', interface: 'x' } });
    engine.post(tk(api, 'A'), 'accept', { version: 1 });
    engine.post(tk(api, 'B'), 'accept', { version: 1 });
    expect(engine.advancePhase(tk(api, 'platform'))).toEqual({ phase: 'implement' });
  });
});

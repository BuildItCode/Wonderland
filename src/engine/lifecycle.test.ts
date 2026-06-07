import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase, createStore } from '../store/index.js';
import { createTemplateRegistry } from '../templates/index.js';
import { createEngine, type IdGenerator } from './index.js';
import type { CreateRoomInput, Store } from '../domain/index.js';
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

const PARTIES: CreateRoomInput = {
  task: 'integrate payments',
  templateId: 'api-negotiation',
  parties: [
    { team: 'platform', role: 'facilitator' },
    { team: 'A', role: 'contractor' },
    { team: 'B', role: 'contractor' },
  ],
};

let db: DatabaseSync;
let store: Store;
let engine: HubEngine;

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

describe('createRoom', () => {
  it('creates a room and mints one link per party', () => {
    const result = engine.createRoom(PARTIES);
    expect(result.roomId).toBe('r1');
    expect(result.url).toBe('/rooms/r1');
    expect(result.links).toHaveLength(3);
    expect(result.links[0]).toMatchObject({ role: 'facilitator', team: 'platform', roomId: 'r1' });
  });

  it('rejects a party set without exactly one facilitator', () => {
    expect(() =>
      engine.createRoom({ ...PARTIES, parties: [{ team: 'A', role: 'contractor' }] }),
    ).toThrow(/facilitator/);
    expect(() =>
      engine.createRoom({
        ...PARTIES,
        parties: [
          { team: 'x', role: 'facilitator' },
          { team: 'y', role: 'facilitator' },
          { team: 'A', role: 'contractor' },
        ],
      }),
    ).toThrow(/facilitator/);
  });

  it('rejects a party set with no contractor', () => {
    expect(() =>
      engine.createRoom({ ...PARTIES, parties: [{ team: 'platform', role: 'facilitator' }] }),
    ).toThrow(/contractor/);
  });

  it('rejects an unknown template', () => {
    expect(() => engine.createRoom({ ...PARTIES, templateId: 'nope' })).toThrow(/Unknown template/);
  });
});

describe('resolveLink', () => {
  it('returns a read-only briefing without granting write access', () => {
    const { links } = engine.createRoom(PARTIES);
    const contractorToken = links[1]!.token;

    const briefing = engine.resolveLink(contractorToken);
    expect(briefing).toMatchObject({
      roomId: 'r1',
      task: 'integrate payments',
      yourRole: 'contractor',
      yourTeam: 'A',
    });
    expect(briefing.template).toEqual({
      id: 'api-negotiation',
      phases: ['frame', 'propose', 'implement', 'ratify'],
      exit: 'ratified-contract',
      roundCap: 8,
    });
    expect(briefing.attendees).toHaveLength(3);
    // read-only: status is still 'invited' after resolving
    expect(store.participants.getByToken(contractorToken)?.status).toBe('invited');
  });

  it('throws for an unknown token', () => {
    expect(() => engine.resolveLink('bogus')).toThrow(/Unknown link token/);
  });
});

describe('join', () => {
  it('binds a stable identity and marks the participant joined', () => {
    const { links } = engine.createRoom(PARTIES);
    const token = links[1]!.token;

    const joined = engine.join(token);
    expect(joined).toMatchObject({ participantId: 'p2', phase: 'frame', summary: '' });
    expect(store.participants.getByToken(token)?.status).toBe('joined');
  });

  it('returns the same identity when the link is reused', () => {
    const { links } = engine.createRoom(PARTIES);
    const token = links[2]!.token;
    expect(engine.join(token).participantId).toBe(engine.join(token).participantId);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase, createStore } from './index.js';
import type { Room, Store } from '../domain/index.js';

const ROOM: Room = {
  id: 'r1',
  task: 'integrate payments',
  templateId: 'api-negotiation',
  phase: 'frame',
  round: 0,
  summary: '',
  outcome: null,
  createdAt: 1000,
};

let db: DatabaseSync;
let store: Store;

beforeEach(() => {
  db = openDatabase(':memory:');
  store = createStore(db);
  store.rooms.create(ROOM);
});

afterEach(() => {
  db.close();
});

describe('RoomRepository', () => {
  it('round-trips a created room', () => {
    expect(store.rooms.get('r1')).toEqual(ROOM);
  });

  it('returns null for an unknown room', () => {
    expect(store.rooms.get('nope')).toBeNull();
  });

  it('updates phase, summary, round, and outcome', () => {
    store.rooms.setPhase('r1', 'propose');
    store.rooms.setSummary('r1', 'gap named');
    store.rooms.setRound('r1', 2);
    store.rooms.setOutcome('r1', 'ratified');
    const room = store.rooms.get('r1');
    expect(room).toMatchObject({
      phase: 'propose',
      summary: 'gap named',
      round: 2,
      outcome: 'ratified',
    });
  });
});

describe('ParticipantRepository', () => {
  beforeEach(() => {
    store.participants.add(
      'r1',
      { id: 'p_fac', team: 'platform', role: 'facilitator', status: 'invited' },
      'tok_fac',
    );
    store.participants.add(
      'r1',
      { id: 'p_a', team: 'A', role: 'contractor', status: 'invited' },
      'tok_a',
    );
  });

  it('resolves a token to its participant and room', () => {
    expect(store.participants.getByToken('tok_a')).toEqual({
      id: 'p_a',
      team: 'A',
      role: 'contractor',
      status: 'invited',
      roomId: 'r1',
    });
  });

  it('returns null for an unknown token', () => {
    expect(store.participants.getByToken('tok_x')).toBeNull();
  });

  it('lists participants and updates status', () => {
    expect(store.participants.listByRoom('r1')).toHaveLength(2);
    store.participants.setStatus('r1', 'p_a', 'joined');
    expect(store.participants.getById('r1', 'p_a')?.status).toBe('joined');
  });
});

describe('MessageRepository', () => {
  beforeEach(() => {
    store.messages.append('r1', { id: 'm1', from: 'p_a', ts: 1, act: 'inform', payload: { kind: 'note', text: 'hi' } });
    store.messages.append('r1', { id: 'm2', from: 'p_b', ts: 2, act: 'accept', payload: { version: 1 } });
  });

  it('lists all messages in order', () => {
    const all = store.messages.listSince('r1');
    expect(all.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('lists only messages after a cursor', () => {
    const after = store.messages.listSince('r1', 'm1');
    expect(after.map((m) => m.id)).toEqual(['m2']);
  });

  it('lists a single participant own messages', () => {
    expect(store.messages.listByParticipant('r1', 'p_a').map((m) => m.id)).toEqual(['m1']);
  });
});

describe('ContractRepository', () => {
  beforeEach(() => {
    store.contracts.addVersion('r1', {
      version: 1,
      proposedBy: 'p_a',
      body: { title: 'v1', interface: 'POST /charges', terms: [] },
      signatures: [],
    });
  });

  it('round-trips a version with no signatures', () => {
    expect(store.contracts.getVersion('r1', 1)).toEqual({
      version: 1,
      proposedBy: 'p_a',
      body: { title: 'v1', interface: 'POST /charges', terms: [] },
      signatures: [],
    });
  });

  it('records signatures idempotently', () => {
    store.contracts.addSignature('r1', 1, 'p_a');
    store.contracts.addSignature('r1', 1, 'p_a');
    store.contracts.addSignature('r1', 1, 'p_b');
    expect(store.contracts.getVersion('r1', 1)?.signatures).toEqual(['p_a', 'p_b']);
  });

  it('tracks the latest version and supersession', () => {
    store.contracts.addVersion('r1', {
      version: 2,
      proposedBy: 'p_b',
      body: { title: 'v2', interface: 'POST /charges', terms: [] },
      signatures: [],
    });
    store.contracts.markSuperseded('r1', 1, 2);
    expect(store.contracts.getLatest('r1')?.version).toBe(2);
    expect(store.contracts.getVersion('r1', 1)?.supersededBy).toBe(2);
  });
});

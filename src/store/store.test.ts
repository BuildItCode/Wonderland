import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase, createStore } from './index.js';
import type { Room, Store } from '../domain/index.js';

const ROOM: Room = {
  id: 'r1',
  task: 'integrate payments',
  facilitation: 'agent',
  status: 'open',
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

  it('updates status, summary, round, and outcome', () => {
    store.rooms.setSummary('r1', 'gap named');
    store.rooms.setRound('r1', 2);
    store.rooms.setOutcome('r1', 'resolved');
    store.rooms.setStatus('r1', 'closed');
    const room = store.rooms.get('r1');
    expect(room).toMatchObject({
      status: 'closed',
      summary: 'gap named',
      round: 2,
      outcome: 'resolved',
    });
  });

  it('stores and reads the finalized doc', () => {
    expect(store.rooms.getDoc('r1')).toBe('');
    store.rooms.setDoc('r1', '# done');
    expect(store.rooms.getDoc('r1')).toBe('# done');
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
      { id: 'p_a', team: 'A', role: 'participant', status: 'invited' },
      'tok_a',
    );
  });

  it('resolves a token to its participant and room', () => {
    expect(store.participants.getByToken('tok_a')).toEqual({
      id: 'p_a',
      team: 'A',
      role: 'participant',
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
    store.messages.append('r1', { id: 'm1', from: 'p_a', ts: 1, act: 'say', payload: { text: 'hi' } });
    store.messages.append('r1', {
      id: 'm2',
      from: 'p_b',
      ts: 2,
      act: 'propose',
      payload: { text: '1 + 1 = 2' },
    });
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

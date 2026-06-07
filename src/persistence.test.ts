import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { openDatabase, createStore } from './store/index.js';
import { createTemplateRegistry } from './templates/index.js';
import { createEngine, type IdGenerator } from './engine/index.js';
import type { RoleLink } from './domain/index.js';

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

const dbPath = join(tmpdir(), 'wonderland-persistence-test.sqlite');

function cleanup(): void {
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(dbPath + suffix, { force: true });
  }
}

function tokenFor(links: RoleLink[], team: string): string {
  const link = links.find((l) => l.team === team);
  if (!link) {
    throw new Error(`no link for ${team}`);
  }
  return link.token;
}

beforeEach(cleanup);
afterEach(cleanup);

describe('persistence across restart (AC9)', () => {
  it('resumes full room state from the database file after a process restart', () => {
    // session 1: drive to the implement phase, then "exit"
    const db1 = openDatabase(dbPath);
    const engine1 = createEngine({
      store: createStore(db1),
      templates: createTemplateRegistry(),
      clock: { now: () => 1000 },
      ids: seqIdGenerator(),
    });
    const { links } = engine1.createRoom({
      task: 'integrate payments',
      templateId: 'api-negotiation',
      parties: [
        { team: 'platform', role: 'facilitator' },
        { team: 'A', role: 'contractor' },
        { team: 'B', role: 'contractor' },
      ],
    });
    const fac = tokenFor(links, 'platform');
    engine1.advancePhase(fac); // frame -> propose
    engine1.post(tokenFor(links, 'A'), 'propose', {
      body: { title: 'Charges API', interface: 'POST /charges' },
    });
    engine1.post(tokenFor(links, 'A'), 'accept', { version: 1 });
    engine1.post(tokenFor(links, 'B'), 'accept', { version: 1 });
    engine1.updateSummary(fac, 'Agreed on charge endpoint.');
    engine1.advancePhase(fac); // propose -> implement
    db1.close();

    // session 2: reopen the same file — a fresh process
    const db2 = openDatabase(dbPath);
    const store2 = createStore(db2);
    const room = store2.rooms.get('r1');
    expect(room?.phase).toBe('implement');
    expect(room?.summary).toBe('Agreed on charge endpoint.');
    expect(store2.messages.listSince('r1').length).toBeGreaterThan(0);
    expect(store2.contracts.getVersion('r1', 1)?.signatures).toHaveLength(2);

    // and the room can continue from where it left off
    const engine2 = createEngine({
      store: store2,
      templates: createTemplateRegistry(),
      clock: { now: () => 2000 },
      ids: seqIdGenerator(),
    });
    expect(engine2.advancePhase(fac)).toEqual({ phase: 'ratify' });
    db2.close();
  });
});

import { describe, it, expect } from 'vitest';
import type { AddressInfo } from 'node:net';
import { openDatabase, createStore } from '../store/index.js';
import { createEngine } from '../engine/index.js';
import { createHubServer } from './index.js';

async function boot(): Promise<{ base: string; stop: () => Promise<void> }> {
  const db = openDatabase(':memory:');
  const app = createHubServer(createEngine({ store: createStore(db) }));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
        db.close();
      }),
  };
}

async function post(base: string, path: string, body: unknown): Promise<Response> {
  return fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('REST façade', () => {
  it('creates a room, joins, and snapshots', async () => {
    const { base, stop } = await boot();
    const created = (await (
      await post(base, '/api/rooms', {
        task: 'integrate payments',
        facilitation: 'agent',
        parties: [
          { team: 'platform', role: 'facilitator' },
          { team: 'A', role: 'participant' },
          { team: 'B', role: 'participant' },
        ],
      })
    ).json()) as { links: Array<{ token: string; team: string }> };
    expect(created.links).toHaveLength(3);

    const token = created.links.find((l) => l.team === 'A')!.token;
    const joined = (await (await post(base, '/api/join', { token })).json()) as { status: string };
    expect(joined.status).toBe('open');

    const snap = (await (await post(base, '/api/snapshot', { token })).json()) as {
      participants: unknown[];
    };
    expect(snap.participants).toHaveLength(3);
    await stop();
  });

  it('maps domain errors to HTTP status codes', async () => {
    const { base, stop } = await boot();
    const res = await post(base, '/api/resolve', { token: 'bogus' });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
    await stop();
  });
});

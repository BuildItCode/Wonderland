import { describe, it, expect } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { DatabaseSync } from 'node:sqlite';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { openDatabase, createStore } from './store/index.js';
import { createTemplateRegistry } from './templates/index.js';
import { createEngine } from './engine/index.js';
import { createHubServer } from './transport/index.js';

interface Harness {
  client: Client;
  stop: () => Promise<void>;
}

interface Created {
  roomId: string;
  links: Array<{ token: string; team: string; role: string }>;
}

function textOf(result: unknown): string {
  const blocks = (result as { content?: Array<{ text?: string }> }).content ?? [];
  return blocks[0]?.text ?? '';
}

async function boot(): Promise<Harness> {
  const db: DatabaseSync = openDatabase(':memory:');
  const app = createHubServer(
    createEngine({ store: createStore(db), templates: createTemplateRegistry() }),
  );
  const httpServer = app.listen(0);
  await new Promise<void>((resolve) => httpServer.once('listening', resolve));
  const { port } = httpServer.address() as AddressInfo;
  const client = new Client({ name: 'full', version: '0.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
  return {
    client,
    stop: async () => {
      await client.close();
      await new Promise<void>((resolve, reject) =>
        httpServer.close((err) => (err ? reject(err) : resolve())),
      );
      db.close();
    },
  };
}

async function call(client: Client, name: string, args: Record<string, unknown>): Promise<unknown> {
  return JSON.parse(textOf(await client.callTool({ name, arguments: args })));
}

const PARTIES = [
  { team: 'platform', role: 'facilitator' },
  { team: 'A', role: 'contractor' },
  { team: 'B', role: 'contractor' },
];

function tokenOf(created: Created, team: string): string {
  const link = created.links.find((l) => l.team === team);
  if (!link) {
    throw new Error(`no link for ${team}`);
  }
  return link.token;
}

describe('full integration over MCP', () => {
  it('runs a verified-solution negotiation end to end (AC7, AC10)', async () => {
    const h = await boot();
    const created = (await call(h.client, 'create_room', {
      task: 'integrate payments',
      templateId: 'api-negotiation-verified',
      parties: PARTIES,
    })) as Created;
    const fac = tokenOf(created, 'platform');
    const a = tokenOf(created, 'A');
    const b = tokenOf(created, 'B');

    for (const token of [fac, a, b]) {
      await call(h.client, 'join', { token });
    }
    await call(h.client, 'advance_phase', { token: fac });
    await call(h.client, 'post', {
      token: b,
      act: 'propose',
      payload: {
        body: { title: 'Charges API', interface: 'POST /charges', verification: 'shared pact suite' },
      },
    });
    await call(h.client, 'post', { token: a, act: 'accept', payload: { version: 1 } });
    await call(h.client, 'post', { token: b, act: 'accept', payload: { version: 1 } });
    await call(h.client, 'advance_phase', { token: fac }); // implement
    await call(h.client, 'advance_phase', { token: fac }); // verify
    await call(h.client, 'submit_verification', { token: a, version: 1, passed: true });
    await call(h.client, 'submit_verification', { token: b, version: 1, passed: true });
    expect(await call(h.client, 'advance_phase', { token: fac })).toEqual({ phase: 'ratify' });

    const declared = (await call(h.client, 'declare', { token: fac, outcome: 'verified' })) as {
      doc: string;
    };
    expect(declared.doc).toContain('— verified');
    expect(declared.doc).toContain('## Verification');
    await h.stop();
  });

  it('runs a cross-team-debug session end to end (AC11)', async () => {
    const h = await boot();
    const created = (await call(h.client, 'create_room', {
      task: 'checkout 500s on settlement',
      templateId: 'cross-team-debug',
      parties: PARTIES,
    })) as Created;
    const fac = tokenOf(created, 'platform');
    const a = tokenOf(created, 'A');
    const b = tokenOf(created, 'B');

    for (const token of [fac, a, b]) {
      await call(h.client, 'join', { token });
    }
    // failure is allowed in the debug frame phase
    await call(h.client, 'post', { token: a, act: 'failure', payload: { reason: 'settlement 500', fatal: false } });
    await call(h.client, 'advance_phase', { token: fac }); // propose
    await call(h.client, 'post', {
      token: a,
      act: 'propose',
      payload: { body: { title: 'root cause: stale cache', interface: 'invalidate on settle' } },
    });
    await call(h.client, 'post', { token: a, act: 'accept', payload: { version: 1 } });
    await call(h.client, 'post', { token: b, act: 'accept', payload: { version: 1 } });
    // debug skips implement: propose -> ratify
    expect(await call(h.client, 'advance_phase', { token: fac })).toEqual({ phase: 'ratify' });
    const declared = (await call(h.client, 'declare', { token: fac, outcome: 'ratified' })) as {
      doc: string;
    };
    expect(declared.doc).toContain('— ratified');
    await h.stop();
  });

  it('regresses on a fatal failure during implement (AC8)', async () => {
    const h = await boot();
    const created = (await call(h.client, 'create_room', {
      task: 'integrate payments',
      templateId: 'api-negotiation',
      parties: PARTIES,
    })) as Created;
    const fac = tokenOf(created, 'platform');
    const a = tokenOf(created, 'A');
    const b = tokenOf(created, 'B');

    for (const token of [fac, a, b]) {
      await call(h.client, 'join', { token });
    }
    await call(h.client, 'advance_phase', { token: fac }); // propose
    await call(h.client, 'post', {
      token: a,
      act: 'propose',
      payload: { body: { title: 'v1', interface: 'POST /charges' } },
    });
    await call(h.client, 'post', { token: a, act: 'accept', payload: { version: 1 } });
    await call(h.client, 'post', { token: b, act: 'accept', payload: { version: 1 } });
    await call(h.client, 'advance_phase', { token: fac }); // implement
    await call(h.client, 'post', {
      token: b,
      act: 'failure',
      payload: { reason: 'webhook fires before commit', fatal: true },
    });

    // rejoining reports the regressed phase
    const rejoined = (await call(h.client, 'join', { token: a })) as { phase: string };
    expect(rejoined.phase).toBe('propose');
    await h.stop();
  });
});

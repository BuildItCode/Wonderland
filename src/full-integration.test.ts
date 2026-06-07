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
  it('runs an api-negotiation to a ratified close (AC7)', async () => {
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
      payload: { body: { title: 'Charges API', interface: 'POST /charges' } },
    });
    await call(h.client, 'post', { token: a, act: 'accept', payload: { version: 1 } });
    await call(h.client, 'post', { token: b, act: 'accept', payload: { version: 1 } });
    await call(h.client, 'advance_phase', { token: fac }); // implement
    await call(h.client, 'post', { token: a, act: 'inform', payload: { kind: 'result', summary: 'done A' } });
    await call(h.client, 'post', { token: b, act: 'inform', payload: { kind: 'result', summary: 'done B' } });
    expect(await call(h.client, 'advance_phase', { token: fac })).toEqual({ phase: 'ratify' });

    const declared = (await call(h.client, 'declare', { token: fac, outcome: 'ratified' })) as {
      doc: string;
    };
    expect(declared.doc).toContain('— ratified');
    expect(declared.doc).toContain('Charges API');
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

    const rejoined = (await call(h.client, 'join', { token: a })) as { phase: string };
    expect(rejoined.phase).toBe('propose');
    await h.stop();
  });
});

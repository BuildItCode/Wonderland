import { describe, it, expect } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { DatabaseSync } from 'node:sqlite';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { openDatabase, createStore } from './store/index.js';
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
  const app = createHubServer(createEngine({ store: createStore(db) }));
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

function tokenOf(created: Created, team: string): string {
  const link = created.links.find((l) => l.team === team);
  if (!link) {
    throw new Error(`no link for ${team}`);
  }
  return link.token;
}

describe('full integration over MCP', () => {
  it('runs an agent-facilitated room to a resolved close', async () => {
    const h = await boot();
    const created = (await call(h.client, 'create_room', {
      task: 'integrate payments',
      facilitation: 'agent',
      parties: [
        { team: 'platform', role: 'facilitator' },
        { team: 'A', role: 'participant' },
        { team: 'B', role: 'participant' },
      ],
    })) as Created;
    const fac = tokenOf(created, 'platform');
    const a = tokenOf(created, 'A');
    const b = tokenOf(created, 'B');

    for (const token of [fac, a, b]) {
      await call(h.client, 'join', { token });
    }
    await call(h.client, 'post', {
      token: a,
      act: 'propose',
      payload: { title: 'Charges API', text: 'POST /charges with idempotency keys' },
    });
    await call(h.client, 'post', { token: a, act: 'agree', payload: {} });
    await call(h.client, 'post', { token: b, act: 'agree', payload: {} });

    const declared = (await call(h.client, 'declare', { token: fac, outcome: 'resolved' })) as {
      doc: string;
    };
    expect(declared.doc).toContain('— resolved');
    expect(declared.doc).toContain('Charges API');
    await h.stop();
  });

  it('runs an auto room to a resolved close with no facilitator', async () => {
    const h = await boot();
    const created = (await call(h.client, 'create_room', {
      task: 'calculate 1 + 1',
      facilitation: 'auto',
      parties: [
        { team: 'Claude', role: 'participant' },
        { team: 'ChatGPT', role: 'participant' },
      ],
    })) as Created;
    const a = tokenOf(created, 'Claude');
    const b = tokenOf(created, 'ChatGPT');

    await call(h.client, 'join', { token: a });
    await call(h.client, 'join', { token: b });
    await call(h.client, 'post', { token: a, act: 'propose', payload: { text: '1 + 1 = 2' } });
    await call(h.client, 'post', { token: a, act: 'agree', payload: {} });
    // the last agreement trips the hub's auto-close
    await call(h.client, 'post', { token: b, act: 'agree', payload: {} });

    const snap = (await call(h.client, 'read_doc', { token: a })) as { doc: string };
    expect(snap.doc).toContain('— resolved');
    expect(snap.doc).toContain('1 + 1 = 2');
    await h.stop();
  });
});

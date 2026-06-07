import { describe, it, expect } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { openDatabase, createStore } from './store/index.js';
import { createEngine } from './engine/index.js';
import { createHubServer } from './transport/index.js';

function textOf(result: unknown): string {
  const blocks = (result as { content?: Array<{ text?: string }> }).content ?? [];
  return blocks[0]?.text ?? '';
}

interface CreateRoomResponse {
  roomId: string;
  url: string;
  links: Array<{ token: string; role: string; team: string }>;
}

describe('real stack over Streamable HTTP', () => {
  it('creates a room, resolves a link, and joins through MCP', async () => {
    const db = openDatabase(':memory:');
    const app = createHubServer(createEngine({ store: createStore(db) }));
    const httpServer = app.listen(0);
    await new Promise<void>((resolve) => httpServer.once('listening', resolve));
    const { port } = httpServer.address() as AddressInfo;

    const client = new Client({ name: 'integration', version: '0.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));

    const created = JSON.parse(
      textOf(
        await client.callTool({
          name: 'create_room',
          arguments: {
            task: 'integrate payments',
            facilitation: 'agent',
            parties: [
              { team: 'platform', role: 'facilitator' },
              { team: 'A', role: 'participant' },
              { team: 'B', role: 'participant' },
            ],
          },
        }),
      ),
    ) as CreateRoomResponse;
    expect(created.links).toHaveLength(3);

    const participant = created.links.find((l) => l.team === 'A');
    expect(participant).toBeDefined();
    const token = participant!.token;

    const briefing = JSON.parse(textOf(await client.callTool({ name: 'resolve_link', arguments: { token } }))) as {
      yourRole: string;
      attendees: unknown[];
    };
    expect(briefing.yourRole).toBe('participant');
    expect(briefing.attendees).toHaveLength(3);

    const joined = JSON.parse(textOf(await client.callTool({ name: 'join', arguments: { token } }))) as {
      participantId: string;
      status: string;
    };
    expect(joined.status).toBe('open');
    expect(joined.participantId).toBeTruthy();

    await client.close();
    await new Promise<void>((resolve, reject) =>
      httpServer.close((err) => (err ? reject(err) : resolve())),
    );
    db.close();
  });

  it('resumes the same identity on a fresh connection using the same link', async () => {
    const db = openDatabase(':memory:');
    const app = createHubServer(createEngine({ store: createStore(db) }));
    const httpServer = app.listen(0);
    await new Promise<void>((resolve) => httpServer.once('listening', resolve));
    const { port } = httpServer.address() as AddressInfo;
    const url = new URL(`http://127.0.0.1:${port}/mcp`);

    // first session: create, join, post, then disconnect
    const first = new Client({ name: 'session-1', version: '0.0.0' });
    await first.connect(new StreamableHTTPClientTransport(url));
    const created = JSON.parse(
      textOf(
        await first.callTool({
          name: 'create_room',
          arguments: {
            task: 'integrate payments',
            facilitation: 'agent',
            parties: [
              { team: 'platform', role: 'facilitator' },
              { team: 'A', role: 'participant' },
            ],
          },
        }),
      ),
    ) as CreateRoomResponse;
    const token = created.links.find((l) => l.team === 'A')!.token;
    const joined = JSON.parse(textOf(await first.callTool({ name: 'join', arguments: { token } }))) as {
      participantId: string;
    };
    await first.callTool({
      name: 'post',
      arguments: { token, act: 'say', payload: { text: 'checkpoint' } },
    });
    await first.close();

    // second session: same link, reconstruct state
    const second = new Client({ name: 'session-2', version: '0.0.0' });
    await second.connect(new StreamableHTTPClientTransport(url));
    const state = JSON.parse(textOf(await second.callTool({ name: 'my_state', arguments: { token } }))) as {
      me: string;
      myMessages: Array<{ id: string }>;
    };
    expect(state.me).toBe(joined.participantId);
    expect(state.myMessages.length).toBe(1);

    await second.close();
    await new Promise<void>((resolve, reject) =>
      httpServer.close((err) => (err ? reject(err) : resolve())),
    );
    db.close();
  });
});

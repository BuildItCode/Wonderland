import { describe, it, expect } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMcpServer, createHubServer } from './index.js';
import type { HubService } from '../domain/index.js';

const stub: HubService = {
  createRoom: () => ({ roomId: 'r1', url: '/rooms/r1', links: [] }),
  resolveLink: () => ({
    roomId: 'r1',
    task: 'integrate payments',
    template: { id: 'api-negotiation', phases: ['frame'], exit: 'ratified-contract', roundCap: 8 },
    yourRole: 'contractor',
    yourTeam: 'A',
    attendees: [],
  }),
  join: () => ({ participantId: 'p1', phase: 'frame', summary: '' }),
  post: () => ({ messageId: 'm1' }),
  setStatus: () => undefined,
  readRoom: () => [],
  myState: () => ({ me: 'p1', status: 'joined', myMessages: [], signedVersion: null, assignedTasks: [] }),
  updateSummary: () => undefined,
  advancePhase: () => ({ phase: 'propose' }),
  regressPhase: () => ({ phase: 'propose' }),
  submitVerification: () => ({ remaining: [] }),
  declare: () => ({ doc: '# doc' }),
  readDoc: () => ({ doc: '# doc' }),
};

const EXPECTED_TOOLS = [
  'advance_phase',
  'create_room',
  'declare',
  'join',
  'my_state',
  'post',
  'read_doc',
  'read_room',
  'regress_phase',
  'resolve_link',
  'set_status',
  'submit_verification',
  'update_summary',
];

function textOf(result: unknown): string {
  const blocks = (result as { content?: Array<{ type: string; text?: string }> }).content ?? [];
  return blocks[0]?.text ?? '';
}

describe('MCP tool surface (in-memory)', () => {
  it('lists the full M1 tool surface', async () => {
    const server = createMcpServer(stub);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(EXPECTED_TOOLS);
    await client.close();
  });

  it('dispatches a tool call to the service', async () => {
    const server = createMcpServer(stub);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: 'create_room',
      arguments: {
        task: 'integrate payments',
        templateId: 'api-negotiation',
        parties: [{ team: 'A', role: 'contractor' }],
      },
    });
    expect(JSON.parse(textOf(result))).toMatchObject({ roomId: 'r1' });
    await client.close();
  });
});

describe('MCP over Streamable HTTP', () => {
  it('serves the tool surface at POST /mcp', async () => {
    const app = createHubServer(stub);
    const httpServer = app.listen(0);
    await new Promise<void>((resolve) => httpServer.once('listening', resolve));
    const { port } = httpServer.address() as AddressInfo;

    const client = new Client({ name: 'test', version: '0.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`));
    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools).toHaveLength(EXPECTED_TOOLS.length);

    await client.close();
    await new Promise<void>((resolve, reject) =>
      httpServer.close((err) => (err ? reject(err) : resolve())),
    );
  });
});

import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { HubService } from '../domain/index.js';
import { registerTools } from './tools.js';
import { createRestRouter } from './rest.js';

const SERVER_INFO = { name: 'wonderland-hub', version: '0.1.0' };

const METHOD_NOT_ALLOWED = {
  error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for the stateless MCP endpoint.' },
};

/** Build an MCP server instance with the hub tool surface registered. */
export function createMcpServer(service: HubService): McpServer {
  const server = new McpServer(SERVER_INFO);
  registerTools(server, service);
  return server;
}

/**
 * Build the Express app that hosts the hub over Streamable HTTP at `POST /mcp`.
 *
 * The endpoint is stateless: each request gets a fresh server + transport, because
 * all room state lives in the store, not in the MCP session.
 */
export function createHubServer(service: HubService): Express {
  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    const server = createMcpServer(service);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ error: { code: 'INTERNAL', message: 'Request handling failed.' } });
      }
    }
  });

  app.get('/mcp', (_req, res) => {
    res.status(405).json(METHOD_NOT_ALLOWED);
  });
  app.delete('/mcp', (_req, res) => {
    res.status(405).json(METHOD_NOT_ALLOWED);
  });

  // REST façade + static test UI
  app.use('/api', createRestRouter(service));
  app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));

  return app;
}

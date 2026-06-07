import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  AppError,
  outcomeSchema,
  phaseSchema,
  presenceSchema,
  roleSchema,
  speechActTypeSchema,
  type HubService,
} from '../domain/index.js';

function ok(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}

function fail(error: unknown): CallToolResult {
  const code = error instanceof AppError ? error.code : 'INTERNAL';
  const message = error instanceof Error ? error.message : 'Unknown error';
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: { code, message } }) }],
    isError: true,
  };
}

function run(fn: () => unknown): CallToolResult {
  try {
    return ok(fn());
  } catch (error) {
    return fail(error);
  }
}

/** Register the full M1 hub tool surface on an MCP server, dispatching to the service. */
export function registerTools(server: McpServer, service: HubService): void {
  server.registerTool(
    'create_room',
    {
      description: 'Create a room from a task + template; returns room id, url, and role-links.',
      inputSchema: {
        task: z.string().min(1),
        templateId: z.string().min(1),
        parties: z.array(z.object({ team: z.string().min(1), role: roleSchema })).min(1),
      },
    },
    (args) => run(() => service.createRoom(args)),
  );

  server.registerTool(
    'resolve_link',
    {
      description: 'Read-only, pre-join briefing for a role-link token.',
      inputSchema: { token: z.string().min(1) },
    },
    (args) => run(() => service.resolveLink(args.token)),
  );

  server.registerTool(
    'join',
    {
      description: 'Bind your stable identity to a role-link and return the room snapshot.',
      inputSchema: { token: z.string().min(1) },
    },
    (args) => run(() => service.join(args.token)),
  );

  server.registerTool(
    'post',
    {
      description:
        'Append a typed speech act (inform/propose/accept/reject/request/failure). ' +
        'payload is the act-specific object (or a JSON string of it).',
      inputSchema: {
        token: z.string().min(1),
        act: speechActTypeSchema,
        payload: z.union([z.string(), z.record(z.string(), z.unknown())]),
        refVersion: z.number().int().positive().optional(),
      },
    },
    (args) => run(() => service.post(args.token, args.act, args.payload, args.refVersion)),
  );

  server.registerTool(
    'set_status',
    {
      description: 'Update your presence status.',
      inputSchema: { token: z.string().min(1), status: presenceSchema },
    },
    (args) =>
      run(() => {
        service.setStatus(args.token, args.status);
        return { ok: true };
      }),
  );

  server.registerTool(
    'read_room',
    {
      description: 'List transcript messages, optionally only those after a cursor message id.',
      inputSchema: { token: z.string().min(1), since: z.string().optional() },
    },
    (args) => run(() => service.readRoom(args.token, args.since)),
  );

  server.registerTool(
    'my_state',
    {
      description: 'One-call catch-up view: your messages, signature status, status, tasks.',
      inputSchema: { token: z.string().min(1) },
    },
    (args) => run(() => service.myState(args.token)),
  );

  server.registerTool(
    'update_summary',
    {
      description: 'Replace the living room summary (facilitator only).',
      inputSchema: { token: z.string().min(1), summary: z.string() },
    },
    (args) =>
      run(() => {
        service.updateSummary(args.token, args.summary);
        return { ok: true };
      }),
  );

  server.registerTool(
    'advance_phase',
    {
      description: 'Advance to the next phase if consensus allows (facilitator only).',
      inputSchema: { token: z.string().min(1) },
    },
    (args) => run(() => service.advancePhase(args.token)),
  );

  server.registerTool(
    'regress_phase',
    {
      description: 'Regress to an earlier phase, forcing contract re-signature (facilitator only).',
      inputSchema: { token: z.string().min(1), to: phaseSchema, reason: z.string().min(1) },
    },
    (args) => run(() => service.regressPhase(args.token, args.to, args.reason)),
  );

  server.registerTool(
    'declare',
    {
      description: 'Close the room with an outcome and finalize the doc (facilitator only).',
      inputSchema: { token: z.string().min(1), outcome: outcomeSchema },
    },
    (args) => run(() => service.declare(args.token, args.outcome)),
  );

  server.registerTool(
    'read_doc',
    {
      description: 'Read the finalized document (any participant; survives close).',
      inputSchema: { token: z.string().min(1) },
    },
    (args) => run(() => service.readDoc(args.token)),
  );
}

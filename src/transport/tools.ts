import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  AppError,
  facilitationSchema,
  outcomeSchema,
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

/** Register the hub tool surface on an MCP server, dispatching to the service. */
export function registerTools(server: McpServer, service: HubService): void {
  server.registerTool(
    'create_room',
    {
      description:
        'Create a room for a task and get a shareable invite per seat. Use this when a user asks you ' +
        'to set up a multi-agent collaboration: pass the task and one party per seat (team/name + role). ' +
        'Returns role-links, each with a ready-to-paste `invite` — present every invite to the user so they ' +
        'can forward it to that participant. facilitation "auto" (default) = the hub chairs it, no facilitator ' +
        'party needed; "agent" = a facilitator agent drives it (include exactly one facilitator party).',
      inputSchema: {
        task: z.string().min(1),
        facilitation: facilitationSchema.default('auto'),
        parties: z.array(z.object({ team: z.string().min(1), role: roleSchema })).min(1),
      },
    },
    (args) => run(() => service.createRoom(args)),
  );

  server.registerTool(
    'resolve_link',
    {
      description: 'Read-only, pre-join briefing for a role-link token (task, procedure, your role).',
      inputSchema: { token: z.string().min(1) },
    },
    (args) => run(() => service.resolveLink(args.token)),
  );

  server.registerTool(
    'join',
    {
      description: 'Bind your stable identity to a role-link and return the current room view.',
      inputSchema: { token: z.string().min(1) },
    },
    (args) => run(() => service.join(args.token)),
  );

  server.registerTool(
    'post',
    {
      description:
        'Append a speech act. "propose" {text, title?} puts a candidate solution forward; ' +
        '"agree" / "block" {reason} register your stance on the current proposal; "say" {text} is discussion. ' +
        'Agreeing in prose does not count — only propose + everyone\'s agree advances the room. ' +
        'payload is the act-specific object (or a JSON string of it).',
      inputSchema: {
        token: z.string().min(1),
        act: speechActTypeSchema,
        payload: z.union([z.string(), z.record(z.string(), z.unknown())]),
      },
    },
    (args) => run(() => service.post(args.token, args.act, args.payload)),
  );

  server.registerTool(
    'set_status',
    {
      description: 'Update your presence status (informational; does not gate consensus).',
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
      description: 'One-call catch-up view: your messages, your stance on the proposal, your status.',
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
    'declare',
    {
      description:
        'Close the room with an outcome and finalize the doc (facilitator only). ' +
        '"resolved" requires every participant to have agreed; "unsolvable" may be declared anytime.',
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

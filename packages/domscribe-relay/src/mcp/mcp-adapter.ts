/**
 * MCP (Model Context Protocol) adapter for Domscribe.
 * Provides a stdio-based MCP server that proxies requests to the HTTP relay.
 * @module @domscribe/relay/mcp/mcp-adapter
 */
import { z } from 'zod';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpToolDefinition } from './tools/tool.defs.js';
import { McpPromptDefinition } from './prompts/prompt.defs.js';
import { RelayHttpClient } from '../client/relay-http-client.js';
import { RELAY_VERSION } from '../version.js';
import { DormantStatusTool } from './tools/dormant-status.tool.js';

// Tool classes
import { ResolveTool } from './tools/resolve.tool.js';
import { ResolveBatchTool } from './tools/resolve-batch.tool.js';
import { ManifestStatsTool } from './tools/manifest-stats.tool.js';
import { ManifestQueryTool } from './tools/manifest-query.tool.js';
import { AnnotationGetTool } from './tools/annotation-get.tool.js';
import { AnnotationsListTool } from './tools/annotation-list.tool.js';
import { AnnotationsProcessTool } from './tools/annotation-process.tool.js';
import { AnnotationsUpdateStatusTool } from './tools/annotation-update-status.tool.js';
import { AnnotationsRespondTool } from './tools/annotation-respond.tool.js';
import { AnnotationsSearchTool } from './tools/annotation-search.tool.js';
import { StatusTool } from './tools/status.tool.js';
import { QueryBySourceTool } from './tools/query-by-source.tool.js';

// Prompt classes
import { ProcessNextPrompt } from './prompts/process-next.prompt.js';
import { CheckStatusPrompt } from './prompts/check-status.prompt.js';
import { ExploreComponentPrompt } from './prompts/explore-component.prompt.js';
import { FindAnnotationsPrompt } from './prompts/find-annotations.prompt.js';

/**
 * Options for active mode — relay is running, full tool set.
 */
export interface McpAdapterActiveOptions {
  mode: 'active';
  /** Host where the relay server is running */
  relayHost: string;
  /** Port where the relay server is running */
  relayPort: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Options for dormant mode — no workspace detected, diagnostic tool only.
 */
export interface McpAdapterDormantOptions {
  mode: 'dormant';
  /** Working directory where the MCP server was started */
  cwd: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Options for creating an MCP adapter.
 * Discriminated on `mode` to determine which tools are registered.
 */
export type McpAdapterOptions =
  | McpAdapterActiveOptions
  | McpAdapterDormantOptions;

/**
 * MCP adapter that registers tool and prompt handlers against the MCP server.
 * Tool logic lives in individual tool classes; the adapter is pure wiring.
 */
export class McpAdapter {
  private server: McpServer;
  private debug: boolean;

  constructor(options: McpAdapterOptions) {
    this.debug = options.debug ?? false;

    const capabilities: Record<string, Record<string, never>> = { tools: {} };

    if (options.mode === 'active') {
      capabilities['prompts'] = {};
    }

    this.server = new McpServer(
      { name: 'domscribe', version: RELAY_VERSION },
      { capabilities },
    );

    if (options.mode === 'active') {
      const relayHttpClient = new RelayHttpClient(
        options.relayHost,
        options.relayPort,
      );
      this.registerTools(relayHttpClient);
      this.registerPrompts();
    } else {
      this.registerDormantTools(options.cwd);
    }
  }

  private registerTools(relayHttpClient: RelayHttpClient): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: McpToolDefinition<z.ZodType<any>, z.ZodType<any>>[] = [
      new ResolveTool(relayHttpClient),
      new ResolveBatchTool(relayHttpClient),
      new ManifestStatsTool(relayHttpClient),
      new ManifestQueryTool(relayHttpClient),
      new AnnotationGetTool(relayHttpClient),
      new AnnotationsListTool(relayHttpClient),
      new AnnotationsProcessTool(relayHttpClient),
      new AnnotationsUpdateStatusTool(relayHttpClient),
      new AnnotationsRespondTool(relayHttpClient),
      new AnnotationsSearchTool(relayHttpClient),
      new StatusTool(relayHttpClient),
      new QueryBySourceTool(relayHttpClient),
    ];

    for (const tool of tools) {
      this.server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: tool.inputSchema,
        },
        async (args) => {
          if (this.debug) {
            console.error(`[domscribe-mcp] Tool call: ${tool.name}`, args);
          }
          return tool.toolCallback(args);
        },
      );
    }
  }

  private registerDormantTools(cwd: string): void {
    const tool = new DormantStatusTool(cwd);
    this.server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args) => {
        if (this.debug) {
          console.error(`[domscribe-mcp] Tool call: ${tool.name}`, args);
        }
        return tool.toolCallback(args);
      },
    );
  }

  private registerPrompts(): void {
    const prompts: McpPromptDefinition[] = [
      new ProcessNextPrompt(),
      new CheckStatusPrompt(),
      new ExploreComponentPrompt(),
      new FindAnnotationsPrompt(),
    ];

    for (const prompt of prompts) {
      this.server.registerPrompt(
        prompt.name,
        {
          description: prompt.description,
          argsSchema: prompt.argsSchema,
        },
        (args: unknown) => {
          if (this.debug) {
            console.error(`[domscribe-mcp] GetPrompt: ${prompt.name}`, args);
          }
          return {
            description: prompt.description,
            messages: prompt.promptCallback(args as Record<string, string>),
          };
        },
      );
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    if (this.debug) {
      console.error('[domscribe-mcp] MCP server started');
    }
  }

  async close(): Promise<void> {
    await this.server.close();

    if (this.debug) {
      console.error('[domscribe-mcp] MCP server closed');
    }
  }
}

export function createMcpAdapter(options: McpAdapterOptions): McpAdapter {
  return new McpAdapter(options);
}

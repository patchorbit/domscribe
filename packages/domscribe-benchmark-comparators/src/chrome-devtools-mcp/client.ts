export interface ChromeDevtoolsMcpToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChromeDevtoolsMcpToolResult {
  ok: boolean;
  content?: unknown;
  refusal?: string;
}

/**
 * Minimal client surface the benchmark runner depends on. The actual MCP transport (stdio child
 * process spawned from the chrome-devtools-mcp dev-dep) lives behind this interface so the
 * comparator stays unit-testable. Task A's runner constructs the real client; the benchmark
 * pins chrome-devtools-mcp at the version recorded in the root devDependencies.
 */
export interface ChromeDevtoolsMcpClient {
  readonly version: string;
  call(req: ChromeDevtoolsMcpToolCall): Promise<ChromeDevtoolsMcpToolResult>;
  dispose(): Promise<void>;
}

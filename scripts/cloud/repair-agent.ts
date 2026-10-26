/** Extract completed MCP calls and recorded token usage from Codex JSONL. */
export function parseAgentEvents(text: string): {
  tools: string[];
  usage: unknown[];
  runtimeTargets: string[];
} {
  const tools: string[] = [],
    usage: unknown[] = [];
  const runtimeTargets = new Set<string>();
  for (const line of text.split('\n')) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event?.type === 'item.completed') {
      const i = event.item;
      if (
        i?.type === 'mcp_tool_call' &&
        i.status === 'completed' &&
        i.result?.isError !== true &&
        i.result?.is_error !== true &&
        !i.error &&
        typeof i.server === 'string' &&
        typeof i.tool === 'string'
      ) {
        tools.push(i.server + '.' + i.tool);
        const data =
          i.result?.structured_content ?? i.result?.structuredContent;
        if (
          i.server === 'domscribe' &&
          /targets[._]query|query[._]bySource/.test(i.tool) &&
          data?.browserConnected === true &&
          data.total === 1 &&
          (data.status === 'resolved' || data.selectionStatus === 'resolved')
        ) {
          const id = (data.context ?? data.runtime)?.componentProps?.line?.id;
          if (typeof id === 'string') runtimeTargets.add(id);
        }
      }
    }
    if (
      event?.type === 'turn.completed' &&
      typeof event.usage === 'object' &&
      event.usage !== null
    )
      usage.push(event.usage);
  }
  return { tools, usage, runtimeTargets: [...runtimeTargets] };
}

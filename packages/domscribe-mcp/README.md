# @domscribe/mcp

Standalone MCP server that connects coding agents to Domscribe's runtime context via the Model Context Protocol.

## Install

```bash
npm install @domscribe/mcp
```

Or use directly without installing:

```bash
npx -y @domscribe/mcp
```

Requires Node.js 20 or later.

## Usage

Add `domscribe` to your MCP server configuration. The server communicates over stdio and requires no additional setup beyond a running Domscribe relay daemon.

```json
{
  "mcpServers": {
    "domscribe": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@domscribe/mcp"]
    }
  }
}
```

The relay daemon starts automatically when you run your dev server with Domscribe configured. The MCP server connects to it on localhost and exposes the full Domscribe toolset to your coding agent.

## MCP Tools Reference

### Source Query (Code to UI)

Query source locations and retrieve live runtime context from the running browser session.

| Tool                        | Description                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `domscribe_query_by_source` | Query a source file and line number to get live runtime context from the browser (props, state, DOM snapshot) |
| `domscribe_manifest_query`  | Find all manifest entries by file path, component name, or element ID                                         |
| `domscribe_manifest_stats`  | Manifest coverage statistics (entry count, file count, component count, cache hit rate)                       |

### Element Resolution (UI to Code)

Resolve `data-ds` element IDs injected at build time back to their source locations.

| Tool                      | Description                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `domscribe_resolve`       | Resolve a single `data-ds` element ID to its ManifestEntry (file, line, col, component) |
| `domscribe_resolve_batch` | Resolve multiple element IDs in one call                                                |

### Annotation Workflow

Annotations are created when a developer clicks an element in the Domscribe overlay and enters intent. These tools drive the agent-side processing loop.

| Tool                                 | Description                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `domscribe_annotation_process`       | Atomically claim the next queued annotation (`claimNext`) — prevents concurrent agent conflicts |
| `domscribe_annotation_respond`       | Attach agent response and transition annotation to `PROCESSED`                                  |
| `domscribe_annotation_update_status` | Manually transition annotation status                                                           |
| `domscribe_annotation_get`           | Retrieve annotation by ID                                                                       |
| `domscribe_annotation_list`          | List annotations with status and filter options                                                 |
| `domscribe_annotation_search`        | Full-text search across annotation content                                                      |

### System

| Tool               | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `domscribe_status` | Relay daemon health, manifest stats, and queue counts |

### Naming grammar and legacy aliases

Tool names follow the MCP `^[a-zA-Z0-9_-]{1,64}$` grammar so they load in every MCP client (including Windsurf/Cascade, which rejects dots). The pre-RCP dotted names (e.g. `domscribe.status`) continue to resolve as deprecated aliases — invocations emit a deprecation warning on stderr and forward to the canonical handler. Legacy aliases will be removed in the first major release after RCP v1.0.0.

## MCP Prompts

Pre-built prompts that guide agents through common Domscribe workflows.

| Prompt              | Purpose                             |
| ------------------- | ----------------------------------- |
| `process_next`      | Guide through annotation processing |
| `check_status`      | Check relay status                  |
| `explore_component` | Explore component metadata          |
| `find_annotations`  | Search for annotations              |

## Example Responses

### `domscribe_query_by_source`

Returns the source location matched in the manifest plus live runtime data captured from the browser.

```json
{
  "sourceLocation": {
    "file": "src/components/Button.tsx",
    "line": 12,
    "column": 4,
    "componentName": "Button",
    "tagName": "button"
  },
  "runtime": {
    "componentProps": { "variant": "secondary", "onClick": "[Function]" },
    "componentState": { "hook_0": false, "hook_1": "idle" },
    "domSnapshot": {
      "tagName": "button",
      "attributes": { "class": "btn-secondary", "type": "submit" },
      "innerText": "Save changes"
    }
  },
  "browserConnected": true
}
```

### Annotation Object

Returned by `domscribe_annotation_get`, `domscribe_annotation_process`, and related tools.

```json
{
  "found": true,
  "annotationId": "ann_A1B2C3D4_1710500000",
  "userIntent": "Make this button use the primary color from the design system",
  "element": {
    "tagName": "button",
    "dataDs": "A1B2C3D4",
    "selector": "main > div > button",
    "attributes": { "class": "btn-secondary", "type": "submit" },
    "innerText": "Save changes"
  },
  "sourceLocation": {
    "file": "src/components/Button.tsx",
    "line": 12,
    "column": 4,
    "componentName": "Button",
    "tagName": "button"
  },
  "runtimeContext": {
    "componentProps": { "variant": "secondary", "onClick": "[Function]" },
    "componentState": { "hook_0": false, "hook_1": "idle" }
  }
}
```

## Links

Part of [Domscribe](https://github.com/patchorbit/domscribe).

## License

MIT

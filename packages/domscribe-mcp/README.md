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

| Tool                       | Description                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `domscribe.query.bySource` | Query a source file and line number to get live runtime context from the browser (props, state, DOM snapshot) |
| `domscribe.manifest.query` | Find all manifest entries by file path, component name, or element ID                                         |
| `domscribe.manifest.stats` | Manifest coverage statistics (entry count, file count, component count, cache hit rate)                       |

### Element Resolution (UI to Code)

Resolve `data-ds` element IDs injected at build time back to their source locations.

| Tool                      | Description                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `domscribe.resolve`       | Resolve a single `data-ds` element ID to its ManifestEntry (file, line, col, component) |
| `domscribe.resolve.batch` | Resolve multiple element IDs in one call                                                |

### Annotation Workflow

Annotations are created when a developer clicks an element in the Domscribe overlay and enters intent. These tools drive the agent-side processing loop.

| Tool                                | Description                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `domscribe.annotation.process`      | Atomically claim the next queued annotation (`claimNext`) — prevents concurrent agent conflicts |
| `domscribe.annotation.respond`      | Attach agent response and transition annotation to `PROCESSED`                                  |
| `domscribe.annotation.updateStatus` | Manually transition annotation status                                                           |
| `domscribe.annotation.get`          | Retrieve annotation by ID                                                                       |
| `domscribe.annotation.list`         | List annotations with status and filter options                                                 |
| `domscribe.annotation.search`       | Full-text search across annotation content                                                      |

### System

| Tool               | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `domscribe.status` | Relay daemon health, manifest stats, and queue counts |

## MCP Prompts

Pre-built prompts that guide agents through common Domscribe workflows.

| Prompt              | Purpose                             |
| ------------------- | ----------------------------------- |
| `process_next`      | Guide through annotation processing |
| `check_status`      | Check relay status                  |
| `explore_component` | Explore component metadata          |
| `find_annotations`  | Search for annotations              |

## Example Responses

### `domscribe.query.bySource`

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

Returned by `domscribe.annotation.get`, `domscribe.annotation.process`, and related tools.

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

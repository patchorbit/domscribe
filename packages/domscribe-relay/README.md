# @domscribe/relay

Local relay server and MCP adapter for Domscribe.

`@domscribe/relay` runs on the developer's machine and bridges the in-browser overlay with coding agents. It provides an HTTP API for annotation management, a WebSocket server for real-time overlay updates, and an MCP server for agent tool access.

## Install

```bash
npm install @domscribe/relay
```

## CLI Commands

The relay ships with a CLI that manages the server process and workspace initialization.

```bash
domscribe serve     # Start relay server (foreground or --daemon)
domscribe status    # Check relay daemon status
domscribe stop      # Stop relay daemon
domscribe init      # Setup wizard (agent + framework configuration)
domscribe mcp       # Run as MCP server via stdio
```

For use in agent MCP configuration, the standalone `domscribe-mcp` binary runs the MCP server directly over stdio without the HTTP/WebSocket relay.

**Monorepo support:** All commands automatically resolve the app root from a `domscribe.config.json` file when run from a monorepo root. Run `domscribe init --app-root <path>` to generate the config, or let the interactive wizard detect it.

## Annotation Lifecycle

A developer clicks an element in the running app, types an instruction, and submits it. The annotation moves through the following states:

| From         | To           | Trigger                                    |
| ------------ | ------------ | ------------------------------------------ |
| `QUEUED`     | `PROCESSING` | Agent calls `domscribe.annotation.process` |
| `PROCESSING` | `PROCESSED`  | Agent calls `domscribe.annotation.respond` |
| `PROCESSING` | `FAILED`     | Agent error or timeout                     |
| `PROCESSED`  | `ARCHIVED`   | Developer archives via overlay             |

The agent claims an annotation atomically (preventing double-processing), edits the relevant source files, then responds with a summary. The overlay receives the state change via WebSocket and updates in real time.

## WebSocket Events

The relay broadcasts events over WebSocket to keep connected overlay instances in sync.

| Event                                       | Description                           |
| ------------------------------------------- | ------------------------------------- |
| `CONNECT` / `CONNECTED` / `DISCONNECTED`    | Connection lifecycle                  |
| `ERROR`                                     | Connection error                      |
| `ANNOTATION_CREATED` / `ANNOTATION_UPDATED` | Annotation changes                    |
| `MANIFEST_UPDATED`                          | Manifest file changes                 |
| `CONTEXT_REQUEST` / `CONTEXT_RESPONSE`      | Bidirectional runtime context queries |

`CONTEXT_REQUEST` / `CONTEXT_RESPONSE` are used when an agent requests live component props or state from the browser — the relay forwards the request to the overlay, which queries the runtime and sends the response back through the same WebSocket connection.

## Links

Part of [Domscribe](https://github.com/patchorbit/domscribe).

## License

MIT

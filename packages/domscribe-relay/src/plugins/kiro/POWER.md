---
name: 'domscribe'
displayName: 'Domscribe'
description: 'Work with Domscribe — the pixel-to-code bridge that maps running UI elements to their exact source locations, capturing runtime context (props, state, DOM) for handoff to coding agents. Use when implementing features from captured UI annotations, querying runtime context for source locations, exploring component structure, or when user mentions annotations, queued tasks, UI changes, or asks about how elements render at runtime.'
keywords:
  [
    'domscribe',
    'annotation',
    'pixel-to-code',
    'ui-to-code',
    'ui',
    'element',
    'manifest',
    'component',
    'queued',
    'resolve',
    'runtime',
    'source',
    'query',
    'props',
    'state',
    'inspect',
    'source-location',
  ]
---

# Domscribe

Domscribe bridges running UI and source code. It maps every rendered element to its exact source location and captures live runtime context (props, state, DOM). This works in two directions:

- **UI → Code**: User clicks an element in the browser, Domscribe captures it as an annotation with source location, runtime context, and user intent. You claim and implement it.
- **Code → UI**: You're editing a source file and want to know what an element looks like at runtime. Query by file and line to get live props, state, and DOM snapshot.

## Quick Commands (MCP Prompts)

| Command             | Purpose                        |
| ------------------- | ------------------------------ |
| `process_next`      | Process next queued annotation |
| `check_status`      | System health and queue counts |
| `explore_component` | List elements in a component   |
| `find_annotations`  | Search annotation history      |

## All Tools Reference

### Source Query (Code → UI)

| Tool                       | Purpose                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `domscribe.query.bySource` | Get runtime context for a source location (file + line)    |
| `domscribe.manifest.query` | Find all manifest entries by file, component, or tag name  |
| `domscribe.manifest.stats` | Manifest coverage statistics (entry/file/component counts) |

### Element Resolution (UI → Code)

| Tool                      | Purpose                            |
| ------------------------- | ---------------------------------- |
| `domscribe.resolve`       | Get source location for element ID |
| `domscribe.resolve.batch` | Resolve multiple element IDs       |

### Annotation Workflow

| Tool                                | Purpose                               |
| ----------------------------------- | ------------------------------------- |
| `domscribe.annotation.process`      | Claim next queued annotation (atomic) |
| `domscribe.annotation.respond`      | Store your implementation message     |
| `domscribe.annotation.updateStatus` | Mark as `processed` or `failed`       |
| `domscribe.annotation.list`         | List annotations by status            |
| `domscribe.annotation.get`          | Get full annotation details           |
| `domscribe.annotation.search`       | Search by element, file, or text      |

### System

| Tool               | Purpose                              |
| ------------------ | ------------------------------------ |
| `domscribe.status` | Relay health, manifest, queue counts |

## Using `domscribe.query.bySource`

When you're working in a source file and want to understand what an element looks like at runtime, query by file path and line number:

**Input:**

- **`file`** (required): Absolute file path as stored in the manifest. Use `manifest_query` to discover exact paths.
- **`line`** (required): Line number (1-indexed).
- **`tolerance`** (optional): Match elements within N lines of the target (default: 0, exact match).
- **`column`** (optional): Narrow to a specific column (0-indexed).
- **`includeRuntime`** (optional): Skip the browser query if you only need manifest data (default: true).

**Output:**

- **`sourceLocation`**: Confirmed file, line range, tag name, component name.
- **`runtime`**: Live data from the browser (if connected) — `componentProps`, `componentState`, `domSnapshot` (tag, attributes, innerText).
- **`browserConnected`**: Whether a browser client is connected via WebSocket.

Use `domscribe.manifest.query` first if you don't know the exact line — it returns all entries for a file, component, or tag, which you can then target with `domscribe.query.bySource`.

## Annotation Lifecycle

```
queued -> processing -> processed
                     -> failed (with errorDetails)
       any status -> archived
```

- **queued**: Waiting for agent to claim
- **processing**: Agent is working on it (claimed atomically)
- **processed**: Successfully implemented
- **failed**: Could not implement (include `errorDetails`)
- **archived**: Removed from active queue

## Standard Workflow

1. **Claim** an annotation via `domscribe.annotation.process`

2. **Understand** the response:
   - `userIntent`: What the user wants (e.g., "Make this button red")
   - `sourceLocation.file`: Source file path
   - `sourceLocation.line`: Line number
   - `sourceLocation.componentName`: React/Vue component name
   - `element.innerText`: Visible text (verify correct element)
   - `runtimeContext.componentProps`: Current prop values

3. **Navigate** to `sourceLocation.file:sourceLocation.line`

4. **Implement** the change based on `userIntent`

5. **Store** your response via `domscribe.annotation.respond` with the annotation ID and a message describing what you did

6. **Complete** the annotation via `domscribe.annotation.updateStatus` with status `processed` (or `failed` with `errorDetails`)

## Error Handling

| Situation                 | Action                                                 |
| ------------------------- | ------------------------------------------------------ |
| `found: false`            | No match — queue empty or no manifest entry            |
| `browserConnected: false` | Runtime data unavailable; manifest data still returned |
| Source file missing       | Mark `failed` with details                             |
| Ambiguous intent          | Ask user for clarification before implementing         |
| Partial success           | Mark `processed`, note limitations in response         |
| Cannot implement          | Mark `failed` with `errorDetails` explaining why       |

## Key Principles

- Read `userIntent` carefully — it's the user's actual words
- Use `query_bySource` to verify runtime state before and after changes
- Use `element.innerText` to confirm you're changing the right element
- Use `runtimeContext` to understand current component state
- Make minimal, focused changes
- Provide clear explanation via `domscribe.annotation.respond`
- Search with `domscribe.annotation.search` to check for related prior work

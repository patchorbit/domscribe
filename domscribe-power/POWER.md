---
name: 'domscribe'
displayName: 'Domscribe'
author: 'Patch Orbit'
description: 'Pixel-to-code bridge that maps running UI elements to exact source locations, capturing runtime context (props, state, DOM) for handoff to coding agents via MCP.'
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

## Editing Components (Code → UI)

**Why query runtime state?** Source code alone doesn't tell you what props a component actually received, whether a conditional branch rendered, what CSS classes were applied, or what text the user sees. `domscribe.query.bySource` gives you the live truth from the browser.

**When to query (these tasks benefit):**

- **Visual/styling bugs** — "the button is the wrong color." Query reveals the actual `className`, inline styles, and computed attributes so you can see what CSS is winning.
- **Conditional rendering bugs** — "this section doesn't show up." Query tells you `rendered: false` or shows the actual props/state that control the condition.
- **Prop tracing** — "the title shows 'undefined'." Query shows `componentProps` with the actual values flowing through, revealing where the chain breaks.
- **Verifying your edit worked** — After editing, query the same location to confirm the DOM, props, and text updated as expected (HMR will have applied your change).

**When NOT to query (save the round-trip):**

- Pure logic changes (utils, hooks with no DOM output, API calls)
- Creating new files or components from scratch (nothing to query yet)
- Refactoring (renames, extractions, moves)
- Type errors or build failures (the compiler already tells you what's wrong)

**Prerequisite:** Runtime queries require the user's dev server to be running and the target component to be rendered in an open browser tab. Before calling `domscribe.query.bySource`, confirm with the user that they have the relevant page open. If you get `browserConnected: false` or `runtime.rendered: false`, ask the user to navigate to the page that renders the component and retry.

**Workflow:**

1. **Confirm the page is open** — ask the user if they have the page with the target component open in their browser. If not, ask them to navigate there first.
2. **Before editing** (if the task matches the scenarios above): Call `domscribe.query.bySource` with the file path and line number. Inspect `runtime.componentProps`, `runtime.componentState`, and `runtime.domSnapshot`.
3. **Edit** the component source code.
4. **After editing**: Call `domscribe.query.bySource` again to verify your changes took effect in the live browser.

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

5. **Verify** via `domscribe.query.bySource` — call with the same file and line to confirm your changes are reflected in the live browser (HMR will have updated the page)

6. **Store** your response via `domscribe.annotation.respond` with the annotation ID and a message describing what you did

7. **Complete** the annotation via `domscribe.annotation.updateStatus` with status `processed` (or `failed` with `errorDetails`)

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

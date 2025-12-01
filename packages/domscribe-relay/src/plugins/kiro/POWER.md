---
name: 'domscribe'
displayName: 'Domscribe'
description: 'Process UI annotations from Domscribe. Use when implementing features from captured UI interactions, processing the annotation queue, working with pixel-to-code workflows, or when user mentions annotations, queued tasks, or UI changes.'
keywords:
  [
    'domscribe',
    'annotation',
    'pixel-to-code',
    'ui',
    'element',
    'manifest',
    'component',
    'queued',
    'resolve',
  ]
---

# Domscribe Annotation Processing

Domscribe captures user interactions with UI elements, maps them to source code, and queues them for implementation. Each annotation contains:

- **userIntent**: What the user wants changed (their actual words)
- **element**: DOM element details (tag, selector, attributes, text)
- **sourceLocation**: Exact file, line, and component in source code
- **runtimeContext**: Component props/state at capture time (React/Vue)

## Quick Commands (MCP Prompts)

| Command                              | Purpose                        |
| ------------------------------------ | ------------------------------ |
| `/mcp__domscribe__process_next`      | Process next queued annotation |
| `/mcp__domscribe__check_status`      | System health and queue counts |
| `/mcp__domscribe__explore_component` | List elements in a component   |
| `/mcp__domscribe__find_annotations`  | Search annotation history      |

## All Tools Reference

### Core Workflow

| Tool                       | Purpose                               |
| -------------------------- | ------------------------------------- |
| `annotations_process`      | Claim next queued annotation (atomic) |
| `annotations_respond`      | Store your implementation message     |
| `annotations_updateStatus` | Mark as `processed` or `failed`       |

### Discovery & Search

| Tool                 | Purpose                          |
| -------------------- | -------------------------------- |
| `annotations_list`   | List annotations by status       |
| `annotations_get`    | Get full annotation details      |
| `annotations_search` | Search by element, file, or text |

### Resolution & Manifest

| Tool             | Purpose                             |
| ---------------- | ----------------------------------- |
| `resolve`        | Get source location for element ID  |
| `resolve_batch`  | Resolve multiple elements at once   |
| `manifest_query` | Find elements by file/component/tag |
| `manifest_stats` | Manifest coverage statistics        |

### System

| Tool     | Purpose                              |
| -------- | ------------------------------------ |
| `status` | Relay health, manifest, queue counts |

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

1. **Claim** an annotation:

   ```
   mcp__domscribe__annotations_process()
   ```

2. **Understand** the response:
   - `userIntent`: What the user wants (e.g., "Make this button red")
   - `sourceLocation.file`: Source file path
   - `sourceLocation.line`: Line number
   - `sourceLocation.componentName`: React/Vue component name
   - `element.innerText`: Visible text (verify correct element)
   - `runtimeContext.componentProps`: Current prop values

3. **Navigate** to `sourceLocation.file:sourceLocation.line`

4. **Implement** the change based on `userIntent`

5. **Store** your response:

   ```
   mcp__domscribe__annotations_respond(
     annotationId: "...",
     message: "Changed button color to red by updating className"
   )
   ```

6. **Complete** the annotation:

   ```
   mcp__domscribe__annotations_updateStatus(
     annotationId: "...",
     status: "processed"
   )
   ```

## Error Handling

| Situation           | Action                                           |
| ------------------- | ------------------------------------------------ |
| `found: false`      | Queue is empty, inform user                      |
| Source file missing | Mark `failed` with details                       |
| Ambiguous intent    | Ask user for clarification before implementing   |
| Partial success     | Mark `processed`, note limitations in response   |
| Cannot implement    | Mark `failed` with `errorDetails` explaining why |

## Key Principles

- Read `userIntent` carefully—it's the user's actual words
- Use `element.innerText` to verify you're changing the right element
- Use `runtimeContext` to understand current component state
- Make minimal, focused changes
- Provide clear explanation in `annotations_respond`
- Search with `annotations_search` to check for related prior work

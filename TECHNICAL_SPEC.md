# Domscribe Technical Specification

**Version:** 0.0.1-dev.152
**Last Updated:** 2026-03-15
**License:** MIT
**Author:** Kaushik Gnanaskandan

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Package Specifications](#3-package-specifications)
4. [Data Flow & Lifecycle](#4-data-flow--lifecycle)
5. [Core Algorithms](#5-core-algorithms)
6. [Data Schemas & Protocols](#6-data-schemas--protocols)
7. [Build System & Tooling](#7-build-system--tooling)
8. [Testing Architecture](#8-testing-architecture)
9. [Framework Support Matrix](#9-framework-support-matrix)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Security & Privacy](#11-security--privacy)

---

## 1. Overview

Domscribe is a pixel-to-code development tool that bridges the gap between running web applications and their source code. It enables developers to:

1. **Click elements** in a running web app via an in-browser overlay UI
2. **Capture runtime context** — component props, state, event bindings, and framework metadata
3. **Map interactions to exact source locations** — file path, line, column, component name
4. **Hand off context to coding agents** via the Model Context Protocol (MCP)

The system operates exclusively in development mode. Production builds strip all Domscribe artifacts (data attributes, overlay scripts, relay connections) to zero runtime cost.

### Design Principles

- **Zero production impact** — All instrumentation is dev-only; production builds contain no Domscribe code or metadata
- **Framework-agnostic core** — Shared types, schemas, and protocols are decoupled from any specific framework
- **Append-only persistence** — The manifest uses JSONL format with hash-based staleness tracking for crash safety
- **Stable IDs across HMR** — Element IDs survive hot module replacement via content-hash caching (>80% cache hit rate)
- **Shadow DOM isolation** — The overlay UI uses Lit web components with shadow DOM to prevent CSS/JS conflicts with the host application

---

## 2. System Architecture

### 2.1 High-Level Component Diagram

```
+------------------------------------------------------------------------+
|                        Developer's Browser                             |
|                                                                        |
|  +----------------+   +----------------+   +------------------------+  |
|  | Host App       |   | Runtime        |   | Overlay (Lit)          |  |
|  | (React/Vue)    |<--| Manager        |<--| ds-tab, ds-sidebar,    |  |
|  | + data-ds      |   | + Adapter      |   | ds-picker-overlay      |  |
|  | attributes     |   | (Fiber/VNode)  |   | (Shadow DOM)           |  |
|  +----------------+   +-------+--------+   +-----------+------------+  |
|                                |                        |              |
|                                |    HTTP/WebSocket      |              |
|                                +-----------+------------+              |
+-------------------------------------------|----------------------------+
                                            |
                                +-----------v------------+
                                |    Relay Server        |
                                |    (Fastify)           |
                                |    Port: dynamic       |
                                |                        |
                                |  +------------------+  |
                                |  | REST API         |  |
                                |  | /annotations     |  |
                                |  | /manifest        |  |
                                |  | /status          |  |
                                |  +------------------+  |
                                |  +------------------+  |
                                |  | WebSocket        |  |
                                |  | Real-time events |  |
                                |  +------------------+  |
                                |  +------------------+  |
                                |  | MCP Server       |  |
                                |  | Tools & Prompts  |  |
                                |  +------------------+  |
                                +-----------+------------+
                                            |
                                +-----------v------------+
                                | Coding Agent (Claude)  |
                                | via MCP Protocol       |
                                +------------------------+
```

### 2.2 Build-Time Pipeline

```
Source File (.tsx/.vue)
        |
        v
+--------------------+     +---------------------+     +--------------------+
| Bundler Plugin     |---->| DomscribeInjector   |---->| IDStabilizer       |
| (Vite/Webpack)     |     | (AST Transform)     |     | (xxhash + cache)   |
+--------------------+     +---------+-----------+     +--------------------+
                                     |
                       +-------------+-------------+
                       v             v             v
               Transformed     Source Map     ManifestEntries
               Code + data-ds  (.map)         (-> JSONL file)
               attributes
                                                   |
                                                   v
                                     +--------------------+
                                     | BatchWriter        |
                                     | (50 entries/       |
                                     |  100ms flush)      |
                                     +---------+----------+
                                               v
                                     .domscribe/manifest.jsonl
```

### 2.3 Package Dependency Graph

```
@domscribe/core ─────────────────────────────────────────── Foundation
    │
    ├── @domscribe/manifest ─────────────────────────────── Index Management
    │       │
    │       ├── @domscribe/transform ────────────────────── AST Injection
    │       │       │
    │       │       ├── @domscribe/next ─────────────────── Next.js Integration
    │       │       └── @domscribe/nuxt ─────────────────── Nuxt 3 Module
    │       │
    │       └── @domscribe/relay ────────────────────────── Dev Server + MCP
    │
    ├── @domscribe/runtime ──────────────────────────────── Browser Context Capture
    │       │
    │       ├── @domscribe/react ────────────────────────── React Adapter
    │       ├── @domscribe/vue ──────────────────────────── Vue 3 Adapter
    │       └── @domscribe/overlay ──────────────────────── Lit UI Components
    │               │
    │               └── (depends on runtime + relay)
    │
    └── (shared types, schemas, constants, errors)
```

### 2.4 Module Boundary Enforcement

Enforced at lint time via `@nx/enforce-module-boundaries`:

| Scope Tag       | Allowed Dependencies                                        |
| --------------- | ----------------------------------------------------------- |
| `scope:core`    | `scope:core`                                                |
| `scope:infra`   | `scope:core`, `scope:infra`                                 |
| `scope:build`   | `scope:core`, `scope:infra`                                 |
| `scope:adapter` | `scope:core`, `scope:infra`, `scope:build`, `scope:adapter` |

---

## 3. Package Specifications

### 3.1 @domscribe/core

**Purpose:** Shared types, Zod schemas, utilities, constants, and error handling.

**Dependencies:** `nanoid`, `zod`

#### Exported Types & Schemas

| Export                  | Type              | Description                                                                      |
| ----------------------- | ----------------- | -------------------------------------------------------------------------------- |
| `Annotation`            | Zod schema + type | Complete user interaction record with metadata, interaction details, and context |
| `AnnotationStatus`      | Enum              | `QUEUED`, `PROCESSING`, `PROCESSED`, `FAILED`, `ARCHIVED`                        |
| `AnnotationInteraction` | Zod schema        | Element click or text selection data                                             |
| `AnnotationContext`     | Zod schema        | Page URL, viewport, user agent, DOM/manifest snapshots                           |
| `RuntimeContext`        | Zod schema        | Captured props, state, event flow, performance metrics                           |
| `InteractionMode`       | Enum              | `ELEMENT_CLICK`, `TEXT_SELECTION`                                                |
| `ManifestEntry`         | Zod schema + type | DOM-to-source mapping (file, line/column, tag name, component name)              |
| `ManifestEntryId`       | Type              | 8-character nanoid (custom alphabet: `0-9A-HJ-NP-Za-hj-np-z`)                    |
| `Manifest`              | Zod schema        | Collection of entries with metadata                                              |
| `ManifestIndex`         | Type              | Fast lookup maps (`idToFile`, `fileToIds`, `componentToIds`)                     |
| `SourcePosition`        | Zod schema        | `{ line, column, offset }`                                                       |
| `StyleInfo`             | Zod schema        | CSS file path, class names, modules flag, inline styles                          |
| `ComponentMetadata`     | Zod schema        | Framework-specific component data                                                |

#### Error System (RFC 7807)

```typescript
class DomscribeError extends Error {
  code: DomscribeErrorCode;
  title: string;
  detail: string;
  status: number;
  extensions?: Record<string, unknown>;
}
```

Error codes: `DS_VALIDATION_FAILED`, `DS_MANIFEST_INVALID`, `DS_MANIFEST_NOTFOUND`, `DS_ELEMENT_NOT_FOUND`, `DS_ANNOTATION_*`, `DS_TRANSFORM_FAILED`, `DS_RELAY_*`, `DS_MCP_*`

#### Constants

| Constant         | Content                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `API_PATHS`      | REST endpoints: `/annotations`, `/manifest`, `/manifest/resolve-by-source`, `/status`, `/ws` |
| `WS_EVENTS`      | WebSocket events: `ANNOTATION_CREATED`, `MANIFEST_UPDATED`, etc.                             |
| `PATTERNS`       | Regex: `MANIFEST_ENTRY_ID`, `ANNOTATION_ID`, `NAMESPACED_ID`                                 |
| `DEFAULT_CONFIG` | Relay host/port, health check timeouts                                                       |
| `PATHS`          | File system: `.domscribe/*`, `manifest.jsonl`, `manifest.index.json`                         |
| `HTTP_STATUS`    | Standard HTTP codes                                                                          |

#### Utilities

| Function                 | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `generateEntryId()`      | 8-char nanoid with custom alphabet (no ambiguous chars) |
| `generateAnnotationId()` | Format: `ann_<nanoid>_<timestamp>`                      |
| `isValidElementId()`     | Validates entry ID format                               |
| `migrateAnnotation()`    | Schema migration ("migrate on read" pattern)            |

---

### 3.2 @domscribe/manifest

**Purpose:** Manages the append-only JSONL manifest that maps DOM elements to source code locations.

**Dependencies:** `@domscribe/core`, `xxhash-wasm`, `zod`

#### Components

**ManifestWriter** (singleton per workspace)

- `getInstance()` / `initialize()` / `close()` — lifecycle
- `appendEntries(entries[])` — batch write with deduplication
- `resolveId(id)` — check existence in O(1)
- `getEntriesByFile(path)` — O(1) file lookup via index
- Triggers compaction on close if entry count exceeds threshold (default: 500)

**ManifestReader** (for relay runtime resolution)

- `resolve(id)` — O(1) entry lookup with cache hit tracking
- Three indices: `idToEntry`, `fileToIds`, `componentToIds`
- `reload()` — watch file changes, emit `MANIFEST_UPDATED` events
- `onEvent(callback)` — subscribe to manifest change events

**IDStabilizer** (HMR-stable ID generation)

- `getStableId(filePath, position)` — content-hash-based stable ID
- Algorithm: `xxhash64(fileContent)` + position cache → >80% HMR cache hit rate
- Atomic cache persistence (temp file + rename)

**BatchWriter** (buffered I/O)

- Buffer size: 50 entries, flush interval: 100ms
- Automatic flush on process exit
- Stats: total written, flush count, timing

**ManifestCompactor** (garbage collection)

- Removes entries for deleted files
- Keeps only latest `fileHash` per file
- Atomic rewrite (temp file + rename)

#### Storage Format

```
# .domscribe/manifest.jsonl (append-only)
{"id":"A1B2C3D4","file":"src/App.tsx","start":{"line":5,"column":4},"end":{"line":5,"column":30},"tagName":"div","fileHash":"a1b2c3d4e5f6"}
{"id":"E5F6G7H8","file":"src/App.tsx","start":{"line":8,"column":6},"end":{"line":8,"column":42},"tagName":"Button","componentName":"Button","fileHash":"a1b2c3d4e5f6"}
```

---

### 3.3 @domscribe/runtime

**Purpose:** Browser-side context capture — extracts component props, state, and metadata from live DOM elements.

**Dependencies:** `@domscribe/core`

#### RuntimeManager (singleton)

```typescript
interface RuntimeOptions {
  phase: 1 | 2; // initialization phase
  adapter: FrameworkAdapter;
  debug?: boolean;
  redactPII?: boolean; // default: true
  blockSelectors?: string[];
}
```

- Skips initialization if `window.__DOMSCRIBE_RELAY_PORT__` is not set (production guard)
- `captureForElement(element)` → `RuntimeContext`

#### FrameworkAdapter Interface

```typescript
interface FrameworkAdapter {
  name: string;
  version: string;
  getComponentInstance(element: HTMLElement): unknown;
  captureProps(component: unknown): Record<string, unknown>;
  captureState(component: unknown): Record<string, unknown>;
  getComponentName?(component: unknown): string;
  getComponentTree?(component: unknown): ComponentTreeNode[];
}
```

#### Serialization

Handles circular references, depth limiting (default: 10 levels), and special types:

| Input Type   | Serialized Output                     |
| ------------ | ------------------------------------- |
| `Function`   | `"[Function]"`                        |
| `Symbol`     | `"[Symbol: description]"`             |
| `Map`        | `{ __type: "Map", entries: [...] }`   |
| `Set`        | `{ __type: "Set", values: [...] }`    |
| `Date`       | ISO string                            |
| `RegExp`     | `{ __type: "RegExp", source, flags }` |
| `Error`      | `{ name, message, stack }`            |
| `BigInt`     | `{ __type: "BigInt", value: string }` |
| Circular ref | `"[Circular]"`                        |

#### Bridge System

Pluggable transport layer for runtime ↔ overlay communication:

- `DirectTransport` — synchronous method dispatch (same-frame)
- `EventTransport` — async event-based dispatch (cross-frame)

---

### 3.4 @domscribe/relay

**Purpose:** Local development server providing REST API, WebSocket events, and MCP server for coding agents.

**Dependencies:** `@domscribe/core`, `@domscribe/manifest`, `fastify`, `@fastify/cors`, `@fastify/websocket`, `@modelcontextprotocol/sdk`, `commander`, `zod`

#### CLI

| Command            | Description                                 |
| ------------------ | ------------------------------------------- |
| `domscribe serve`  | Start relay server                          |
| `domscribe init`   | Initialize workspace (create `.domscribe/`) |
| `domscribe status` | Check relay daemon status                   |
| `domscribe stop`   | Stop relay daemon                           |
| `domscribe-mcp`    | Run as MCP server (stdio transport)         |

#### REST API Endpoints

| Method   | Path                                 | Description                                 |
| -------- | ------------------------------------ | ------------------------------------------- |
| `GET`    | `/api/status`                        | Server status + manifest stats              |
| `GET`    | `/api/health`                        | Health check                                |
| `GET`    | `/api/annotations`                   | List all annotations                        |
| `GET`    | `/api/annotations/:id`               | Get annotation by ID                        |
| `POST`   | `/api/annotations`                   | Create annotation                           |
| `PATCH`  | `/api/annotations/:id`               | Update annotation                           |
| `DELETE` | `/api/annotations/:id`               | Delete annotation                           |
| `GET`    | `/api/manifest`                      | Query manifest entries                      |
| `GET`    | `/api/manifest/:id`                  | Resolve single entry                        |
| `POST`   | `/api/v1/manifest/resolve-by-source` | Query manifest + runtime by source location |
| `GET`    | `/ws`                                | WebSocket upgrade                           |

#### WebSocket Events

| Event                | Payload          | Direction       |
| -------------------- | ---------------- | --------------- |
| `ANNOTATION_CREATED` | `Annotation`     | Server → Client |
| `ANNOTATION_UPDATED` | `Annotation`     | Server → Client |
| `ANNOTATION_DELETED` | `{ id }`         | Server → Client |
| `MANIFEST_UPDATED`   | `{ entryCount }` | Server → Client |
| `STATUS_CHANGED`     | `{ status }`     | Server → Client |

#### MCP Tools (for coding agents)

> The agent-facing surface — tool/prompt names, wire schemas, error envelope, and stability policy — is specified by [RCP v1.0.0](./docs/rcp/v1.md), versioned independently as `@domscribe/protocol@1.0.0`. The table below summarises what this implementation exposes; the spec is the contract.

| Tool                       | Description                                                                    |
| -------------------------- | ------------------------------------------------------------------------------ |
| `annotation-get`           | Retrieve annotation by ID                                                      |
| `annotation-list`          | List annotations with filtering                                                |
| `annotation-search`        | Search annotations by content                                                  |
| `annotation-process`       | Mark annotation as processing                                                  |
| `annotation-respond`       | Add agent response to annotation                                               |
| `annotation-update-status` | Transition annotation status                                                   |
| `manifest-query`           | Query manifest entries by file, component, or ID                               |
| `query-by-source`          | Query by source file + position; returns manifest entry + live runtime context |

#### MCP Prompts

| Prompt              | Purpose                             |
| ------------------- | ----------------------------------- |
| `check-status`      | Get system status overview          |
| `explore-component` | Deep-dive into a specific component |
| `find-annotations`  | Discover pending annotations        |
| `process-next`      | Process the next queued annotation  |

#### Daemon Lifecycle

- **Lock-based singleton:** File lock at `.domscribe/relay.lock` (PID + port)
- **RelayControl.ensureRunning():** Start if not running, return host:port
- **Health check:** HTTP polling with 500ms timeout, 5s max wait
- **Graceful shutdown:** SIGTERM handler releases lock + closes connections

#### Client Libraries

- `RelayHttpClient` — REST communication (`@domscribe/relay/client`)
- `RelayWebsocketClient` — WebSocket real-time events

---

### 3.5 @domscribe/overlay

**Purpose:** In-browser UI built with Lit web components (shadow DOM) for element selection, context viewing, and annotation management.

**Dependencies:** `@domscribe/core`, `@domscribe/runtime`, `@domscribe/relay`, `lit`

#### Web Components

| Component             | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| `ds-overlay`          | Root container, manages mode transitions                            |
| `ds-tab`              | Draggable tab (right edge), pointer capture with 4px drag threshold |
| `ds-sidebar`          | Resizable annotation sidebar                                        |
| `ds-header`           | Status bar with relay connection indicator                          |
| `ds-annotation-list`  | Scrollable list of annotations grouped by status                    |
| `ds-annotation-item`  | Individual annotation with expand/collapse, actions                 |
| `ds-annotation-input` | Text input with submit button                                       |
| `ds-context-panel`    | Props/state viewer with collapsible sections                        |
| `ds-element-preview`  | Tag name, component name, source location                           |
| `ds-highlight-box`    | Bounding rectangle overlay on hovered/selected element              |
| `ds-picker-overlay`   | Full-page overlay for element selection mode                        |
| `ds-tooltip`          | Contextual help tooltips                                            |

#### OverlayStore (singleton reactive state)

```typescript
interface OverlayState {
  mode: 'collapsed' | 'expanded' | 'picker';
  sidebarWidth: number;
  tabOffsetY: number; // 0-100%, persisted to localStorage
  relayConnected: boolean;
  relayPort: number;
  relayHost: string;
  selectedElement: HTMLElement | null;
  selectedEntryId: string | null;
  hoveredElement: HTMLElement | null;
  runtimeContext: RuntimeContext | null;
  manifestEntry: ManifestEntry | null;
  annotations: Annotation[];
  annotationInput: string;
  activeAnnotationId: string | null;
  isSubmitting: boolean;
}
```

#### Subpath Exports

| Path                           | Description                         |
| ------------------------------ | ----------------------------------- |
| `@domscribe/overlay`           | Main entry (all components + store) |
| `@domscribe/overlay/auto-init` | Lazy-loading auto-initialization    |

---

### 3.6 @domscribe/transform

**Purpose:** AST-level injection of stable `data-ds` attributes into JSX/Vue templates, plus bundler plugins.

**Dependencies:** `@domscribe/core`, `@domscribe/manifest`, `@domscribe/relay`, `acorn`, `acorn-jsx`, `acorn-walk`, `@babel/parser`, `@babel/types`, `magic-string`, `source-map`

#### DomscribeInjector

```typescript
class DomscribeInjector {
  initialize(options: InjectorOptions): Promise<void>;
  inject(source: string, params: InjectParams): Promise<InjectorResult>;
}

interface InjectParams {
  sourceFile: string;
  sourceMapConsumer?: SourceMapConsumer; // for TypeScript source maps
}

interface InjectorResult {
  code: string; // transformed source with data-ds attributes
  map: SourceMap; // magic-string source map
  manifestEntries: ManifestEntry[];
  metrics: FileMetrics; // parse, traversal, injection timing
}
```

#### Parser Implementations

| Parser         | Use Case                      | Performance           |
| -------------- | ----------------------------- | --------------------- |
| `AcornParser`  | JavaScript/JSX (default)      | Fastest               |
| `BabelParser`  | TypeScript/TSX                | Full TS support       |
| `VueSFCParser` | Vue 3 SFCs (`<script setup>`) | Vue template + script |

Parser interface:

```typescript
interface ParserInterface {
  parse(source: string): AST;
  findJSXOpeningElements(ast: AST): JSXElement[];
  hasDataDsAttribute(element: JSXElement): boolean;
  getLocation(element: JSXElement): SourcePosition;
  getTagName(element: JSXElement): string;
  getInsertPosition(element: JSXElement): number;
}
```

#### Bundler Plugins

| Subpath Export                           | Plugin           | Target                        |
| ---------------------------------------- | ---------------- | ----------------------------- |
| `@domscribe/transform/plugins/vite`      | Vite plugin      | `{ domscribe }`               |
| `@domscribe/transform/plugins/webpack`   | Webpack plugin   | `{ DomscribeWebpackPlugin }`  |
| `@domscribe/transform/webpack-loader`    | Webpack loader   | String path for loader chains |
| `@domscribe/transform/plugins/turbopack` | Turbopack plugin | Next.js 16+                   |
| `@domscribe/transform/turbopack-loader`  | Turbopack loader | String path                   |

#### Transform Statistics

```typescript
interface TransformStats {
  filesProcessed: number;
  elementsFound: number;
  elementsInjected: number;
  timing: {
    totalMs: number;
    parseMs: { p50; p95; p99 };
    traversalMs: { p50; p95; p99 };
    sourceMapConsumerMs: { p50; p95; p99 };
  };
}
```

---

### 3.7 @domscribe/react

**Purpose:** React framework adapter for runtime context capture.

**Dependencies:** `@domscribe/core`, `@domscribe/runtime`
**Peer Dependencies:** `react >=16.8.0`

#### ReactAdapter

Capture strategies (in priority order):

1. **DEVTOOLS** — React DevTools hook (most reliable, requires DevTools installed)
2. **FIBER** — Direct Fiber tree access (fast, uses React internals)
3. **BEST_EFFORT** — Fallback heuristics

Key capabilities:

- **Fiber traversal** via `FiberWalker` — `walkUp()`, `walkDown()`, `walkSiblings()`
- **Component categorization** — Functional, Class, ForwardRef, Memo, HOC
- **HOC detection** — Recognizes `withRouter`, `connect`, `styled`, `memo`, `forwardRef` wrappers
- **Hook state extraction** — Traverses `memoizedState` linked list for `useState`, `useReducer`, `useContext`
- **Props extraction** — From `fiber.memoizedProps` with safe serialization

#### Subpath Exports

| Path                         | Description                         |
| ---------------------------- | ----------------------------------- |
| `@domscribe/react/vite`      | Vite plugin (auto-loads adapter)    |
| `@domscribe/react/webpack`   | Webpack plugin (auto-loads adapter) |
| `@domscribe/react/auto-init` | Auto-initialization module          |

---

### 3.8 @domscribe/vue

**Purpose:** Vue 3 framework adapter for runtime context capture.

**Dependencies:** `@domscribe/core`, `@domscribe/runtime`
**Peer Dependencies:** `vue >=3.3.0`

#### VueAdapter

- DOM → VNode → component resolution via `__vueParentComponent`
- Reactive proxy unwrapping (`toRaw`/`toValue`)
- Supports both Composition API and Options API
- Component tree traversal via VNode hierarchy

#### Subpath Exports

| Path                       | Description                |
| -------------------------- | -------------------------- |
| `@domscribe/vue/vite`      | Vite plugin                |
| `@domscribe/vue/webpack`   | Webpack plugin             |
| `@domscribe/vue/auto-init` | Auto-initialization module |

---

### 3.9 @domscribe/next

**Purpose:** Next.js integration via Webpack/Turbopack config wrapping.

**Dependencies:** `@domscribe/transform`, `@domscribe/runtime`, `@domscribe/react`
**Peer Dependencies:** `next >=15.0.0`, `react ^18.0.0 || ^19.0.0`

#### withDomscribe(nextConfig)

Config wrapper that:

- Applies transform plugin in dev mode only
- Injects relay globals + overlay scripts via HTML
- Aliases `@domscribe/overlay` to no-op stub in production (zero bundle impact)
- Supports both Webpack (Next 15) and Turbopack (Next 16+)

#### DomscribeDevProvider

React component (client-only) that initializes RuntimeManager + RelayService on mount.

#### Configuration

```typescript
interface DomscribeNextOptions {
  enabled?: boolean;
  include?: string[];
  exclude?: string[];
  debug?: boolean;
  relay?: { autoStart?: boolean; port?: number; host?: string };
  overlay?: { enabled?: boolean; options?: OverlayOptions };
}
```

#### Subpath Exports

| Path                           | Description                    |
| ------------------------------ | ------------------------------ |
| `@domscribe/next/runtime`      | DomscribeDevProvider component |
| `@domscribe/next/noop/overlay` | Production no-op stub          |

---

### 3.10 @domscribe/nuxt

**Purpose:** Nuxt 3 module for zero-config integration.

**Dependencies:** `@domscribe/relay`, `@domscribe/transform`, `@domscribe/runtime`, `@domscribe/vue`
**Peer Dependencies:** `nuxt >=3.0.0`

#### Module Behavior

- Auto-starts relay daemon in dev mode
- Injects relay globals via `app.head` (bypasses Vite's `transformIndexHtml` which Nuxt doesn't use)
- Applies Vite + Webpack plugins for AST injection
- Registers client-only runtime plugin for RuntimeManager + VueAdapter initialization

```typescript
interface DomscribeNuxtOptions {
  debug?: boolean;
  overlay?: { enabled?: boolean; options?: OverlayOptions };
  relay?: { autoStart?: boolean; port?: number; host?: string };
}
```

---

## 4. Data Flow & Lifecycle

### 4.1 Build-Time Transform Flow

```
1. Developer saves .tsx/.vue file
2. Bundler (Vite/Webpack) triggers transform
3. Domscribe plugin intercepts file
4. Parser (Acorn/Babel/VueSFC) produces AST
5. Injector finds all JSX opening elements
6. For each element without existing data-ds:
   a. IDStabilizer generates/retrieves stable ID (xxhash64 + position cache)
   b. ManifestEntry created (file, line, column, tagName, componentName, fileHash)
   c. magic-string injects data-ds="<id>" attribute
7. BatchWriter buffers manifest entries
8. Flush to .domscribe/manifest.jsonl (every 50 entries or 100ms)
9. Transformed code + source map returned to bundler
```

### 4.2 Runtime Capture Flow

```
1. User clicks element in overlay's picker mode
2. ds-picker-overlay captures click coordinates
3. OverlayStore identifies closest [data-ds] ancestor
4. RuntimeManager.captureForElement(element) invoked:
   a. FrameworkAdapter.getComponentInstance(element) → component
   b. FrameworkAdapter.captureProps(component) → serialized props
   c. FrameworkAdapter.captureState(component) → serialized state
   d. FrameworkAdapter.getComponentName(component) → display name
5. RelayHttpClient resolves data-ds ID → ManifestEntry (source location)
6. OverlayStore updates: selectedElement, runtimeContext, manifestEntry
7. ds-context-panel renders props/state, ds-element-preview shows source info
```

### 4.3 Annotation Lifecycle

```
              +-----------+
              |  QUEUED   | <-- User creates annotation via overlay
              +-----+-----+
                    | Agent picks up via MCP
              +-----v------+
              | PROCESSING |
              +-----+------+
                    |
              +-----+------+
              v            v
        +-----------+ +---------+
        | PROCESSED | | FAILED  |
        +-----+-----+ +---------+
              | User archives
        +-----v-----+
        | ARCHIVED  |
        +-----------+
```

### 4.4 MCP Agent Integration Flow

```
1. Coding agent connects to relay via MCP (stdio transport)
2. Agent calls `annotation-list` tool → gets QUEUED annotations
3. Agent calls `annotation-process` → marks as PROCESSING
4. Agent calls `manifest-query` → resolves source location
   - Alternatively, agent calls `query-by-source` with file + line → gets manifest entry + live runtime context in one call
5. Agent reads source code, makes changes
6. Agent calls `annotation-respond` → attaches response + marks PROCESSED
7. WebSocket broadcasts ANNOTATION_UPDATED to overlay
8. Developer sees agent's response in ds-annotation-item
```

---

## 5. Core Algorithms

### 5.1 Stable ID Generation (IDStabilizer)

**Problem:** Element IDs must survive HMR (hot module replacement) cycles where file content changes incrementally.

**Algorithm:**

```
getStableId(filePath, position):
  fileContent = readFileSync(filePath)
  currentHash = xxhash64(fileContent)  // 16-char hex string
  cacheEntry = cache.get(filePath)

  if cacheEntry AND cacheEntry.fileHash == currentHash:
    posKey = `${position.line}:${position.column}:${position.offset}`
    if cacheEntry.ids.has(posKey):
      return cacheEntry.ids.get(posKey)  // CACHE HIT (>80% during HMR)

  // Cache miss: generate new ID
  id = generateEntryId()  // 8-char nanoid
  cache.set(filePath, { fileHash: currentHash, ids: { posKey: id } })
  return id
```

**Cache persistence:** Atomic write on close (write temp file → rename).

### 5.2 Manifest Append-Only with Hash-Based Staleness

**Problem:** Crash-safe persistence without transactions.

**Design:**

- Each entry carries a `fileHash` — the xxhash64 of the source file at write time
- When a file is modified and rebuilt, new entries have a new `fileHash`
- Readers track the latest `fileHash` per file path
- Only entries matching the latest `fileHash` are considered valid
- Compactor periodically removes stale entries (different hash or deleted file)

**Two-pass read algorithm:**

```
Pass 1: Parse all lines, track latestHash[filePath] = most recent fileHash
Pass 2: Index only entries where entry.fileHash == latestHash[entry.file]
```

### 5.3 AST Injection

**Injection point determination:**

```
For each JSX opening element:
  1. Skip if hasDataDsAttribute(element)  // idempotent
  2. insertPos = getInsertPosition(element)  // byte offset before > or />
  3. magicString.appendLeft(insertPos, ` data-ds="${id}"`)
```

**Source map chain:** When TypeScript files are pre-transpiled, `SourceMapConsumer` resolves positions back to original `.ts/.tsx` line/column before creating manifest entries.

### 5.4 React Fiber Traversal

```
getComponentInstance(domElement):
  // Find React Fiber from DOM node
  for key in Object.keys(domElement):
    if key.startsWith('__reactFiber$') OR key.startsWith('__reactInternalInstance$'):
      fiber = domElement[key]
      break

  // Walk up to find nearest user component (skip HostComponent fibers)
  while fiber:
    if fiber.tag in [FunctionComponent, ClassComponent, ForwardRef, Memo]:
      return fiber
    fiber = fiber.return

  return null
```

**Hook state extraction** traverses the `memoizedState` linked list:

```
extractHookState(fiber):
  state = {}
  hook = fiber.memoizedState
  index = 0
  while hook:
    if hook.queue:  // useState or useReducer
      state[`hook_${index}`] = hook.memoizedState
    hook = hook.next
    index++
  return state
```

---

## 6. Data Schemas & Protocols

### 6.1 ManifestEntry Schema

```typescript
{
  id: string;                    // 8-char nanoid (pattern: /^[0-9A-HJ-NP-Za-hj-np-z]{8}$/)
  file: string;                  // relative path from workspace root
  start: {
    line: number;                // >= 1
    column: number;              // >= 0
    offset?: number;
  };
  end: {
    line: number;
    column: number;
    offset?: number;
  };
  tagName: string;               // JSX tag name (e.g., "div", "Button")
  componentName?: string;        // enclosing component name
  fileHash: string;              // xxhash64 hex (1-16 chars)
  styles?: StyleInfo;
  componentMetadata?: ComponentMetadata;
}
```

### 6.2 Annotation Schema

```typescript
{
  id: string;                    // format: ann_<nanoid>_<timestamp>
  status: AnnotationStatus;
  interaction: {
    mode: InteractionMode;
    type: InteractionType;
    elementId?: string;          // data-ds value
    selector?: string;           // CSS selector
    boundingRect?: DOMRect;
    selectedText?: string;
  };
  context: {
    url: string;
    viewport: { width, height };
    userAgent: string;
    domSnapshot?: string;
    manifestSnapshot?: ManifestEntry;
    runtimeContext?: RuntimeContext;
  };
  message: string;               // user's annotation text
  response?: string;             // agent's response
  metadata: {
    createdAt: string;           // ISO 8601
    updatedAt: string;
    version: number;             // schema version for migration
  };
}
```

### 6.3 WebSocket Protocol

```json
// Client → Server (subscribe)
{ "type": "subscribe", "events": ["ANNOTATION_CREATED", "MANIFEST_UPDATED"] }

// Server → Client (event)
{ "type": "ANNOTATION_CREATED", "payload": { /* Annotation */ }, "timestamp": "2026-03-15T..." }
```

### 6.4 QueryBySource Schema

```typescript
// Request (POST /api/v1/manifest/resolve-by-source)
{
  file: string;                  // absolute file path as stored in the manifest
  line: number;                  // line number (1-indexed)
  column?: number;               // column number (0-indexed)
  tolerance?: number;            // max line distance to consider (default: 0)
  includeRuntime?: boolean;      // query live runtime context via WS (default: true)
}

// Response
{
  found: boolean;
  entryId?: string;              // matching manifest entry ID
  sourceLocation?: {
    file: string;
    start: SourcePosition;
    end?: SourcePosition;
    tagName?: string;
    componentName?: string;
  };
  runtime?: {                    // present only when includeRuntime=true and browser connected
    rendered: boolean;
    componentProps?: unknown;
    componentState?: unknown;
    domSnapshot?: {
      tagName?: string;
      attributes?: Record<string, string>;
      innerText?: string;
    };
  };
  browserConnected?: boolean;    // whether a browser client is connected via WebSocket
  error?: string;
}
```

**Flow:** The route performs a position-based manifest lookup via `ManifestReader.getEntryByPosition()`. If `includeRuntime` is true and a browser is connected via WebSocket, it sends a `CONTEXT_REQUEST` to the overlay client and includes the live runtime context (props, state, DOM snapshot) in the response.

### 6.5 MCP Tool Schema (example)

```json
{
  "name": "annotation-get",
  "description": "Retrieve an annotation by its ID",
  "inputSchema": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "Annotation ID (ann_*)" }
    },
    "required": ["id"]
  }
}
```

---

## 7. Build System & Tooling

### 7.1 Nx Configuration

| Setting      | Value                      |
| ------------ | -------------------------- |
| Nx Version   | 22.5.3                     |
| Default Base | `main`                     |
| Apps Dir     | `apps/`                    |
| Libs Dir     | `packages/`                |
| Cloud ID     | `68c0bb9fa041424f046e00b8` |

#### Plugins

1. `@nx/js/typescript` — build, typecheck, watch-deps, build-deps targets
2. `@nx/eslint/plugin` — lint target
3. `@nx/vite/plugin` — Vite config auto-detection
4. `@nx/vitest` — test targets
5. `./packages/domscribe-test-fixtures/plugin/fixture-targets.ts` — per-fixture install/test targets
6. `./scripts/nx-plugin.ts` — sync-dist + clean targets for all library packages

#### Target Defaults

| Target  | dependsOn                 | Inputs                      |
| ------- | ------------------------- | --------------------------- |
| `build` | `^build` (upstream first) | `production`, `^production` |
| `test`  | `^build`                  | `default`, `^default`       |
| `lint`  | —                         | `default`, `^default`       |

### 7.2 TypeScript Configuration

| Option            | Value                |
| ----------------- | -------------------- |
| `strict`          | `true`               |
| `composite`       | `true`               |
| `declaration`     | `true`               |
| `declarationMap`  | `true`               |
| `isolatedModules` | `true`               |
| `importHelpers`   | `true` (tslib)       |
| `skipLibCheck`    | `true`               |
| Target            | ES2022 (per-package) |

### 7.3 Build Pipeline

```
Source (packages/domscribe-*/src/)
    │
    ▼ tsc (via @nx/js/typescript)
    │
dist/packages/domscribe-*/
    │
    ▼ sync-dist (scripts/sync-dist.mjs)
    │  - Copy version from source package.json
    │  - Resolve workspace:* → actual versions
    │  - Generate subpath exports from distExports
    │  - Patch bin entries from distBin
    │  - Remove distExports/distBin fields
    │
dist/packages/domscribe-*/package.json (publish-ready)
```

### 7.4 Release Pipelines

| Pipeline       | Command                       | Description                                                           |
| -------------- | ----------------------------- | --------------------------------------------------------------------- |
| Local dev      | `pnpm release:local`          | build → prerelease version (dev.N) → sync-dist → publish to Verdaccio |
| Local affected | `pnpm release:local:affected` | Same but only affected packages                                       |
| npm patch      | `pnpm release:patch`          | build → patch version → sync-dist → publish to npm                    |
| npm minor      | `pnpm release:minor`          | build → minor version → sync-dist → publish to npm                    |
| npm major      | `pnpm release:major`          | build → major version → sync-dist → publish to npm                    |

### 7.5 Key Dependencies

| Dependency                | Version                   | Purpose                                   |
| ------------------------- | ------------------------- | ----------------------------------------- |
| TypeScript                | ~5.9.3                    | Type checking and compilation             |
| Vite                      | 7.3.1                     | Dev server and bundler                    |
| Vitest                    | 4.0.18                    | Unit and integration testing              |
| Playwright                | (devDep of test-fixtures) | E2E browser testing                       |
| Fastify                   | latest                    | Relay HTTP server                         |
| Lit                       | 3.x                       | Overlay web components                    |
| Zod                       | latest                    | Schema validation                         |
| xxhash-wasm               | latest                    | Fast content hashing                      |
| magic-string              | latest                    | Source code manipulation with source maps |
| Acorn                     | latest                    | JavaScript AST parsing                    |
| @babel/parser             | latest                    | TypeScript AST parsing                    |
| @modelcontextprotocol/sdk | latest                    | MCP server implementation                 |
| nanoid                    | latest                    | ID generation                             |

---

## 8. Testing Architecture

### 8.1 Test Layers

```
┌─────────────────────────────────────────────┐
│  E2E Tests (Playwright)                      │
│  Real browser + overlay + relay              │
│  Validates: user interaction flows           │
├─────────────────────────────────────────────┤
│  Integration Tests (Vitest)                  │
│  Real builds + manifest validation           │
│  Validates: transform correctness            │
├─────────────────────────────────────────────┤
│  Unit Tests (Vitest)                         │
│  Per-package, mocked dependencies            │
│  Validates: individual module logic          │
├─────────────────────────────────────────────┤
│  Static Analysis (ESLint + TypeScript)       │
│  Module boundaries + type safety             │
│  Validates: architecture constraints         │
└─────────────────────────────────────────────┘
```

### 8.2 Test Fixtures

**Location:** `packages/domscribe-test-fixtures/fixtures/`

Each fixture is a standalone application with its own `package.json` (uses npm, not pnpm). Fixtures are generated via `nx g @domscribe/test-fixtures:test-fixture`.

#### Fixture Matrix

| Bundler | Version | Framework | Language | Fixture ID               |
| ------- | ------- | --------- | -------- | ------------------------ |
| Vite    | 5       | React 18  | TS       | `vite-v5-react-18-ts`    |
| Vite    | 5       | React 18  | JS       | `vite-v5-react-18-js`    |
| Vite    | 5       | Vue 3     | TS       | `vite-v5-vue-3-ts`       |
| Vite    | 5       | Vue 3     | JS       | `vite-v5-vue-3-js`       |
| Webpack | 5       | React 18  | TS       | `webpack-v5-react-18-ts` |
| Webpack | 5       | React 18  | JS       | `webpack-v5-react-18-js` |
| Webpack | 5       | React 19  | TS       | `webpack-v5-react-19-ts` |
| Webpack | 5       | React 19  | JS       | `webpack-v5-react-19-js` |
| Next    | 15      | React     | TS       | `next-v15-ts`            |
| Next    | 15      | React     | JS       | `next-v15-js`            |
| Next    | 16      | React     | TS       | `next-v16-ts`            |
| Next    | 16      | React     | JS       | `next-v16-js`            |
| Nuxt    | 3       | Vue 3     | TS       | `nuxt-v3-ts`             |
| Nuxt    | 3       | Vue 3     | JS       | `nuxt-v3-js`             |

#### fixture.json Schema

```json
{
  "id": "vite-v5-react-18-ts",
  "framework": "react",
  "frameworkVersion": "18",
  "bundler": "vite",
  "bundlerVersion": "5",
  "language": "ts",
  "tags": ["full-kitchen-sink", "smoke-test", "capture"],
  "capabilities": {
    "runtimeCapture": true,
    "strategies": ["fiber", "devtools", "best-effort"],
    "smokeTest": true
  },
  "devServer": {
    "command": "vite",
    "port": 0,
    "readyPattern": "Local:"
  }
}
```

### 8.3 Integration Tests

| Test                          | Purpose                                    | Validation                                                                       |
| ----------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| `manifest-validation.test.ts` | Deep manifest entry validation after build | ID uniqueness, format, file existence, valid positions, bundle consistency       |
| `manifest-mutation.test.ts`   | Append-only behavior on source changes     | fileHash filtering, ID stability for unmodified files, new entries for mutations |
| `production-strip.test.ts`    | No dev artifacts in production builds      | Zero `data-ds` attributes, no overlay scripts in prod bundle                     |
| `build-performance.bench.ts`  | Transform overhead measurement             | A/B comparison (with/without Domscribe), ≤50% overhead threshold                 |

### 8.4 E2E Tests

| Test                           | Mode                  | Purpose                                                         |
| ------------------------------ | --------------------- | --------------------------------------------------------------- |
| `overlay-interaction.spec.ts`  | Parallel per fixture  | Data-driven element capture, prop/state display, navigation     |
| `annotation-lifecycle.spec.ts` | Serial (shared relay) | Full CRUD: create, view, locate, refresh, edit, archive, delete |

**Key E2E patterns:**

- Shadow DOM piercing via `page.evaluate()` (Playwright locators don't pierce shadow DOM)
- `page.mouse.click()` with real coordinates (synthetic `.click()` fails due to `setPointerCapture`)
- HTTP polling for dev server readiness (ANSI codes break stdout regex matching)
- Dynamic port allocation via `getFreePort()`

### 8.5 Parallelism Model

```
Nx Task Runner (controls fixture-level parallelism)
    │
    ├── e2e--vite-v5-react-18-ts  (Playwright process, 1 worker)
    │       ├── overlay-interaction.spec.ts (parallel within file)
    │       └── annotation-lifecycle.spec.ts (serial mode)
    │
    ├── e2e--webpack-v5-react-18-ts  (separate process)
    │       └── ...
    │
    └── e2e--next-v15-ts  (separate process)
            └── ...
```

### 8.6 Verdaccio Pipeline (Integration/E2E)

```
1. Start Verdaccio on port 4873
2. Build all packages (nx run-many -t build)
3. Version: prerelease (dev.N)
4. Sync-dist: resolve workspace deps
5. Publish to localhost:4873
6. For each fixture:
   a. Generate .npmrc pointing to Verdaccio
   b. npm install --no-package-lock
   c. Write .domscribe-install-stamp
7. Run tests (integration or e2e)
```

---

## 9. Framework Support Matrix

| Framework | Version | Bundler             | Runtime Capture | Strategies                  | Status |
| --------- | ------- | ------------------- | --------------- | --------------------------- | ------ |
| React     | 18      | Vite 5              | Yes             | Fiber, DevTools, BestEffort | Full   |
| React     | 18      | Webpack 5           | Yes             | Fiber, DevTools, BestEffort | Full   |
| React     | 19      | Webpack 5           | Yes             | Fiber, DevTools, BestEffort | Full   |
| React     | 18/19   | Next 15 (Webpack)   | Yes             | Fiber, DevTools, BestEffort | Full   |
| React     | 18/19   | Next 16 (Turbopack) | Yes             | Fiber, DevTools, BestEffort | Full   |
| Vue       | 3.3+    | Vite 5              | Yes             | VNode                       | Full   |
| Vue       | 3.3+    | Webpack 5           | Yes             | VNode                       | Full   |
| Vue       | 3.3+    | Nuxt 3              | Yes             | VNode                       | Full   |

---

## 10. CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/ci.yml`)

**Triggers:** Push to `main`, all pull requests

```
┌──────────────────────────────────────────────────────────────┐
│  Job: checks (ubuntu-latest)                                  │
│  Node 20 + pnpm                                              │
│  → pnpm install --frozen-lockfile                            │
│  → nx run-many -t lint test build typecheck                  │
└──────────────┬────────────────────┬──────────────────────────┘
               │                    │
    ┌──────────▼──────────┐  ┌─────▼───────────────────┐
    │  Job: integration    │  │  Job: e2e                │
    │  (depends on checks) │  │  (depends on checks)     │
    │                      │  │                           │
    │  Build packages      │  │  Install Playwright       │
    │  Start Verdaccio     │  │  Build packages           │
    │  Publish to local    │  │  Start Verdaccio          │
    │  Install fixtures    │  │  Publish + install        │
    │  Run integration     │  │  SKIP_SETUP=1 nx e2e     │
    │  tests               │  │                           │
    └──────────────────────┘  │  Upload report on failure │
                              │  (7-day retention)        │
                              └───────────────────────────┘
```

### Environment Variables

| Variable                    | Purpose                                       |
| --------------------------- | --------------------------------------------- |
| `FIXTURE_ID`                | Filter tests to specific fixture              |
| `SKIP_SETUP`                | Skip Verdaccio + build + publish pipeline     |
| `SKIP_PUBLISH`              | Skip build/version/publish, only install      |
| `SKIP_INSTALL`              | Skip fixture install, only build/publish      |
| `DOMSCRIBE_FORCE_TRANSFORM` | Force transform in non-dev builds (Next/Nuxt) |

---

## 11. Security & Privacy

### 11.1 Production Safety

- **All Domscribe code is dev-only.** The `withDomscribe()` (Next) and `domscribeModule` (Nuxt) wrappers only apply transforms in development mode.
- **Production builds:** `@domscribe/overlay` is aliased to a no-op stub. No `data-ds` attributes, no relay connections, no overlay scripts.
- `production-strip.test.ts` validates this invariant in CI for every fixture.

### 11.2 PII Redaction

- Built into `@domscribe/core` with configurable patterns (email, phone, SSN, credit card, API keys)
- Enabled by default (`redactPII: true` in `RuntimeOptions`)
- Applied during serialization of captured props/state before storage or transmission

### 11.3 Network Isolation

- Relay server binds to `localhost` only (not exposed to network)
- WebSocket connections are local-only
- MCP server uses stdio transport (no network exposure)
- Verdaccio local registry binds to `[::1]` (IPv6 localhost)

### 11.4 Scope Boundaries

- Module boundary enforcement prevents unauthorized cross-package imports
- `scope:core` packages cannot depend on infrastructure or adapter packages
- Enforced at lint time via `@nx/enforce-module-boundaries`

---

_Generated from source analysis of the domscribe monorepo at commit 40193da._

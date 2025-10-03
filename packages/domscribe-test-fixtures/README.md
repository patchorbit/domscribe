# @domscribe/test-fixtures

Kitchen-sink test fixtures and unit-style integration tests for the Domscribe transform layer.

## Overview

This package contains:

- **Battle-tested kitchen-sink components** covering all edge cases for supported frameworks
- **Versioned fixture applications** testing Domscribe across bundler/framework/language combinations
- **Framework-agnostic integration tests** validating transform correctness, manifest integrity, HMR ID stability, and performance

## Directory Structure

```
packages/domscribe-test-fixtures/
├─ shared/
│  ├─ kitchen-sink-react/       # React-specific kitchen sink components
│  ├─ kitchen-sink-vue/          # Vue 3 kitchen sink (Phase 2)
│  └─ test-utils/                # Framework-agnostic test utilities
│
├─ fixtures/                     # Versioned test applications
│  ├─ vite/{version}/react-{version}-{ts|js}/
│  ├─ webpack/{version}/react-{version}-{ts|js}/
│  └─ _templates/                # Templates for new fixtures
│
└─ tests/                        # Vitest integration tests
   ├─ id-stability.test.ts       # HMR ID stability
   ├─ manifest-validation.test.ts
   ├─ transform-validation.test.ts
   ├─ production-strip.test.ts
   └─ performance.bench.ts
```

## Version Matrix

### Phase 1 (v1 Launch - React Only)

| Bundler | Version | Framework    | Language   | Status      |
| ------- | ------- | ------------ | ---------- | ----------- |
| Vite    | 5.4.11  | React 18.3.1 | TypeScript | ⭐ Primary  |
| Vite    | 5.4.11  | React 18.3.1 | JavaScript | ✅ Complete |
| Webpack | 5.101.3 | React 18.3.1 | TypeScript | ✅ Complete |
| Vite    | 7.1.7   | React 18.3.1 | TypeScript | 🔄 Optional |

### Phase 2 (Post-v1)

| Bundler | Version | Framework    | Language   | Status     |
| ------- | ------- | ------------ | ---------- | ---------- |
| Vite    | 7.1.7   | React 19.1.0 | TypeScript | 🔴 Planned |
| Vite    | 5.4.11  | Vue 3.5.x    | TypeScript | 🔴 Planned |
| Vite    | 7.1.7   | Vue 3.5.x    | TypeScript | 🔴 Planned |

## Running Tests

```bash
# Run all integration tests
pnpm nx test test-fixtures

# Run tests in watch mode
pnpm nx run test-fixtures:test:watch

# Run with UI
pnpm nx run test-fixtures:test:ui

# Run specific test file
pnpm nx test test-fixtures --testFile=id-stability.test.ts
```

## Kitchen Sink Components

### React (`shared/kitchen-sink-react/`)

Battle-tested components covering:

- **BasicElements**: div, span, button, input, img, form
- **SelfClosing**: `<input />`, `<br />`, `<img />`
- **Fragments**: `<></>`, `<Fragment>`
- **ConditionalRendering**: `{cond && <div />}`, ternary operators
- **Lists**: `.map()` with keys, nested lists
- **MemberExpressions**: `<UI.Button>`, `<Card.Header>`
- **EventHandlers**: onClick, onChange, onSubmit
- **HOCs**: Higher-order components
- **RenderProps**: Render prop patterns
- **Memo**: React.memo, forwardRef, useCallback
- **DeeplyNested**: 10+ levels of nesting (stress test)
- **DynamicContent**: State-driven rendering
- **TypeScriptFeatures**: Generics, type assertions, interfaces
- **EdgeCases**: null returns, undefined, empty components

## Test Utilities (`shared/test-utils/`)

Framework-agnostic utilities:

- **`fixture-runner.ts`**: Build fixtures using Vite/Webpack programmatic API
- **`manifest-parser.ts`**: Read and validate `.domscribe/manifest.jsonl`
- **`bundle-analyzer.ts`**: Extract `data-ds` attributes from bundles
- **`performance-utils.ts`**: Benchmark helpers

## Success Criteria

✅ **Transform Correctness**: All `data-ds` attributes injected on host elements
✅ **Manifest Integrity**: 100% schema compliance, all IDs have entries
✅ **ID Stability**: >80% cache hit rate across HMR cycles
✅ **Production Strip**: Zero `data-ds` in production builds
✅ **Performance**: <10ms/file transform, <2% build overhead

## Maintenance

### Adding a New Fixture

1. Copy from `fixtures/_templates/vite-react.template/`
2. Update versions in `package.json`
3. Add to test matrix in `tests/fixtures.test.ts`
4. Run tests to verify

### Deprecating EOL Versions

When a version reaches EOL:

1. Move to `fixtures/_archived/{bundler}/{version}/`
2. Remove from test matrix
3. Update version matrix table in this README

### Adding Vue/Angular Support

1. Create `shared/kitchen-sink-vue/` or `shared/kitchen-sink-angular/`
2. Create corresponding fixtures under `fixtures/vite/v{X}/vue-{version}-ts/`
3. Add to test matrix (tests are framework-agnostic!)

## Architecture Notes

### Why Versioned Directory Structure?

**Pattern**: `vite/{vite-version}/react-{react-version}-{ts|js}`

**Benefits**:

- Explicit version tracking for regression testing
- Parallel testing across ecosystem updates
- Clear maintenance and deprecation path
- Users know exactly which combinations are supported

### Why Per-Framework Kitchen Sinks?

React (JSX), Vue (SFC), and Angular (templates) have fundamentally different syntaxes. Per-framework kitchen sinks:

- Test the same CONCEPTS (conditionals, lists, events) in framework-appropriate syntax
- Allow independent evolution without breaking other frameworks
- Reflect how developers actually write code in each framework

### Why Framework-Agnostic Tests?

The transform layer, manifest generation, HMR stability, and production stripping work the same regardless of framework. Framework-agnostic tests:

- Work with React now, Vue later (no changes needed)
- Validate core Domscribe functionality, not framework quirks
- Reduce maintenance burden when adding new frameworks

## License

MIT

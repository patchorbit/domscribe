# @domscribe/vue

Vue 3 adapter for Domscribe — VNode resolution, Composition + Options API support, and bundler plugins.

## Install

```bash
npm install -D @domscribe/vue
```

## Vite

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { domscribe } from '@domscribe/vue/vite';

export default defineConfig({
  plugins: [vue(), domscribe()],
});
```

## Webpack

```js
const { DomscribeWebpackPlugin } = require('@domscribe/vue/webpack');

// Add to plugins array + add webpack loader rule
// (see @domscribe/transform README for full webpack config)
```

## Plugin Options

The Vue plugin extends the base transform plugin options with `runtime` and `capture` namespaces:

```ts
interface DomscribeVuePluginOptions {
  // Base transform options
  include?: RegExp;
  exclude?: RegExp;
  debug?: boolean;
  relay?: { autoStart?: boolean; port?: number; host?: string };
  overlay?:
    | boolean
    | { initialMode?: 'collapsed' | 'expanded'; debug?: boolean };

  // Vue-specific
  runtime?: DomscribeRuntimeOptions;
  capture?: DomscribeVueCaptureOptions;
}
```

### Runtime Options

| Option           | Type                       | Default     | Description                                                                                            |
| ---------------- | -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| `phase`          | `1 \| 2`                   | `1`         | Feature phase gate (Phase 1: props/state, Phase 2: events/perf)                                        |
| `redactPII`      | `boolean`                  | `true`      | Redact sensitive values in captured data                                                               |
| `blockSelectors` | `string[]`                 | `[]`        | CSS selectors to exclude from capture                                                                  |
| `serialization`  | `SerializationConstraints` | `undefined` | Serialization bounds (maxDepth, maxArrayLength, maxTotalBytes, etc.) — see `@domscribe/runtime` README |

### Capture Options

| Option         | Type     | Default | Description                              |
| -------------- | -------- | ------- | ---------------------------------------- |
| `maxTreeDepth` | `number` | `50`    | Maximum component tree depth to traverse |

## Subpath Exports

- `@domscribe/vue/vite` — Vite plugin with Vue adapter
- `@domscribe/vue/webpack` — Webpack plugin with Vue adapter
- `@domscribe/vue/auto-init` — Auto-initialization module

---

Part of the [Domscribe](https://github.com/patchorbit/domscribe) monorepo. License: MIT.

# Domscribe Config Patterns

How to edit each framework's bundler config to integrate Domscribe. The 8 framework combinations reduce to 4 distinct integration patterns.

---

## Next.js — HOF Wrapper

**Import to add:**

```typescript
import { withDomscribe } from '@domscribe/next';
```

**How to edit:**

Wrap the existing default export with `withDomscribe()()`. This is a higher-order function that returns a config transformer.

- If the file has `export default <expression>` — change to `export default withDomscribe()(<expression>)`
- If the file has `const config = ...; export default config` — change to `export default withDomscribe()(config)`
- If the file already uses another wrapper (e.g., `withMDX`), compose them: `export default withDomscribe()(withMDX(config))`

**Full example (`next.config.ts`):**

```typescript
import type { NextConfig } from 'next';
import { withDomscribe } from '@domscribe/next';

const nextConfig: NextConfig = {};

export default withDomscribe()(nextConfig);
```

---

## Nuxt — Module Registration

**How to edit:**

Add `'@domscribe/nuxt'` as a string to the `modules` array inside `defineNuxtConfig()`. No import needed — Nuxt resolves the module by package name.

- If no `modules` key exists in the config object, add it: `modules: ['@domscribe/nuxt']`
- If `modules` exists, append `'@domscribe/nuxt'` to the array

**Full example (`nuxt.config.ts`):**

```typescript
export default defineNuxtConfig({
  modules: ['@domscribe/nuxt'],
});
```

---

## Vite Plugin (React / Vue / Other)

Three variants — same pattern, different import path:

| Framework  | Import path                         |
| ---------- | ----------------------------------- |
| react-vite | `@domscribe/react/vite`             |
| vue-vite   | `@domscribe/vue/vite`               |
| other-vite | `@domscribe/transform/plugins/vite` |

**Import to add** (use the path from the table above):

```typescript
import { domscribe } from '@domscribe/react/vite';
```

**How to edit:**

Add `domscribe()` to the `plugins` array inside `defineConfig()`. Place it after the framework plugin (e.g., after `react()` or `vue()`).

- If `plugins` exists, append `domscribe()` to the array
- If `plugins` doesn't exist, add `plugins: [domscribe()]`

**Full example — React + Vite (`vite.config.ts`):**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { domscribe } from '@domscribe/react/vite';

export default defineConfig({
  plugins: [react(), domscribe()],
});
```

**Full example — Vue + Vite (`vite.config.ts`):**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { domscribe } from '@domscribe/vue/vite';

export default defineConfig({
  plugins: [vue(), domscribe()],
});
```

**Full example — Other + Vite (`vite.config.ts`):**

```typescript
import { defineConfig } from 'vite';
import { domscribe } from '@domscribe/transform/plugins/vite';

export default defineConfig({
  plugins: [domscribe()],
});
```

---

## Webpack Plugin + Loader (React / Vue / Other)

Three variants — same pattern, different import path:

| Framework     | Import path                            |
| ------------- | -------------------------------------- |
| react-webpack | `@domscribe/react/webpack`             |
| vue-webpack   | `@domscribe/vue/webpack`               |
| other-webpack | `@domscribe/transform/plugins/webpack` |

**Two edits required:**

### Edit 1 — Add the transform loader rule

Add a pre-enforce loader rule to `module.rules`. This must run before other loaders:

```javascript
{
  test: /\.[jt]sx?$/,
  exclude: /node_modules/,
  enforce: 'pre',
  use: [
    {
      loader: '@domscribe/transform/webpack-loader',
      options: { enabled: process.env.NODE_ENV !== 'production' },
    },
  ],
}
```

### Edit 2 — Add the webpack plugin

Add the plugin instance to the `plugins` array. Use the import path from the table above:

```javascript
const { DomscribeWebpackPlugin } = require('@domscribe/react/webpack');

// In the plugins array:
new DomscribeWebpackPlugin({
  enabled: process.env.NODE_ENV !== 'production',
  overlay: true,
});
```

**Full example — React + Webpack (`webpack.config.js`):**

```javascript
const { DomscribeWebpackPlugin } = require('@domscribe/react/webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: '@domscribe/transform/webpack-loader',
            options: { enabled: isDevelopment },
          },
        ],
      },
      // ... existing loaders
    ],
  },
  plugins: [
    new DomscribeWebpackPlugin({
      enabled: isDevelopment,
      overlay: true,
    }),
  ],
};
```

---

## Package Manager Install Commands

| Lockfile                 | Package manager | Install command  |
| ------------------------ | --------------- | ---------------- |
| `pnpm-lock.yaml`         | pnpm            | `pnpm add -D`    |
| `yarn.lock`              | yarn            | `yarn add -D`    |
| `bun.lock` / `bun.lockb` | bun             | `bun add -D`     |
| (none)                   | npm             | `npm install -D` |

## Gitignore

If `.domscribe` is not already listed in `.gitignore`, append:

```
# Domscribe artifacts
.domscribe
```

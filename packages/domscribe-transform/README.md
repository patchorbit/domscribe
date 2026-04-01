# @domscribe/transform

AST injection of stable element IDs and bundler plugins for Domscribe.

## Install

```bash
npm install -D @domscribe/transform
```

> **Note:** You probably want a framework adapter instead (`@domscribe/react`, `@domscribe/vue`, `@domscribe/next`, `@domscribe/nuxt`). Those packages wrap this one and handle framework-specific wiring automatically.

## Bundler Support

| Bundler   | Plugin                                 | Parser                   |
| --------- | -------------------------------------- | ------------------------ |
| Vite 5-7  | `@domscribe/transform/plugins/vite`    | Acorn (JS/JSX) or VueSFC |
| Webpack 5 | `@domscribe/transform/plugins/webpack` | Babel (TS/JSX) or VueSFC |
| Turbopack | Self-initializing loader               | Babel (TS/JSX)           |

## Configuration

### Shared Options — Relay

These options apply to the `relay` field across all bundler plugins.

| Option      | Type      | Default           | Description                                              |
| ----------- | --------- | ----------------- | -------------------------------------------------------- |
| `autoStart` | `boolean` | `true`            | Auto-start the relay daemon if not running               |
| `port`      | `number`  | `0` (dynamic)     | Relay server port (only used when starting)              |
| `host`      | `string`  | `'127.0.0.1'`     | Relay server host (only used when starting)              |
| `bodyLimit` | `number`  | `10485760` (10MB) | Max request body size in bytes (only used when starting) |

### Shared Options — Overlay

These options apply when `overlay` is set to an object instead of a boolean.

| Option        | Type                        | Default       | Description                          |
| ------------- | --------------------------- | ------------- | ------------------------------------ |
| `initialMode` | `'collapsed' \| 'expanded'` | `'collapsed'` | Initial display mode for the overlay |
| `debug`       | `boolean`                   | `false`       | Enable debug logging in the overlay  |

---

### Vite Plugin

```ts
import { domscribe } from '@domscribe/transform/plugins/vite';

domscribe({
  include: /\.(jsx|tsx|vue)$/i,
  exclude: /node_modules|\.test\.|\.spec\./i,
  debug: false,
  relay: { autoStart: true, port: 0, host: '127.0.0.1', bodyLimit: 10485760 },
  overlay: true,
  rootDir: undefined, // Override root directory for .domscribe/ artifacts
});
```

| Option    | Type                              | Default                               | Description                                                                                                                               |
| --------- | --------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `include` | `RegExp`                          | `/\.(jsx\|tsx\|vue)$/i`               | File pattern to include                                                                                                                   |
| `exclude` | `RegExp`                          | `/node_modules\|\.test\.\|\.spec\./i` | File pattern to exclude                                                                                                                   |
| `debug`   | `boolean`                         | `false`                               | Enable debug logging                                                                                                                      |
| `relay`   | `RelayPluginOptions`              | See shared                            | Relay server config                                                                                                                       |
| `overlay` | `boolean \| OverlayPluginOptions` | `true`                                | Overlay UI config                                                                                                                         |
| `rootDir` | `string`                          | Vite's `config.root`                  | Override root directory for `.domscribe/` artifacts. Needed when Vite root differs from project root (e.g., Nuxt with a custom `srcDir`). |

---

### Webpack Plugin

```ts
import { DomscribeWebpackPlugin } from '@domscribe/transform/plugins/webpack';

new DomscribeWebpackPlugin({
  enabled: true,
  debug: false,
  relay: { autoStart: true, port: 0, host: '127.0.0.1' },
  overlay: true,
});
```

| Option    | Type                              | Default                              | Description          |
| --------- | --------------------------------- | ------------------------------------ | -------------------- |
| `enabled` | `boolean`                         | `true` in dev, `false` in production | Enable the plugin    |
| `debug`   | `boolean`                         | `false`                              | Enable debug logging |
| `relay`   | `RelayPluginOptions`              | See shared                           | Relay server config  |
| `overlay` | `boolean \| OverlayPluginOptions` | `true`                               | Overlay UI config    |

#### Webpack Loader Options

The webpack loader is managed internally by `DomscribeWebpackPlugin`. If you need to configure it directly via `@domscribe/transform/webpack-loader`:

| Option    | Type      | Default | Description           |
| --------- | --------- | ------- | --------------------- |
| `debug`   | `boolean` | `false` | Enable debug logging  |
| `enabled` | `boolean` | `true`  | Enable transformation |

---

### Turbopack Loader

Turbopack has no plugin system, so the loader is self-initializing — it manages relay lifecycle and overlay injection directly.

```ts
// next.config.ts (turbopack)
{
  turbopack: {
    rules: {
      '*.{tsx,jsx}': {
        loaders: [{
          loader: '@domscribe/transform/turbopack-loader',
          options: {
            enabled: true,
            debug: false,
            relay: { autoStart: true, port: 0, host: '127.0.0.1' },
            overlay: false,
            autoInitPath: undefined,
          },
        }],
      },
    },
  },
}
```

| Option         | Type                              | Default                                                 | Description                                                                                                                                                                                                           |
| -------------- | --------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`      | `boolean`                         | `true`                                                  | Enable transformation                                                                                                                                                                                                 |
| `debug`        | `boolean`                         | `false`                                                 | Enable debug logging                                                                                                                                                                                                  |
| `relay`        | `RelayPluginOptions`              | See shared                                              | Relay server config                                                                                                                                                                                                   |
| `overlay`      | `boolean \| OverlayPluginOptions` | `false`                                                 | Overlay UI config. Defaults to `false` unlike Vite/Webpack — overlay injection must be handled by the meta-framework wrapper.                                                                                         |
| `autoInitPath` | `string`                          | `undefined` (falls back to `@domscribe/next/auto-init`) | Absolute filesystem path to the auto-init module. Used in pnpm monorepos where transformed files don't directly depend on the auto-init package. Meta-framework wrappers should resolve this via `require.resolve()`. |

#### `getInitResult()`

```ts
import { getInitResult } from '@domscribe/transform/plugins/turbopack';

const result = getInitResult();
// { relayHost: string | undefined, relayPort: number | undefined }
```

Returns the relay host and port detected during loader initialization. Available after the first file is processed. Used by meta-framework wrappers (e.g., `@domscribe/next`) to read relay connection info after the loader has initialized.

---

## Subpath Exports

| Subpath                                  | Description                                    |
| ---------------------------------------- | ---------------------------------------------- |
| `@domscribe/transform/plugins/vite`      | Vite plugin (`domscribe`)                      |
| `@domscribe/transform/plugins/webpack`   | Webpack plugin (`DomscribeWebpackPlugin`)      |
| `@domscribe/transform/webpack-loader`    | Webpack loader path (string, for direct use)   |
| `@domscribe/transform/plugins/turbopack` | Turbopack exports (`getInitResult`)            |
| `@domscribe/transform/turbopack-loader`  | Turbopack loader path (string, for direct use) |

## Links

Part of [Domscribe](https://github.com/patchorbit/domscribe).

## License

MIT

# @domscribe/nuxt

Nuxt module for Domscribe.

## Install

```bash
npm install @domscribe/nuxt
```

## Note

Drop-in Nuxt 3+ module.

## Style Capture (RFC 0001)

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@domscribe/nuxt'],
  domscribe: {
    overlay: true,
    captureStyles: true, // build-time styleSource + runtime componentStyles
  },
});
```

`captureStyles: true` enables both style-capture tiers with one flag. The
`runtime` option accepts the full `DomscribeRuntimeOptions` (serialization
constraints, `styleOptions`, per-tier `captureStyles` override).

## Links

Part of [Domscribe](https://github.com/patchorbit/domscribe).

## License

MIT

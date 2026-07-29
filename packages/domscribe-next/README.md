# @domscribe/next

Next.js integration for Domscribe.

## Install

```bash
npm install @domscribe/next
```

## Note

Drop-in integration for Next.js 15+ projects.

## Style Capture (RFC 0001)

```js
// next.config.js
import { withDomscribe } from '@domscribe/next';

export default withDomscribe({
  overlay: true,
  captureStyles: true, // build-time styleSource + runtime componentStyles
})({});
```

`captureStyles: true` enables both style-capture tiers with one flag. The
`runtime` option accepts the full `DomscribeRuntimeOptions` (serialization
constraints, `styleOptions`, per-tier `captureStyles` override).

## Links

Part of [Domscribe](https://github.com/patchorbit/domscribe).

## License

MIT

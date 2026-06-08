# @domscribe/verify

Pure-TS visual-snapshot comparator for Domscribe.

The comparator is **lifted verbatim** from the RFC 0001 falsifier harness
in `@domscribe/test-fixtures`. It compares two PNG screenshot buffers
pixel-by-pixel via [`pixelmatch`](https://github.com/mapbox/pixelmatch)
and returns a structured delta. No DOM, no browser — runnable from Node
CI **and** the relay runtime.

## Install

```bash
npm install @domscribe/verify
```

## Note

Internal package used by `@domscribe/test-fixtures` (the RFC 0001
styling falsifier) and `@domscribe/relay` (the RFC 0002
`verify_after_edit` MCP tool). You probably don't need to install this
directly.

## Links

Part of [Domscribe](https://github.com/patchorbit/domscribe).

## License

MIT

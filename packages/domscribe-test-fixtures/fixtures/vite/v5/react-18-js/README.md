# Vite + React Fixture Template

This is a template for creating Vite + React test fixtures.

## Usage

To create a new fixture from this template:

1. Copy this directory to `fixtures/vite/v{version}/react-{version}-{ts|js}/`
2. Replace placeholders in `package.json`:
   - `VITE_VERSION_PLACEHOLDER` → e.g., `^5.4.11`
   - `REACT_VERSION_PLACEHOLDER` → e.g., `^18.3.1`
3. If creating a JS fixture:
   - Rename all `.tsx` → `.jsx`
   - Rename all `.ts` → `.js`
   - Remove `tsconfig.json`
   - Update `vite.config.ts` → `vite.config.js`
4. Run `pnpm install` in the fixture directory
5. Run `pnpm build` to generate output and manifest

## What gets tested

This fixture includes all kitchen-sink components from `@domscribe/test-fixtures/kitchen-sink-react`:

- BasicElements
- SelfClosing
- Fragments
- Lists
- ConditionalRendering
- DeeplyNested
- MemberExpressions
- EventHandlers
- HOCs
- RenderProps
- Memo
- DynamicContent
- TypeScriptFeatures
- EdgeCases

## Build output

- `dist/` - Build output
- `.domscribe/manifest.jsonl` - Generated manifest

# Webpack + React Fixture Template

This is a template for creating Webpack + React test fixtures.

## Usage

To create a new fixture from this template:

1. Copy this directory to `fixtures/webpack/v{version}/react-{version}-{ts|js}/`
2. Replace placeholders in `package.json`:
   - `WEBPACK_VERSION_PLACEHOLDER` → e.g., `^5.101.3`
   - `REACT_VERSION_PLACEHOLDER` → e.g., `^18.3.1`
3. If creating a JS fixture:
   - Rename all `.tsx` → `.jsx`
   - Rename all `.ts` → `.js`
   - Remove `tsconfig.json`
   - Update `webpack.config.js` to use `babel-loader` instead of `ts-loader`
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

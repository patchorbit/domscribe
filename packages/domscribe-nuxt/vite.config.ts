import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // #imports is a Nuxt virtual module — provide a stub so Vite can
      // resolve the import during tests (vi.mock replaces the actual impl).
      '#imports': resolve(__dirname, 'src/runtime/__stubs__/imports.ts'),
    },
  },
  test: {
    name: '@domscribe/nuxt',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    outputFile: './test-output/vitest/report.json',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './test-output/vitest/coverage',
      thresholds: {
        lines: 0.8,
        functions: 0.8,
        branches: 0.7,
        statements: 0.8,
      },
    },
    typecheck: {
      tsconfig: './tsconfig.spec.json',
    },
  },
});

import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@domscribe/relay/client': resolve(
        __dirname,
        '../domscribe-relay/src/client/index.ts',
      ),
    },
  },
  test: {
    name: '@domscribe/overlay',
    watch: false,
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    outputFile: './test-output/vitest/report.json',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './test-output/vitest/coverage',
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
    typecheck: {
      tsconfig: './tsconfig.spec.json',
    },
  },
});

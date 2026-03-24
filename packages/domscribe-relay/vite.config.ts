import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@domscribe/relay',
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
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts', // Re-exports only
        'src/cli.ts', // CLI entry point
        'src/**/index.ts', // Re-export barrels
        'src/**/process-entry.ts', // Process entry point
        'src/server/http-server.ts', // Composition root — tested transitively
        'src/server/__test-utils__/**', // Test utilities
        'src/http/**', // .http files for manual testing
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
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

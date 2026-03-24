import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@domscribe/core',
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

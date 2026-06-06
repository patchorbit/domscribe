import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@domscribe/benchmark-comparators',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    reporters: ['default'],
    outputFile: './test-output/vitest/report.json',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './test-output/vitest/coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/**/index.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
      thresholds: {
        lines: 0.7,
        functions: 0.7,
        branches: 0.6,
        statements: 0.7,
      },
    },
  },
});

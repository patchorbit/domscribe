import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/domscribe-test-fixtures',
  plugins: [],
  test: {
    name: 'domscribe-test-fixtures',
    watch: false,
    globals: true,
    environment: 'node',
    // Include integration tests in tests/ directory
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.bench.ts'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      include: ['shared/**/*.{ts,tsx}'],
      exclude: ['fixtures/**', 'tests/**', '**/*.spec.ts', '**/*.test.ts'],
    },
    // Increase timeout for integration tests (building fixtures takes time)
    testTimeout: 30000,
    hookTimeout: 30000,
    typecheck: {
      tsconfig: './tsconfig.spec.json',
    },
  },
}));

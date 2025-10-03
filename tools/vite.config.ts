import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../node_modules/.vite/tools',
  plugins: [],
  test: {
    name: 'workspace-tools',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx,js,jsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));

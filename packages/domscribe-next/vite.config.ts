import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // auto-init dynamically imports @domscribe/overlay which isn't a direct
      // dependency — help Vite resolve it for tests (vi.mock intercepts at runtime)
      '@domscribe/overlay': path.resolve(
        __dirname,
        '../domscribe-overlay/src/index.ts',
      ),
    },
  },
  test: {
    name: '@domscribe/next',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    outputFile: './test-output/vitest/report.json',
    coverage: {
      enabled: true,
      provider: 'v8',
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

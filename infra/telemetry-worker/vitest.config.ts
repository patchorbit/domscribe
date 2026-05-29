import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          kvNamespaces: ['SESSIONS'],
          bindings: {
            // Read endpoint is gated on this in production; tests use a known token.
            WAU_READ_TOKEN: 'test-token',
            SESSION_TTL_SECONDS: '86400',
          },
        },
      },
    },
  },
});

/**
 * Config snippets displayed to the user after framework selection.
 * @module @domscribe/relay/cli/init/snippets
 */
import type { FrameworkId } from './types.js';

/**
 * Config snippet for each framework + bundler combination.
 * Displayed via `clack.note()` after package installation.
 */
export const CONFIG_SNIPPETS: Record<FrameworkId, string> = {
  next: `import type { NextConfig } from 'next';
import { withDomscribe } from '@domscribe/next';

const nextConfig: NextConfig = {};

export default withDomscribe()(nextConfig);`,

  nuxt: `export default defineNuxtConfig({
  modules: ['@domscribe/nuxt'],
});`,

  'react-vite': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { domscribe } from '@domscribe/react/vite';

export default defineConfig({
  plugins: [react(), domscribe()],
});`,

  'react-webpack': `const { DomscribeWebpackPlugin } = require('@domscribe/react/webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  module: {
    rules: [
      {
        test: /\\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: '@domscribe/transform/webpack-loader',
            options: { enabled: isDevelopment },
          },
        ],
      },
      // ... your other loaders
    ],
  },
  plugins: [
    new DomscribeWebpackPlugin({
      enabled: isDevelopment,
      overlay: true,
    }),
  ],
};`,

  'vue-vite': `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { domscribe } from '@domscribe/vue/vite';

export default defineConfig({
  plugins: [vue(), domscribe()],
});`,

  'vue-webpack': `const { DomscribeWebpackPlugin } = require('@domscribe/vue/webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  module: {
    rules: [
      {
        test: /\\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: '@domscribe/transform/webpack-loader',
            options: { enabled: isDevelopment },
          },
        ],
      },
      // ... your other loaders
    ],
  },
  plugins: [
    new DomscribeWebpackPlugin({
      enabled: isDevelopment,
      overlay: true,
    }),
  ],
};`,

  'other-vite': `import { defineConfig } from 'vite';
import { domscribe } from '@domscribe/transform/plugins/vite';

export default defineConfig({
  plugins: [domscribe()],
});`,

  'other-webpack': `const {
  DomscribeWebpackPlugin,
} = require('@domscribe/transform/plugins/webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  module: {
    rules: [
      {
        test: /\\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: '@domscribe/transform/webpack-loader',
            options: { enabled: isDevelopment },
          },
        ],
      },
      // ... your other loaders
    ],
  },
  plugins: [
    new DomscribeWebpackPlugin({
      enabled: isDevelopment,
      overlay: true,
    }),
  ],
};`,
};

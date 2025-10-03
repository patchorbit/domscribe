import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vite as domscribe } from '@domscribe/transform';

export default defineConfig({
  plugins: [
    react(),
    domscribe({
      // Domscribe transform configuration
      enabled: process.env.NODE_ENV !== 'production',
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

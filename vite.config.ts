import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { fileURLToPath, URL } from 'node:url';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2021',
    sourcemap: true,
  },
  // CRXJS uses a websocket for HMR; pin the port so it works inside an extension page.
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
});

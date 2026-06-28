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
    // The content script bundles React + jsPDF + html2canvas into one file. That
    // is by design: a content script loads from local disk (not over a network),
    // so code-splitting it adds round-trips without saving anything, and CRXJS
    // ships it as a single bundle. Raise the cosmetic warning threshold to match.
    chunkSizeWarningLimit: 1500,
  },
  // CRXJS uses a websocket for HMR; pin the port so it works inside an extension page.
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
});

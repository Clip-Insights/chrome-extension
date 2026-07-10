import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { fileURLToPath, URL } from 'node:url';
import manifest from './manifest.config';
import { patchCrxHmrPortSource } from './src/dev/patchCrxHmrPort';

/**
 * CRXJS 2.7.1 still sets server.hmr.host (deprecated → server.ws.host in Vite 8).
 * We already pin ws.host below; keep CRX's liveReload init, drop the deprecated write.
 */
function silenceCrxHmrDeprecation(plugins: Plugin[]): Plugin[] {
  return plugins.map((plugin) => {
    if (plugin.name !== 'crx:hmr' || plugin.enforce !== 'pre') return plugin;
    const original = plugin.config;
    return {
      ...plugin,
      async config(userConfig, env) {
        if (typeof original !== 'function') return;
        // hmr:false makes upstream return before writing deprecated keys.
        await original.call(
          this,
          { ...userConfig, server: { ...userConfig.server, hmr: false } },
          env,
        );
      },
    };
  });
}

/** Guard CRXJS HMRPort.send the same way ping already is (upstream omission). */
function patchCrxHmrPort(): Plugin {
  return {
    name: 'patch-crx-hmr-port',
    transform(code, id) {
      if (!id.includes('/@crx/client-port')) return null;
      const patched = patchCrxHmrPortSource(code);
      return patched === code ? null : patched;
    },
  };
}

export default defineConfig({
  // crx before react: avoids Vite 8 rollupOptions/rolldownOptions divergence
  // when both plugins mutate build config (crxjs/chrome-extension-tools#1145).
  plugins: [
    ...silenceCrxHmrDeprecation(crx({ manifest }) as Plugin[]),
    patchCrxHmrPort(),
    react(),
  ],
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
  // CRXJS uses a websocket for HMR; pin host/port so it works inside an extension page.
  server: {
    port: 5173,
    strictPort: true,
    ws: { host: 'localhost', port: 5173 },
  },
});

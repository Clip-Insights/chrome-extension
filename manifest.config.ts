import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

/**
 * Host match patterns for every supported learning platform.
 *
 * Adding a new platform is a three-step change (see ARCHITECTURE.md B.6):
 *   1. Add its match pattern(s) here.
 *   2. Implement a `PlatformAdapter` under `src/platforms/<name>/`.
 *   3. Register the adapter in `src/core/platform/registry.ts`.
 *
 * No feature/core code changes are required.
 */
const PLATFORM_MATCHES = [
  'https://www.youtube.com/*',
  // 'https://www.coursera.org/*',
  // 'https://learn.deeplearning.ai/*',
];

export default defineManifest({
  manifest_version: 3,
  name: 'Clip Insights',
  version: pkg.version,
  description: pkg.description,
  icons: {
    16: 'public/icons/icon-16.png',
    48: 'public/icons/icon-48.png',
    128: 'public/icons/icon-128.png',
  },
  action: {
    default_icon: {
      16: 'public/icons/icon-16.png',
      48: 'public/icons/icon-48.png',
      128: 'public/icons/icon-128.png',
    },
    default_title: 'Clip Insights',
  },
  host_permissions: PLATFORM_MATCHES,
  content_scripts: [
    {
      matches: PLATFORM_MATCHES,
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
});

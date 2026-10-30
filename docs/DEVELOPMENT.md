# Local development

Setup, configuration, build, and verification instructions for the Chrome extension.

## Prerequisites

- Node.js 22.12+ and npm

## Setup

```bash
git clone https://github.com/Clip-Insights/chrome-extension.git
cd chrome-extension
npm ci
```

Environment is configured in `.env` (gitignored) and can be overridden in `.env.local`:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL |
| `VITE_WEB_APP_URL` | Account links; defaults to `https://app.clipinsights.org` |
| `VITE_TOKEN_SECRET` | Obfuscation key for JWTs at rest (client-side only) |
| `VITE_GOOGLE_EXTENSION_CLIENT_ID` | OAuth client ID for extension Google sign-in |

> `VITE_GOOGLE_EXTENSION_CLIENT_ID` must be a **Web application** OAuth client (not "Chrome extension" — that type only works with `getAuthToken`). Add this Authorized redirect URI, using the extension ID from `chrome://extensions`:
> `https://<your-extension-id>.chromiumapp.org/`

## Develop

```bash
npm run dev
```

Then load the extension once (HMR updates it live afterward):

1. Open `chrome://extensions` and enable **Developer mode**.
2. **Load unpacked** → select the `dist/` folder.

## Build

```bash
npm run build      # tsc --noEmit && vite build  -> dist/
npm run typecheck  # types only
npm run test       # vitest (pure core logic)
```

Load the production build by pointing **Load unpacked** at `dist/`. After every rebuild, click **Reload** on the extension in `chrome://extensions` — Chrome otherwise serves a stale build (the usual cause of "old icons/styles still showing").

## Project layout

```
src/
  content/      content-script entry + Shadow-DOM mount
  core/         platform-agnostic services: platform abstraction, storage (IndexedDB),
                api, auth, transcript, screenshot, pdf, limits, time, format
  platforms/    platform adapters (youtube/) + registry wiring
  features/     vertical UI slices: timeline, insights, chat, auth, export, transcript
  ui/           App/Panel composition, shared components, icons, scoped styles
```

## Adding a new platform

1. Add the host pattern(s) to `PLATFORM_MATCHES` in `manifest.config.ts`.
2. Implement a `PlatformAdapter` in `src/platforms/<name>/`.
3. Register it in `src/platforms/index.ts`.

No changes to `features/*` or `core/*` are required.

## Release notes and permissions

[Release descriptions](./releases/README.md) · [Purpose, permissions, and data flow](./policies.md)


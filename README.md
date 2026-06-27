# Clip Insights — Browser Extension

React + TypeScript Manifest V3 extension built with **Vite + CRXJS**. Adds a study
panel to learning-platform video pages: timestamped screenshots & notes, AI
summaries / key points, AI chat, transcript copy, and PDF export.

The codebase is organised so the same extension can serve multiple platforms
(YouTube today; Coursera / DeepLearning.AI later) by adding a **platform adapter**.
See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Prerequisites

- Node.js 18+ and npm

## Setup

```bash
npm install
```

Environment is configured in `.env` (committed defaults) and can be overridden
in `.env.local`:

- `VITE_API_URL` — backend base URL.
- `VITE_TOKEN_SECRET` — obfuscation key for JWTs at rest (client-side only).

## Develop

```bash
npm run dev
```

Then load the extension once (HMR updates it live):

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select the `dist/` folder.

## Build

```bash
npm run build      # tsc --noEmit && vite build  -> dist/
npm run typecheck  # types only
npm run test       # vitest (pure core logic)
```

Load the production build by pointing **Load unpacked** at `dist/`.

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

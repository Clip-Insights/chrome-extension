# Clip Insights — Browser Extension

React + TypeScript **Manifest V3** browser extension built with **Vite + CRXJS**. It adds a study panel to learning-platform video pages (YouTube today; the architecture supports adding more) with timestamped screenshots and notes, AI summaries and key points, AI chat about the video, transcript copy, and PDF export.

The AI features are served by the [Clip Insights backend](https://github.com/Clip-Insights/backend); exported PDFs can be managed from the [web app](https://github.com/zubayr-ahmad/clip-insights-fe).

> For the full design — platform adapters, the IndexedDB storage schema, feature slices, and how to render/QA the styling — see **[ARCHITECTURE.md](./ARCHITECTURE.md)**. For contributor standards and the testing rule, see **[AGENTS.md](./AGENTS.md)**.

## What it does

- **Timeline** — capture a screenshot of the current video frame with one click, each pinned to its timestamp, and attach notes. Frames are downscaled before storage to keep the local database small.
- **Insights** — AI-generated summary and key points for the video, from its transcript.
- **Chat** — ask questions about the video; answers stream in token by token (SSE) using RAG over the transcript on the backend.
- **Transcript** — copy the video transcript.
- **Export** — generate a PDF of your screenshots and notes; signed-in users can save it to their account (managed in the web app).
- **Auth** — sign in with email/password or Google directly from the panel; usage limits (guest/free/pro/premium) are enforced against the backend.

## How it works

- The panel is a content script mounted in a **Shadow DOM** so its styles never leak into (or inherit from) the host page. All styling is one scoped design system in `src/ui/styles.css`.
- Everything platform-specific (where to inject the panel, how to find the `<video>` element, how to read the transcript, navigation, page title) lives behind a **`PlatformAdapter`** interface in `src/platforms/<name>`. Adding a new site is a new adapter plus a manifest match — no changes to `features/*` or `core/*`.
- Screenshots, notes, and cached transcripts persist locally in **IndexedDB**; usage quotas use `localStorage`.
- The extension reads the transcript client-side and slices it to the backend's token budget before requesting a summary or chat answer.

## Prerequisites

- Node.js 18+ and npm

## Setup

```bash
npm install
```

Environment is configured in `.env` (gitignored) and can be overridden in `.env.local`:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL |
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

## Related repositories

- **[backend](https://github.com/Clip-Insights/backend)** — the Django REST API powering summaries, chat, transcription, and file storage
- **[clip-insights-fe](https://github.com/zubayr-ahmad/clip-insights-fe)** — the web app where exported PDFs are managed

# Clip Insights — Architecture

> This document describes **(A)** how the current (vanilla HTML/CSS/JS) extension works today, feature by feature, and **(B)** the target **modular, platform-extensible** architecture the codebase is being migrated to (Vite + React + TypeScript). It is the single source of truth for behaviour during the migration — every feature listed in Part A must keep working identically after the rewrite.

---

## Part A — Current Extension (v3.0.0, vanilla JS)

### A.0 High-level overview

Clip Insights is a **Manifest V3 Chrome extension** that augments YouTube watch pages with a study/notes panel injected into the right-hand sidebar. It lets a learner capture video screenshots, write timestamped notes, generate AI summaries and key points, chat with an AI about the video, copy the transcript, and export everything to PDF (download or upload to the user's account).

There is **no browser-action popup UI** in practice. Although a `popup.html`/`popup.js` exist, `manifest.json` declares only `default_icon` (no `default_popup`). The real UI is `popup.html`'s markup **fetched and injected into the YouTube page** by the content script. `popup.js` is **dead/legacy code** (it calls `chrome.tabs.*` APIs unavailable to injected page scripts and references element IDs that no longer exist); the live logic is entirely in `content.js`.

### A.1 File map

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest. Declares content scripts, background SW, host permissions (`youtube.com`), web-accessible resources. |
| `background.js` | Service worker. Captures screenshots and note-timestamps by injecting functions into the page via `chrome.scripting.executeScript`. Keeps an in-memory `screenshotNotes` array (largely vestigial). |
| `content.js` | **The application** (~3000 lines). Injection, UI event wiring, notes, screenshots, summary, key points, chat, auth, transcript, PDF, limits, SPA-navigation handling. |
| `database.js` | `YouTubeNotesDatabase` class — IndexedDB persistence layer. Exposed as `window.YouTubeNotesDatabase`. |
| `popup.html` | The UI **template** (markup only) fetched and injected into the page. Also references `popup.js` (ignored when injected via `innerHTML`). |
| `styles.css` | Content-script CSS (injected globally on YouTube; all selectors namespaced with `clipinsights__` / `clip-insights-`). |
| `popup.js` | **Legacy/dead.** Superseded by `content.js`. |
| `libs/jspdf.umd.min.js` | PDF generation (bundled + content-script + web-accessible). |
| `libs/pdfobject.min.js` | PDF embedding helper (loaded, effectively unused). |
| `icons/`, `*.png` | Extension icons and image assets. |

### A.2 Manifest configuration

- `manifest_version: 3`, `name: "Clip Insights"`, `version: "3.0.0"`.
- `permissions: ["scripting"]`.
- `host_permissions: ["https://www.youtube.com/*"]`.
- `background.service_worker: "background.js"`.
- `content_scripts`: matches `https://www.youtube.com/*`; injects (in order) `libs/jspdf.umd.min.js`, `libs/pdfobject.min.js`, `database.js`, `content.js`, and `styles.css`.
- `web_accessible_resources`: `libs/*`, `popup.html`, and images — exposed to `youtube.com` so the content script can `fetch(chrome.runtime.getURL("popup.html"))`.
- `action`: icon only (no popup). `options_ui.open_in_tab: true` (no options page actually provided).

### A.3 Injection & SPA navigation lifecycle

YouTube is a single-page app; the content script must (re)inject on every video navigation and remove itself when not on a watch page.

- `watchYouTubeNavigation()` (entry point, called at script load):
  - Waits for the sidebar element `#related.style-scope.ytd-watch-flexy` via `waitForElement(selector, maxAttempts=20, interval=500ms)`.
  - Tracks `lastUrl`; on any change calls `injectClipInsightsNotepad()`.
  - Detects navigation with **both** a `MutationObserver` on `document.body` (`childList + subtree`) **and** a 1s `setInterval` fallback.
- `isYouTubeVideoPage()` → true when `location.pathname === "/watch"` and `?v=` present.
- `injectClipInsightsNotepad()`:
  1. If sidebar missing or not a watch page → remove any existing `#clip-insights-notepad` + styles, return.
  2. Instantiate `new YouTubeNotesDatabase()` (stored in module-global `notesDatabase`).
  3. Remove any previous panel (handles video→video navigation).
  4. Run retention cleanup (`deleteOldRecords`, 5-day threshold — see A.11).
  5. Create `<div id="clip-insights-notepad">`, `fetch(chrome.runtime.getURL("popup.html"))`, set as `innerHTML`, `prepend` into the sidebar.
  6. Inject a `<style id="clip-insights-notepad-styles">` block (note: most styling actually comes from `styles.css`; this inline block is minimal/legacy).
  7. Wire **all** event listeners (buttons, inputs, keyboard shortcuts), then `restoreScreenshotsAndNotes()`.

### A.4 Identity / content key — `getYouTubeUrl()`

All persisted records are keyed by a **normalized video URL**: `https://www.youtube.com/watch?v=<videoId>` (query string stripped to just `v`). This is the join key across every IndexedDB store and several `localStorage` counters. **In the new architecture this becomes the platform-agnostic `contentId`/`contentUrl`.**

### A.5 IndexedDB persistence (`database.js`)

- Database: `YouTubeNotesDatabase`, version `1`.
- Object stores (all `keyPath: "id"`, `autoIncrement`, with a `byVideoUrl` index on `videoUrl`):
  - **`textNotes`** — `{ id, text, videoTimestamp, videoUrl, createdAt }`
  - **`screenshots`** — `{ id, url (jpeg dataURL), videoTimestamp, videoUrl, createdAt }`
  - **`summaries`** — `{ id, text, videoUrl, createdAt }`
  - **`keypoints`** — `{ id, text, videoUrl, createdAt }` (`text` is a stringified/array list)
- Public methods:
  - `initDatabase()` — opens DB, creates stores on `onupgradeneeded`.
  - `saveTextNote(text, ts, url)`, `saveScreenshot(dataUrl, ts, url)`, `saveSummary(text, url)`, `saveKeypoints(text, url)`.
  - `retrieveVideoNotes(url)` — merges text notes + screenshots, tags each with `type`, sorts by `videoTimestamp`. (Uses `IDBKeyRange.only([url])` on the index.)
  - `getAllTextNotes(url)`, `getAllScreenshots(url)` — `getAll()` then JS-filter by `videoUrl` (defensive against index key shape).
  - `getSummary(url)`, `getKeypoints(url)` — via `byVideoUrl` index `getAll(url)`; return arrays (callers use `[0]?.text`).
  - `deleteTextNote(id)`, `deleteScreenshot(dataUrl, url)` (finds by matching `url`+`videoUrl`).
  - `deleteAllVideoNotes(url)` — clears textNotes/screenshots/summaries/keypoints for that video in one transaction.
  - `updateNote(id, partial)` — get → merge → put.
  - `getTextNotesCount()`, `getScreenshotsCount()`.

> **Migration constraint:** the new DB layer MUST keep the same database name, version/upgrade path, store names, key paths, indices, and record shapes so existing users' data survives the upgrade. The class is renamed/abstracted but the schema is preserved.

### A.6 Screenshots

- **Capture** (`takeScreenshot()` in content.js → message `takeScreenshot` → `background.js`):
  - Per-video cap of **40** screenshots, tracked in `localStorage["<videoUrl>_screenshotCount"]`. At the cap, alert and abort.
  - `background.js` runs `takeScreenshotAtCurrentTime` in the page via `chrome.scripting.executeScript`: finds `document.querySelector("video")`, reads `video.currentTime`, draws the current frame to a `<canvas>` sized to `videoWidth × videoHeight`, exports `canvas.toDataURL("image/jpeg", 0.5)`, returns `{ screenshotUrl, time, size(KB) }`.
  - On success: `addScreenshotToPopup(url, time)` (renders immediately), `notesDatabase.saveScreenshot(...)`, increment count.
- **Render** (`addScreenshotToPopup`): an `<img>` with a timestamp badge and a delete button; auto-scrolls to newest. Delete removes from IndexedDB (`deleteScreenshot`) + DOM and decrements the count.
- **Why background-script capture?** Drawing a cross-origin `<video>` to canvas requires running in the page's context with the right privileges; the SW injects the capture function targeted at the sender tab.

### A.7 Notes (text)

- **Add** (`addNote()`): reads `#clipinsights__noteInput`; if empty → alert. Sends `addNote` message to `background.js` (`logNoteWithTime` returns the current `video.currentTime`); then `saveTextNote(text, time, url)` and `addNoteToPopup(text, time)`. Enter (without Shift) submits.
- **Render** (`addNoteToPopup`): a note row with the text, an HMS timestamp, and Edit + Delete buttons; auto-scrolls to newest.
- **Edit** (`enableNoteEditMode` → `updateNoteInDatabase`): inline `<textarea>`; Enter saves, Esc cancels, blur saves; updates the matching record (found by `videoTimestamp`) via `updateNote`. Brief "updated" highlight.
- **Delete**: finds the record by `text`+`videoTimestamp`, `deleteTextNote(id)`, removes the row.

### A.8 Timestamps & mappings

- `convertSecondsToHMS(totalSeconds)` formats `video.currentTime` into `HH:MM:SS` / `MM:SS` / `SS` (hours/minutes shown only when non-zero). Used for badges and PDF.
- **Mapping model:** every note and screenshot stores `videoTimestamp` (float seconds). The merged, timestamp-sorted view (`restoreScreenshotsAndNotes` for UI; `retrieveVideoNotes`/the PDF builder for export) is what produces the chronological "notes + screenshots interleaved by time" experience. In the PDF, timestamps are clickable deep-links `…&t=<sec>s`.
- `restoreScreenshotsAndNotes()` (on inject): loads all screenshots + text notes for the current video, merges, sorts by `videoTimestamp`, and re-renders them in order.

### A.9 Transcript

- `getYoutubeTranscript(youtubeUrl)` — fetches the transcript **without** the official captions UI, mirroring `youtube-transcript-api`:
  1. GET the watch page, extract `INNERTUBE_API_KEY` (regex; falls back to a known public key).
  2. POST `youtubei/v1/player` with the **ANDROID** client context (avoids the WEB client's PO-token requirement).
  3. Read `captions.playerCaptionsTracklistRenderer.captionTracks`; pick **manual English → auto English → first**.
  4. Clean `baseUrl` (strip `&fmt=srv3`; if `&exp=xpe` present → requires PoToken → error), GET the XML.
  5. Parse `<text>` nodes → `{ start, duration, text }[]`, decoding HTML entities and stripping inline tags.
  - Returns `{ success, data, error }`.
- `copyTranscript(url)` → formats segments as `[HMS] text\n…`. `handleCopyTranscript()` wires the **Transcript** button: copies to clipboard with loading/restored/failed button states.
- `receiveTokenLimit()` → `GET /api/textutils/tokenlimit/` returns `{ tokens, charPerToken }`.
- `fetchTranscript(url)` — **token-budget slicing**: walks segments accumulating `ceil(chars/charPerToken)` until the `tokens` budget is hit; returns `{ transcript, lastTagTime }` where `lastTagTime` is the timestamp the context was sliced at (`-1` if the whole transcript fits). This bounds how much of long videos is sent to the AI and drives the "Context up to X min" UI labels.

### A.10 AI features — Summary, Key Points, Chat

All call the Django backend at `API_URL` (`https://clipinsights-159611886407.europe-west1.run.app`; local `http://127.0.0.1:8000` commented out).

- **Summary** (`showSummary`/`getSummary`, button `#clipinsights__summaryBtn`, shortcut Ctrl+Shift+Y; hide Ctrl+Shift+H):
  - If a saved summary+keypoints exist for the video → render from IndexedDB (no API call).
  - Else `fetchTranscript` → `POST /api/textutils/summary/ { youtube_url, transcription }` → `{ success, summary, keypoints }`. On success: append "…upto X minutes" when sliced, save both to IndexedDB, render. `formatSummaryToHTML` converts `**bold**`, newlines, and `- ` bullets to HTML.
- **Key Points** (`showKeyPoints`/`getKeypoints`, button `#clipinsights__keypointsBtn`, shortcut Ctrl+Shift+K; hide Ctrl+Shift+L): **same backend call** as Summary (the `/summary/` endpoint returns both); separate function exists only to manage the Key Points button/UI state. `parseList` + `formatKeypoints` normalize the Python-list-ish string the backend returns into `<ul><li>…`.
- **Chat** (`sendMessage`, button `#clipinsights__sendChatBtn` / `#clipinsights__chatBtn` to open):
  - Opening the chat proactively calls `fetchTranscript` to show the context window label and the remaining-limit badge.
  - `POST /api/textutils/chat/` with `{ youtube_url, query, transcription, stream: true, chat_memory_enabled, chat_history }`. Response is **SSE-style streamed** (`data: <token>` lines; `[DONE]` terminates; `Error:` prefixes errors). Tokens are appended live to the bot message element.
  - **Chat memory:** `CHAT_MEMORY_ENABLED = true`, `CHAT_MEMORY_WINDOW_SIZE = 4`. `getChatHistory()` reads the last N DOM messages as `{role, content}` and sends them for context.

### A.11 Limits (rate limiting / quotas)

Several independent client-side limits, all in `localStorage`, all with a rolling 24h reset (except the per-video screenshot cap):

| Limit | Key | Max | Reset | Notes |
|---|---|---|---|---|
| Screenshots / video | `"<videoUrl>_screenshotCount"` | 40 | per-video (cleared on Clear / retention) | hard cap on capture |
| Summary + Key Points / day | `"yt-player-bandwidth-performance"` | 5 | 24h rolling | shared counter; drives status-bar badge |
| Chat / day | `"yt-chat-limit"` | 10 | 24h rolling | drives chat limit badge |
| Generic daily limit | `"clipinsights_daily_limit"` | 5 | 24h rolling | parallel/partly-legacy `updateLimitUI`/`updateButtonStates`/`decrementDailyLimit` system |

- Badge/status helpers: `updateLimitBadge`, `updateSummaryStatusBar`, `updateKeypointsStatusBar`, `updateLimitUI`, `updateButtonStates` (colour states: normal/warning/depleted). A 5s `setInterval` refreshes `updateLimitUI`.
- **Retention cleanup** (`deleteOldRecords(thresholdMillis, now)`): on every inject, cursors through all four stores and deletes records whose `createdAt` is older than **5 days**.

### A.12 Authentication

- Backend (Django REST): `POST /api/account/login/` → `{ token: { access, refresh } }`; `POST /api/account/refresh-token/` → `{ access }`.
- **Token storage is encrypted at rest in `localStorage`:** `getKey()` derives an AES-GCM-256 key via PBKDF2 (100k iterations, SHA-256) from a hardcoded `ENCRYPTION_KEY` + fixed salt. `encrypt`/`decrypt` (AES-GCM, random 12-byte IV prepended, base64). `storeToken`/`getToken` wrap these under keys `"access"` / `"refresh"`.
  - ⚠️ **Security note:** the encryption key and salt are hardcoded in the client — this is light obfuscation, not real secrecy. Flagged for the rewrite (do not regress, but document; consider `chrome.storage` + a clearer threat model).
- `authenticate()` — reads email/password inputs, posts login (`credentials: "include"`), stores tokens, swaps login view → main view.
- `isTokenExpired(jwt)` — decodes the JWT payload, compares `exp`. `refreshAccessToken()` — uses refresh token to mint a new access token. `checkAuthenticationStatus()` → `"logged-in" | "logged-out"` (auto-refreshes access when expired; logs out if refresh expired). `logout()` removes both tokens.
- The header **Login/Logout** button (`#clipinsights__loginBtn`) toggles label/behaviour based on `checkAuthenticationStatus()`.

### A.13 Export — Download PDF & Upload

- `generatePDF()` (jsPDF) builds a styled document:
  - Header with the Clip Insights logo (SVG→PNG at 4× via canvas) linking to the Chrome Web Store; the video title links to the video.
  - **Key Points** section (parsed list, numbered, left-rule styling).
  - **Screenshots & Notes** interleaved in `videoTimestamp` order; each item gets a clickable timestamp badge deep-linking to `…&t=<sec>s`; screenshots embedded as JPEG with borders; manual pagination with per-page footer (small logo, generation date, page number).
  - **Video Summary** section last (cleaned whitespace, paginated).
  - Returns `{ pdfBlob, fileName }` where `fileName = "<cleaned video title>.pdf"` (`cleanYouTubeTitle` strips leading `(n)` and trailing `- YouTube`).
- **Download** (`saveAsPDF`, button `#clipinsights__saveBtn`, shortcut Ctrl+Shift+P): object-URL + temporary `<a download>`; button shows "Saving…".
- **Upload** (`uploadPDF`, button `#clipinsights__uploadBtn`, shortcut Ctrl+Shift+U): requires a valid access token (else alert "Please login"); `POST /api/userspace/files/` as `multipart/form-data` with `Authorization: Bearer <access>`; button shows "Uploading…".

### A.14 Clear all (`clearAllScreenshotsAndNotes`, button `#clipinsights__clearBtn`, shortcut Ctrl+Shift+C)

Removes rendered notes/screenshots (preserving any `clipinsights__userlimit` element), clears summary/keypoints/chat panels, removes the per-video screenshot count and summary/keypoints `localStorage`, and `deleteAllVideoNotes(videoUrl)` from IndexedDB.

### A.15 Keyboard shortcuts (all `Ctrl+Shift+…`)

`S` screenshot · `Y` show summary · `H` hide summary · `K` show key points · `L` hide key points · `C` clear all · `T` copy transcript · `P` save PDF · `U` upload PDF.

### A.16 Backend API surface (consumed by the extension)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/account/login/` | Login → access/refresh JWTs |
| POST | `/api/account/refresh-token/` | Refresh access JWT |
| GET | `/api/textutils/tokenlimit/` | `{ tokens, charPerToken }` for transcript slicing |
| POST | `/api/textutils/summary/` | `{ summary, keypoints }` from transcript |
| POST | `/api/textutils/chat/` | Streamed AI chat (SSE) |
| POST | `/api/userspace/files/` | Upload generated PDF (auth required) |

(Backend also exposes `/api/textutils/transcribe/`, not currently used by the client.)

### A.17 Known issues / tech debt (to address or preserve-and-flag during migration)

- `content.js` is a ~3000-line god-module mixing platform glue, persistence, networking, crypto, UI, and PDF.
- Summary and Key Points duplicate an entire request flow for UI reasons (DRY violation).
- `popup.js` is dead code; `pdfobject.min.js` is loaded but unused.
- Hardcoded `ENCRYPTION_KEY`/salt; `API_URL` hardcoded (no env separation).
- Inline `<style>` block in `injectClipInsightsNotepad` overlaps `styles.css`.
- Several "don't needed" `localStorage` helpers remain (`saveNoteToLocalStorage`, etc.).
- Four overlapping limit systems.

---

## Part B — Target Architecture (Vite + React + TypeScript, platform-extensible)

### B.1 Goals

1. **No functional regression** — every behaviour in Part A works identically; existing users' IndexedDB data is preserved (same DB name/version/stores/shapes).
2. **Modular & platform-extensible** — the YouTube-specific logic (where to inject, how to find the `<video>`, how to read the content URL/title, how to fetch the transcript, how to detect navigation) is isolated behind a **`PlatformAdapter` interface**. Adding Coursera / DeepLearning.AI later = adding one adapter + one manifest match entry, with **no changes to feature code** (Open/Closed Principle).
3. **Clean separation of concerns** (SRP): persistence, API client, auth, transcript, limits, PDF, and each feature are independent units, testable in isolation.
4. **Type-safe** end to end; **bundled** build that loads unpacked in Chrome (MV3).

### B.2 The platform abstraction (the core extensibility mechanism)

```ts
// core/platform/PlatformAdapter.ts
export interface VideoContext {
  /** Stable, normalized id used as the DB/storage key (was getYouTubeUrl()). */
  contentId: string;
  contentUrl: string;
  title: string;
}

export interface TranscriptSegment { start: number; duration: number; text: string; }

export interface PlatformAdapter {
  readonly id: 'youtube' | 'coursera' | 'deeplearning' | string;
  /** Does this adapter handle the current location? */
  matches(url: URL): boolean;
  /** True when we're on an actual video/content page (was isYouTubeVideoPage). */
  isContentPage(): boolean;
  /** Identity + metadata for the current content (was getYouTubeUrl + title). */
  getVideoContext(): VideoContext;
  /** The media element to screenshot (was document.querySelector('video')). */
  getVideoElement(): HTMLVideoElement | null;
  /** Where the panel mounts (was #related…ytd-watch-flexy). */
  getInjectionTarget(): Element | null;
  /** Platform-specific transcript retrieval (was getYoutubeTranscript). */
  getTranscript(ctx: VideoContext): Promise<{ success: boolean; data: TranscriptSegment[] | null; error: string | null }>;
  /** Fire `onChange` on SPA navigation (was watchYouTubeNavigation/MutationObserver). */
  watchNavigation(onChange: () => void): () => void; // returns unsubscribe
}
```

- **`core/platform/registry.ts`** holds the registered adapters; `resolveAdapter(location)` returns the first whose `matches()` is true. The content-script entry picks the adapter at runtime, so one built extension renders correctly per platform.
- **`platforms/youtube/YouTubeAdapter.ts`** is the first implementation (ports A.3, A.4, A.6 capture target, A.9 transcript).

### B.3 Directory layout (feature-sliced)

```
clip-insights-ext-<react>/
  manifest.config.ts            # typed MV3 manifest (CRXJS) — host_permissions/matches list = platforms
  vite.config.ts
  tsconfig.json
  ARCHITECTURE.md               # (this file, moved here)
  src/
    content/
      index.ts                  # entry: resolve adapter → mount React app into injection target (Shadow DOM)
      mount.tsx
    core/                       # platform-agnostic, framework-agnostic
      platform/                 # PlatformAdapter, registry, VideoContext, types
      storage/                  # IndexedDB layer (preserves schema from A.5) + localStorage limit store
      api/                      # typed client for the 6 endpoints (A.16) + env (API_URL)
      auth/                     # crypto (PBKDF2/AES-GCM), token store, session (A.12)
      transcript/               # token-budget slicing (A.9) + transcriptCache (one fetch/content, shared by all features)
      screenshot/               # captureFrame: video -> JPEG (A.6, now content-side)
      keyboard/                 # isolateKeyboard: stop host-page hotkeys leaking from the Shadow DOM (B.7)
      pdf/                      # generatePDF (A.13)
      limits/                   # unified quota/limit service (A.11)
      time.ts                   # convertSecondsToHMS, etc.
    features/                   # vertical slices (UI + logic per feature)
      timeline/  insights/  chat/  auth/  export/  transcript/
    platforms/
      youtube/                  # YouTubeAdapter + youtube transcript impl
      # coursera/  deeplearning/  (future — added without touching features/ or core/)
    ui/                         # shared composition (App/Panel), components, icons, toast/, scoped styles
    assets/                     # icons, logo
```

### B.4 Module responsibilities (SRP map from the old code)

| Old (content.js / *.js) | New home |
|---|---|
| `injectClipInsightsNotepad`, `watchYouTubeNavigation`, `waitForElement`, `isYouTubeVideoPage`, `getYouTubeUrl` | `platforms/youtube/YouTubeAdapter` + `content/` |
| `YouTubeNotesDatabase` (database.js) | `core/storage` (schema preserved; renamed to a platform-neutral store keyed by `contentId`) |
| `getYoutubeTranscript`, `copyTranscript`, `fetchTranscript`, `receiveTokenLimit` | transcript fetch → `platforms/youtube`; slicing/budget → `core/transcript`; copy UI → `features/transcript` |
| `getSummary`/`getKeypoints` (+ format/parse) | `features/summary`, `features/keypoints` sharing one `core/api` call (kills the duplication) |
| `sendMessage`, `getChatHistory`, SSE parsing | `features/chat` + `core/api` streaming helper |
| `authenticate`, token crypto, refresh, status | `core/auth` + `features/auth` |
| `generatePDF`, `saveAsPDF`, `uploadPDF` | `core/pdf` + `features/export` |
| limit/badge helpers, retention `deleteOldRecords` | `core/limits` + `core/storage` |
| `background.js` capture functions | `core/screenshot` (run directly in the content script — no SW needed) |

### B.5 Key migration decisions / constraints

- **UI isolation:** the React panel mounts inside a **Shadow DOM** root so YouTube's CSS can't bleak in/out (replacing the global, namespaced `styles.css` approach). Styles ship scoped within the shadow root.
- **Screenshot capture moves into the content script.** v3 routed canvas-from-`<video>` through the background SW via `chrome.scripting.executeScript`, but that injected function ran in the same isolated world the content script already has, and YouTube media is same-origin (MSE blob URLs) so the canvas is not tainted. Capturing directly (`core/screenshot` using the adapter's `getVideoElement()`) removes the SW, the messaging round-trip, and the `scripting` permission (KISS/YAGNI). No background service worker is needed.
- **Storage schema frozen** at the current shape (A.5) for data continuity; access is wrapped in a typed repository per content type.
- **`API_URL` and `ENCRYPTION_KEY`** move to build-time env (`.env` / `import.meta.env`) with documented dev/prod separation; behaviour unchanged.
- **Limits are plan-driven (v4.1).** `core/limits/limitService.ts` no longer keeps localStorage daily counters; AI quotas are enforced by the backend (401/429 with a structured body) and the service caches the caller's plan from `GET /api/plans/me/` (guest plan from `GET /api/plans/` when logged out). Client-only limits (note length, notes/video, screenshots/video) use the plan's values; only the per-video screenshot *count* is still tracked locally. Guests opening AI views get a `SignupPrompt` (`Panel.openAiView`). Limit 429s carry `resets_at` (UTC ISO); `core/api/client.ts` appends a reset phrase in the viewer's timezone (`core/time.formatResetTime`) to the error message shown in chat/insights.
- **Dead code dropped:** `popup.js`, `pdfobject.min.js`, the legacy `localStorage` note/screenshot helpers, the inline `<style>` block.

### B.6 Adding a new platform later (the payoff)

1. Create `src/platforms/<name>/<Name>Adapter.ts` implementing `PlatformAdapter`.
2. Register it in `core/platform/registry.ts`.
3. Add the host match to `manifest.config.ts` (`content_scripts.matches` + `host_permissions`).

No changes to `features/*` or `core/*`. The same build, on a Coursera lecture page, resolves the Coursera adapter and renders the same panel with Coursera-specific injection/transcript wiring.

### B.7 Post-migration fixes (parity & robustness)

These address issues found after the first conversion. Each fix is platform-agnostic so it benefits every future adapter.

- **Host-page keyboard leak (`core/keyboard/isolateKeyboard.ts`).** Keyboard events are *composed*, so they bubble out of the Shadow DOM to `document`, where host platforms bind single-key hotkeys (YouTube's `i`, `l`, `f`, …). Event retargeting makes the host see the focused element as the shadow host (`<div>`), not our `<input>`, so its "is the user typing?" check fails and it fires shortcuts while the user types. Fix: `stopPropagation()` for `keydown`/`keyup`/`keypress` at the shadow root (wired in `content/mount.tsx`). React 18 delegates its listeners to the render container (a child of the shadow root), so it still receives events first — typing and in-panel handling keep working. This is the general defense for any host platform with global hotkeys. (v3 was unaffected only because it was not in a Shadow DOM.)
- **Title freshness for PDF (`PlatformAdapter.getTitle()`).** The PDF title/filename now comes from `adapter.getTitle()`, read *fresh* at export time, instead of the title captured at mount. YouTube updates `document.title` shortly after SPA navigation, so the mount-time value was often a stale/home title; the YouTube adapter prefers the watch-page title element and falls back to `document.title`.
- **Single transcript source of truth (`core/transcript/transcriptCache.ts`).** Each feature used to fetch the transcript independently; the transcript API is intermittent, so Copy could succeed while Summary/Chat saw "no captions" and sent that string to the backend. The cache memoizes the first successful fetch per `contentId` (with one retry; failures are not cached) so Copy, Summary, Key Points and Chat all use the same result.
- **Don't send a non-transcript to the AI.** `getSlicedTranscript` now reports `available: false` for empty/whitespace slices, and **chat** now guards on `available` before consuming a credit or calling the backend (matching summary/key points). Genuinely caption-less videos get a clear "transcript unavailable" message from the frontend.
  - *Backend caveat:* `videos/services/summarize.py` caches summaries by `youtube_url` (`caching = True`). A URL whose summary was poisoned by an earlier bad transcript will keep returning the bad summary regardless of what the client now sends — that row must be cleared (or transcript validation added) on the backend.
- **Toasts replace `alert()` (`ui/toast/`).** A `ToastProvider` + `useToast()` + `<Toaster/>` render non-blocking success/error/info notifications scoped inside the panel; every former `alert()` now routes through it.
- **Styling parity.** `:host { all: initial }` reset the panel's base font to 16px, oversizing v3's `em`/`larger` text; an explicit 14px base plus UA-margin resets for headings/paragraphs restore the original proportions. The chat messages area uses a fixed height (a `flex:1` child collapsed with no container height), and login inputs are full-width block.

---

## Part C — Current design system, recent changes & styling QA

This section reflects the state after the post-migration UI/UX and backend-integration work. It supersedes the relevant notes above where they differ.

### C.1 Design system (`src/ui/styles.css`)

- **One indigo brand identity** expressed as CSS custom properties on `#clip-insights-notepad` (`--ci-accent`, `--ci-accent-strong`, `--ci-accent-soft`, `--ci-ink`, `--ci-text`, `--ci-muted`, `--ci-line`, `--ci-surface`, `--ci-canvas`). Reuse these tokens — don't hard-code colours.
- **Fixed-height panel.** `--ci-panel-height: 450px` is the single source of truth for the panel height. `#clipinsights__body` is a flex column of that height; **every view** is a flex column whose scroll region is `flex: 1; min-height: 0`. Result: all views (main, summary, key points, chat, login) are exactly the same height and switching views never makes the panel jump. New views must follow this header-plus-scroll-region pattern.
- **Action buttons are two 2×2 grids** (`.clipinsights__button-container` for Snapshot/Summary/Key Points/Chat; `#clipinsights__loginBtnContainer` for Download/Upload/Transcript/Clear). A 2-column grid gives each button ~half the card width so the longest label ("Key Points") fits in full — **no ellipsis/truncation**, even down to ~320px. (This replaced the earlier single-row `flex:1` layout that truncated labels.)
- **Note composer** (`#clipinsights__noteInput`) is capped at ~2 lines (`min-height:38px; max-height:52px`) and scrolls with the scrollbar hidden.
- **Notes** use a three-dots options menu (`MoreIcon`) with Edit/Delete; screenshots use a hover delete button.
- **Host margin.** Spacing below the panel is set on the host element in `content/mount.tsx` (`host.style.marginBottom`), *outside* the shadow root, so `:host { all: initial }` can't strip it.

### C.2 Chat "thinking" + streaming UX

- On opening chat, `prepareContext()` shows an "Analyzing video…" status with a pulsing info icon (the connect/loading signal).
- While waiting for the first streamed token, the bot bubble shows a **three-dot typing indicator** (`.clipinsights__typing`).
- While tokens stream in, a **blinking caret** (`.clipinsights__caret`) trails the live text, like ChatGPT. Both are driven by `ChatView` from `chat.sending` + whether the last bot message is empty.

### C.3 Storage robustness (screenshots/notes)

- **Screenshots are downscaled** in `core/screenshot/capture.ts` to a 1280px longest edge (JPEG q≈0.6). Full 1080p/4K frames bloated IndexedDB fast — a handful could exhaust the quota and then *silently* block all further writes. Keep the cap.
- **Writes never fail silently.** `useTimeline.addNote/addScreenshot` wrap the IndexedDB write in try/catch and surface a toast on failure; `NoteComposer` only clears the input after a successful save (so a failed write keeps the user's text). Note length and notes/screenshots per video are capped by the user's plan (values fetched from the backend; oversized note input is trimmed with a toast, never rejected).

### C.4 Insights & PDF

- Summary/key points come from the backend's `instructor`-structured response: the summary is prose; **key points are a real `string[]`** (parsed by `core/format.parseKeypoints`, rendered as a styled list). `formatSummaryToHtml` only handles `**bold**`/newlines.
- The PDF (`core/pdf/generatePdf.ts`) is a branded, minimal layout (one palette + one type scale, branded header/footer, aspect-correct screenshots, hanging-indent key points). **Page-break fix:** a shared `drawLines()` helper re-applies the text style on every line, because a mid-block page break runs `footer()` which leaves the font at the small grey caption style — without re-applying, text spilling onto the next page rendered in the wrong size/colour.

### C.5 Build

- `vite.config.ts` sets `build.chunkSizeWarningLimit: 1500`. The content script intentionally bundles React + jsPDF + html2canvas into one file (it loads from local disk, and CRXJS ships the content script as a single bundle), so the default 500 kB warning is cosmetic here.

### C.6 Rendering & QA the styling

Loading the full unpacked extension into an automated browser is awkward, so styling is QA'd against the **real stylesheet** with a lightweight harness:

1. **`render-harness.html`** (project root) `<link>`s the real `src/ui/styles.css` and renders static markup that mirrors each component's DOM, using the **exact icon SVGs** from `src/ui/icons.tsx`. (`:host{all:initial}` simply doesn't match outside a shadow root; the `#clip-insights-notepad` scoped rules do all the work.) It renders all views — main (with a populated timeline), chat (streaming + thinking), summary, key points, login — plus a narrow (320px) copy to catch overflow/clipping.
2. Serve the extension directory over HTTP (`python -m http.server 8849`) — `file://` is blocked for automated browsers.
3. Open `http://127.0.0.1:8849/render-harness.html` and screenshot full-page (e.g. via the Playwright MCP) at a realistic sidebar width (~360px) and a narrow one (~320px).
4. Verify: all views share the 450px height; no truncated button labels; no horizontal overflow; balanced proportions (the timeline/content area, not the header, gets the space); chat indicators animate.

When you change `styles.css` or a component's DOM, keep the harness markup in sync and re-render. The stylesheet is the single source of truth; only the harness's markup/icons are mirrored.

> **Reloading after a build:** the unpacked extension must be **Reloaded** at `chrome://extensions` after every `npm run build`. A stale load is the usual reason "old icons/styles" appear unchanged.

### C.7 Backend integration notes (for reference)

- Summary/key points: `POST /api/textutils/summary/` returns `{summary, keypoints}` from an `instructor`-constrained Pydantic model (no client-side regex needed).
- Chat: `POST /api/textutils/chat/` streams SSE `data: <token>` lines ending in `[DONE]`; the client sends the sliced transcript + last-4-message history each request (no server-side RAG).
- Profile: `GET /api/account/profile/` returns `{id, email, name}` (used by the settings view).

### C.8 July 2026 UX / PDF / injection update

- **Injection point.** The panel now mounts as the **first child of `#secondary-inner`** (fallback: the old `#related` selector). Ads and playlist panels are siblings of `#related` inside `#secondary-inner`, so the old mount point pushed the panel below them.
- **Markdown rendering (`core/markdown.ts`).** The LLM emits GitHub-flavoured markdown; chat answers and summaries render through `marked` (gfm + breaks) sanitized by DOMPurify (links forced to `target=_blank`). `.clipinsights__md` styles every component (bold, lists, tables with in-place horizontal scroll, fenced code, blockquote side line, headings, hr). `formatSummaryToHtml` was removed. Bot bubbles containing tables/code take the full row width.
- **Explicit insights generation.** Summary/Key Points views no longer auto-generate on open: an idle state shows a **Generate** button; a cached result shows **Regenerate** and **Clear** header actions (`useInsights.regenerate/clear`, `repository.deleteInsights`). Reason: an old cached result may be poor, and opening a view must never silently spend quota.
- **Compact view headers (`ui/components/ViewHeader.tsx`).** Summary / Key Points / Clip Bot / Settings share a ~30px header (accent icon chip + title + icon actions), replacing the old tall emoji headings, so the scrollable content region gets the height.
- **Settings view (`features/settings/`).** The header button becomes **Settings** when logged in (Login otherwise): profile (avatar/name/email from `/api/account/profile/`), plan card, usage meters (summary/chat used vs limit + reset phrase), and the Logout action (moved from the header).
- **Chat composer.** Multi-line `<textarea>`: Enter sends, Shift+Enter inserts a newline (`field-sizing: content` grows it up to ~3 lines); the send button is an icon (paper plane). User bubbles and notes render `white-space: pre-wrap`, so Shift+Enter line breaks survive in the UI **and** in the PDF (rich-text layout preserves `\n`).
- **Seek on timestamp.** Note/screenshot timestamp badges are buttons; clicking seeks the video (`useTimeline.seekTo` via the adapter's `getVideoElement()`).
- **Timeline autoscroll.** Scrolls only when items are **added**, and re-scrolls when the last item's image finishes decoding (a fresh screenshot has no height until then, which used to leave the view at the image's top).
- **Tooltip clamping.** Tooltips on edge buttons (grid first/last column, header button, add-note, screenshot delete, send) are left-/right-aligned instead of centred so they can't clip at the panel boundary.
- **PDF Unicode (`core/pdf/richText.ts` + `generatePdf.ts`).** jsPDF's built-in fonts only encode CP-1252; any other character used to corrupt whole lines. Text is now segmented into runs: CP-1252 runs are typeset as real PDF text, and everything else (emoji incl. ZWJ sequences, CJK, arrows, any script) is rendered by the **browser** to a canvas and embedded inline as an image — generic, no per-character hardcoding. Word-wrap runs on measured mixed runs (`layoutRich`), user line breaks are preserved, and the AI summary/key points are converted from markdown to plain text (`markdownToPlainText`) before typesetting.

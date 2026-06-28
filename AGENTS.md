# AGENTS.md — Clip Insights Browser Extension

**Role:** You are a senior TypeScript/React engineer working on the Clip Insights MV3 browser extension. You own each task end to end: understand, plan, implement to the standards below, test, and self-review.

This file is **standards and guidelines only**. For *what the extension is and how it works* (architecture, platform adapters, storage schema, features, post-migration fixes, and **how to render/QA the styling**), read [ARCHITECTURE.md](./ARCHITECTURE.md) — it is the single source of truth for project detail.

---

## Tech stack (at a glance)

- **Vite + React 18 + TypeScript**, Manifest V3, built with **CRXJS**.
- **UI is mounted in a Shadow DOM**; styles are scoped in `src/ui/styles.css` (one design system, CSS custom properties, fixed-height panel via `--ci-panel-height`).
- **Persistence:** IndexedDB (`src/core/storage`) + `localStorage` for quotas. The DB name/version/stores/indices are **frozen** for data continuity — do not change them.
- **Tests:** **Vitest** (`node` environment) for pure logic.

## Commands

```bash
npm run dev         # Vite dev server
npm run build       # tsc --noEmit && vite build  (must pass before done)
npm run typecheck   # tsc --noEmit
npm run test        # vitest run
npm run test:watch  # vitest watch
```

Load the unpacked build from `dist/` at `chrome://extensions`. **After every rebuild, click Reload on the extension** — Chrome serves a stale build otherwise (this is the usual cause of "old icons/styles still showing").

---

## Workflow for every change

1. **Discover** — read the relevant feature/core code and [ARCHITECTURE.md](./ARCHITECTURE.md). Match existing patterns.
2. **Plan** — keep the change inside the existing architecture (feature slices + core + platform adapter).
3. **Implement** — follow the coding standards.
4. **Test** — run and extend the suite (see the testing rule).
5. **Verify styling** — if you touched UI/CSS, render and visually check it (see ARCHITECTURE.md "Rendering & QA the styling"). Confirm at a realistic sidebar width (~360px) and a narrow one (~320px): no overflow, no clipped labels, all views share one height.
6. **Self-review** — re-read the diff; check anti-patterns; confirm `npm run build` and `npm run test` pass.

---

## Design principles (apply with judgement)

- **Feature slicing.** Code is organized by feature (`src/features/*`), each owning its UI + hook. Cross-cutting, framework-agnostic logic lives in `src/core/*`. Shared UI in `src/ui/*`.
- **Feature independence.** Features must not import another feature's internals. Communicate via `core` services, props, or context.
- **Platform abstraction (Open/Closed).** Anything platform-specific (where to inject, how to find the `<video>`, transcript retrieval, navigation, title) goes behind the `PlatformAdapter` interface in `src/platforms/<name>`. Adding a site = a new adapter + a manifest match; **never** put YouTube-specific logic in `features/*` or `core/*`.
- **SRP / DIP, DRY, KISS, YAGNI** — small focused modules, depend on abstractions, extract only on the rule of three, prefer the simple direct solution.

## Coding standards

- **TypeScript strict; no `any`.** Type the boundaries (storage records, API payloads, adapter interface).
- **Logic in hooks, not components.** Components render; `useXxx` hooks own state and side effects. Keep JSX declarative.
- **Use the `@/` path alias** for imports from `src`.
- **Never let writes/async fail silently.** Wrap storage/network calls and surface failures through the toast system (`useToast`); never use `alert()`.
- **Respect the Shadow DOM boundary** — use `composedPath()` for outside-click checks; keep keyboard isolation intact (`core/keyboard`).
- **Styling:** one design system in `styles.css`. Reuse the CSS custom properties (`--ci-*`); don't hard-code colours/sizes. The panel is a fixed-height flex column — new views must follow the "header + `flex:1; min-height:0` scroll region" pattern so all views stay the same height.
- **Comments explain *why*.** No commented-out code or leftover `TODO`s.

### Critical anti-patterns (do not do these)

- Changing the IndexedDB name/version/store shapes (breaks existing users' data).
- Putting platform-specific logic outside a `PlatformAdapter`.
- Importing across feature internals.
- Swallowing errors (no toast / no log) — especially around storage and streaming.
- Storing full-resolution screenshots — frames are downscaled in `core/screenshot/capture.ts` to bound storage; keep that.
- Re-introducing global (non-shadow) CSS or `alert()`.

---

## Testing rule (mandatory)

**When you add or change functionality you must (a) run the existing tests and keep them green, and (b) add tests covering the new/changed behaviour.** A change is not done until its tests exist and pass.

- Tests are `*.test.ts` next to the code they cover; the env is `node`, so test **pure logic** (parsing, slicing, limits/quota, time, transcript cache).
- For browser-only APIs (e.g. `localStorage`), stub them in the test rather than adding a DOM environment (see `src/core/limits/limitService.test.ts`).
- Cover edge cases: empty/nullish input, boundary values (limits at 0 and max), and the rolling-window reset.
- DOM/canvas/IndexedDB-heavy code (PDF generation, screenshot capture, React components) isn't unit-tested in the `node` env — verify those by **building and rendering** (ARCHITECTURE.md), not by adding heavy test infra unless asked.

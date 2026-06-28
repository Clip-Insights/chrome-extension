/**
 * Platform abstraction — the single seam that makes Clip Insights extensible
 * to new learning platforms. Feature and core code depend only on these types,
 * never on YouTube (or any platform) directly. See ARCHITECTURE.md B.2.
 */

/** One caption/transcript line. */
export interface TranscriptSegment {
  /** Start time in seconds. */
  start: number;
  /** Duration in seconds. */
  duration: number;
  text: string;
}

export interface TranscriptResult {
  success: boolean;
  data: TranscriptSegment[] | null;
  error: string | null;
}

/**
 * Identity for the piece of content currently on screen.
 *
 * Note: the title is intentionally NOT stored here. It is read on demand via
 * `PlatformAdapter.getTitle()` so it can't go stale on SPA navigation.
 */
export interface VideoContext {
  /**
   * Stable, normalized key for the content. Used as the persistence key across
   * all stores and limit counters (the v3 `getYouTubeUrl()` value).
   */
  contentId: string;
  /** Canonical, shareable URL for the content. */
  contentUrl: string;
}

/**
 * Everything platform-specific lives behind this interface. To add a platform,
 * implement it and register the instance in `registry.ts`.
 */
export interface PlatformAdapter {
  /** Stable identifier, e.g. `'youtube'`. */
  readonly id: string;

  /** True when this adapter should handle the given location. */
  matches(url: URL): boolean;

  /** True when we are on an actual content/video page (not a listing/home). */
  isContentPage(): boolean;

  /** Identity + metadata for the current content. */
  getVideoContext(): VideoContext;

  /**
   * The current content's human-readable title, read *fresh* from the page.
   * Used for the exported PDF's title and filename. Reading on demand (rather
   * than reusing the value captured at mount) avoids stale SPA titles — e.g.
   * YouTube updates `document.title` a moment after navigation.
   */
  getTitle(): string;

  /** The media element to screenshot, or null if not present yet. */
  getVideoElement(): HTMLVideoElement | null;

  /** The DOM node the panel should be injected into, or null if not ready. */
  getInjectionTarget(): Element | null;

  /** Fetch the transcript for the given content. */
  getTranscript(ctx: VideoContext): Promise<TranscriptResult>;

  /**
   * Observe in-app (SPA) navigation. Calls `onChange` whenever the active
   * content changes. Returns an unsubscribe function.
   */
  watchNavigation(onChange: () => void): () => void;
}

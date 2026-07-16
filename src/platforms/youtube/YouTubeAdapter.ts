import type { PlatformAdapter, TranscriptResult, VideoContext } from '@/core/platform/types';
import { fetchYouTubeTranscript } from './transcript';

/**
 * The panel mounts as the FIRST child of the sidebar (`#secondary-inner`), not
 * inside `#related`: ads and playlist panels are siblings rendered above
 * `#related`, so mounting there pushed the panel below them. The old selector
 * is kept as a fallback for layout variants where `#secondary-inner` is absent.
 */
const INJECTION_SELECTOR = '#secondary-inner.style-scope.ytd-watch-flexy';
const INJECTION_FALLBACK_SELECTOR = '#related.style-scope.ytd-watch-flexy';
/** Watch-page title element, most reliable first; falls back to document.title. */
const TITLE_SELECTOR = 'h1.ytd-watch-metadata yt-formatted-string, h1.ytd-watch-metadata, #title h1';

/** YouTube watch-page adapter. The first concrete `PlatformAdapter`. */
export class YouTubeAdapter implements PlatformAdapter {
  readonly id = 'youtube';

  matches(url: URL): boolean {
    return url.hostname.endsWith('youtube.com');
  }

  isContentPage(): boolean {
    const url = new URL(window.location.href);
    return url.pathname === '/watch' && url.searchParams.has('v');
  }

  getVideoContext(): VideoContext {
    const videoId = new URL(window.location.href).searchParams.get('v') ?? '';
    const contentUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return { contentId: contentUrl, contentUrl };
  }

  getTitle(): string {
    const fromDom = document.querySelector(TITLE_SELECTOR)?.textContent?.trim();
    return fromDom || document.title;
  }

  getVideoElement(): HTMLVideoElement | null {
    return document.querySelector('video');
  }

  getInjectionTarget(): Element | null {
    return document.querySelector(INJECTION_SELECTOR) ?? document.querySelector(INJECTION_FALLBACK_SELECTOR);
  }

  getTranscript(ctx: VideoContext): Promise<TranscriptResult> {
    return fetchYouTubeTranscript(ctx.contentUrl);
  }

  watchNavigation(onChange: () => void): () => void {
    let lastUrl = window.location.href;

    const check = () => {
      if (window.location.href === lastUrl) return;
      lastUrl = window.location.href;
      onChange();
    };

    // YouTube is an SPA: detect route changes via DOM mutations + a polling fallback.
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    const intervalId = window.setInterval(check, 1000);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
    };
  }
}

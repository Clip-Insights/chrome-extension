import { createRoot, type Root } from 'react-dom/client';
import { isolateKeyboard } from '@/core/keyboard/isolateKeyboard';
import type { PlatformAdapter, VideoContext } from '@/core/platform/types';
import { App } from '@/ui/App';
import styles from '@/ui/styles.css?inline';

/**
 * Mount the React panel inside a Shadow DOM so the host page's CSS cannot leak
 * in (and vice versa). Replaces v3's global, namespaced stylesheet approach
 * (ARCHITECTURE.md B.5).
 */
const HOST_ID = 'clip-insights-host';

let host: HTMLElement | null = null;
let root: Root | null = null;
let releaseKeyboard: (() => void) | null = null;

export function mountPanel(target: Element, adapter: PlatformAdapter, ctx: VideoContext): void {
  unmountPanel();

  host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = styles;
  shadow.appendChild(style);

  const container = document.createElement('div');
  shadow.appendChild(container);

  target.prepend(host);

  // Keep the host platform's global keyboard shortcuts from firing while the
  // user types in the panel (see isolateKeyboard).
  releaseKeyboard = isolateKeyboard(shadow);

  root = createRoot(container);
  // Keying by contentId resets all feature state when the content changes.
  root.render(<App key={ctx.contentId} adapter={adapter} ctx={ctx} />);
}

export function unmountPanel(): void {
  releaseKeyboard?.();
  releaseKeyboard = null;
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
}

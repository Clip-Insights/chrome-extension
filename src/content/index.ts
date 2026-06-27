import '@/platforms';
import { resolveAdapter } from '@/core/platform/registry';
import { pollFor } from '@/core/dom';
import { mountPanel, unmountPanel } from './mount';

/**
 * Content-script entry point. Resolves the platform adapter for the current
 * site, then mounts/unmounts the panel as the user navigates the SPA. All
 * platform-specific behaviour is delegated to the adapter (ARCHITECTURE.md B.2).
 */
function start(): void {
  const adapter = resolveAdapter();
  if (!adapter) return;

  let mountedContentId: string | null = null;

  const sync = async (): Promise<void> => {
    if (!adapter.isContentPage()) {
      unmountPanel();
      mountedContentId = null;
      return;
    }

    const ctx = adapter.getVideoContext();
    if (ctx.contentId === mountedContentId) return;

    const target = await pollFor(() => adapter.getInjectionTarget());
    // Bail if navigation moved on while we were waiting for the target.
    if (!target || !adapter.isContentPage() || adapter.getVideoContext().contentId !== ctx.contentId) return;

    mountedContentId = ctx.contentId;
    mountPanel(target, adapter, ctx);
  };

  adapter.watchNavigation(() => void sync());
  void sync();
}

start();

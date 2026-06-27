import type { PlatformAdapter, VideoContext } from '@/core/platform/types';
import { PlatformProvider } from './PlatformContext';
import { ToastProvider } from './toast/ToastContext';
import { Panel } from './Panel';

interface AppProps {
  adapter: PlatformAdapter;
  ctx: VideoContext;
}

export function App({ adapter, ctx }: AppProps) {
  return (
    <PlatformProvider adapter={adapter} ctx={ctx}>
      <ToastProvider>
        <Panel />
      </ToastProvider>
    </PlatformProvider>
  );
}

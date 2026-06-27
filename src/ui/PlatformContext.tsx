import { createContext, useContext, type ReactNode } from 'react';
import type { PlatformAdapter, VideoContext } from '@/core/platform/types';

interface PlatformContextValue {
  adapter: PlatformAdapter;
  ctx: VideoContext;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({
  adapter,
  ctx,
  children,
}: PlatformContextValue & { children: ReactNode }) {
  return <PlatformContext.Provider value={{ adapter, ctx }}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformContextValue {
  const value = useContext(PlatformContext);
  if (!value) throw new Error('usePlatform must be used within a PlatformProvider');
  return value;
}

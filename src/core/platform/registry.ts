import type { PlatformAdapter } from './types';

/**
 * Runtime registry of platform adapters. The content script asks the registry
 * which adapter handles the current page; this is the only place that knows the
 * full list of platforms (Open/Closed: add an adapter here, change nothing else).
 */
const adapters: PlatformAdapter[] = [];

export function registerPlatform(adapter: PlatformAdapter): void {
  if (adapters.some((a) => a.id === adapter.id)) return;
  adapters.push(adapter);
}

/** Returns the first adapter whose `matches()` accepts the location, or null. */
export function resolveAdapter(location: Location = window.location): PlatformAdapter | null {
  const url = new URL(location.href);
  return adapters.find((a) => a.matches(url)) ?? null;
}

export function getRegisteredPlatforms(): readonly PlatformAdapter[] {
  return adapters;
}

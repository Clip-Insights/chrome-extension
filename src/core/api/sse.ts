/**
 * Helpers for the backend's SSE chat stream. Pure functions so the parsing
 * rules are unit-testable without a network.
 */

/**
 * Split a streaming buffer into complete `\n\n`-terminated SSE events.
 * The trailing partial event (if any) is returned as `rest` and must be
 * prepended to the next network chunk — events can straddle read boundaries.
 */
export function splitSseEvents(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  return { events: parts, rest };
}

/**
 * Decode one SSE `data:` payload into display text.
 * The backend JSON-encodes tokens so newlines survive the SSE framing; plain
 * payloads (older backend, error sentinels) pass through unchanged.
 */
export function decodeSseToken(content: string): string {
  if (content.startsWith('"')) {
    try {
      return JSON.parse(content) as string;
    } catch {
      // Not valid JSON after all — treat as plain text.
    }
  }
  return content;
}

/**
 * CRXJS HMRPort.send calls port.postMessage without the try/catch that the
 * ping interval already has. After an extension reload, orphaned content
 * scripts hit "Extension context invalidated" and Vite's error overlay fires.
 * Apply the same guard so send reloads the page instead of throwing.
 */
const UNGUARDED =
  /send = \(data\) => \{\n(\s*)if \(this\.port\)\n\s*this\.port\.postMessage\(\{ data \}\);/;

const ALREADY_GUARDED =
  /send = \(data\) => \{\n\s*if \(this\.port\)\n\s*try \{/;

const GUARDED = `send = (data) => {
$1if (this.port)
$1  try {
$1    this.port.postMessage({ data });
$1  } catch (error) {
$1    if (error instanceof Error && error.message.includes("Extension context invalidated.")) {
$1      location.reload();
$1    } else
$1      throw error;
$1  }
`;

export function patchCrxHmrPortSource(code: string): string {
  if (ALREADY_GUARDED.test(code)) return code;
  return code.replace(UNGUARDED, GUARDED);
}

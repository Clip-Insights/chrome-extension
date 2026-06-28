/**
 * Stop key events that originate inside the panel from reaching the host page's
 * global keyboard handlers.
 *
 * Learning platforms (YouTube, Coursera, …) bind single-key shortcuts (e.g.
 * YouTube's `i`, `l`, `f`) on `document`. Because our UI lives in a Shadow DOM,
 * keyboard events are *composed*: they bubble across the shadow boundary up to
 * `document`, and event retargeting makes the host see the focused element as
 * the shadow host (a `<div>`), not our `<input>`. The host's "is the user
 * typing?" check therefore fails and it fires its shortcuts while the user types
 * in our fields. Stopping propagation at the shadow boundary keeps those events
 * inside the panel, fixing the conflict for every current and future platform.
 *
 * React 18 delegates its own listeners to the render container (a child of the
 * shadow root), so our handler on the shadow root runs *after* React has
 * processed the event — typing and in-panel shortcuts keep working.
 *
 * See ARCHITECTURE.md B.6.
 */
const KEY_EVENTS = ['keydown', 'keyup', 'keypress'] as const;

export function isolateKeyboard(root: ShadowRoot): () => void {
  const stop = (event: Event): void => event.stopPropagation();
  KEY_EVENTS.forEach((type) => root.addEventListener(type, stop));
  return () => KEY_EVENTS.forEach((type) => root.removeEventListener(type, stop));
}

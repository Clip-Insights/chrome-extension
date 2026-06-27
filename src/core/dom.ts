/** Resolve once `getter` returns a non-null value, polling up to `maxAttempts` times. */
export function pollFor<T>(
  getter: () => T | null,
  { maxAttempts = 20, interval = 500 }: { maxAttempts?: number; interval?: number } = {},
): Promise<T | null> {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      const value = getter();
      if (value != null) return resolve(value);
      attempts += 1;
      if (attempts >= maxAttempts) return resolve(null);
      setTimeout(check, interval);
    };
    check();
  });
}

/** Resolve once `selector` appears, polling up to `maxAttempts` times. */
export function waitForElement(
  selector: string,
  { maxAttempts = 20, interval = 500 }: { maxAttempts?: number; interval?: number } = {},
): Promise<Element> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      attempts += 1;
      if (attempts >= maxAttempts) return reject(new Error(`Element ${selector} not found after ${maxAttempts} attempts`));
      setTimeout(check, interval);
    };
    check();
  });
}

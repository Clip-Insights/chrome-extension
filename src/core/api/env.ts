/** Backend base URL, configured at build time (see .env / .env.local). */
export const API_URL: string = import.meta.env.VITE_API_URL;

/** Secret used to obfuscate JWTs at rest. Client-side only (see ARCHITECTURE.md A.12). */
export const TOKEN_SECRET: string = import.meta.env.VITE_TOKEN_SECRET;

/**
 * Server-only environment configuration.
 * `import "server-only"` prevents accidental client imports at build time.
 *
 * Lazy validation: each property is read on first access so `next build`
 * (which evaluates route modules to collect page data) doesn't require
 * secrets. Misconfiguration surfaces with a clear error on first request.
 */
import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const env = {
  get githubClientId() {
    return required("GITHUB_CLIENT_ID");
  },
  get githubClientSecret() {
    return required("GITHUB_CLIENT_SECRET");
  },
  get appUrl() {
    return process.env.APP_URL ?? "http://localhost:3000";
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
} as const;

export const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

export const COOKIE_NAMES = {
  refreshToken: "ghpr_rt",
  oauthState: "ghpr_oauth_state",
} as const;

/**
 * Server-only cookie helpers. Uses the Next App Router `cookies()` API.
 * Centralizes the security flags so every route gets the same hardened config.
 */
import "server-only";
import { cookies } from "next/headers";
import { env, COOKIE_NAMES } from "./env";

/**
 * Set the long-lived refresh-token cookie.
 *  - HttpOnly so JS can't read it (XSS resistance)
 *  - SameSite=Lax — sufficient since refresh is triggered by same-origin fetches
 *  - Secure in prod (https only)
 *  - Path scoped to /api/auth so it's only sent on auth endpoints
 */
export function setRefreshCookie(token: string, maxAgeSec: number): void {
  cookies().set(COOKIE_NAMES.refreshToken, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: maxAgeSec,
  });
}

export function clearRefreshCookie(): void {
  cookies().set(COOKIE_NAMES.refreshToken, "", {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });
}

export function getRefreshCookie(): string | undefined {
  return cookies().get(COOKIE_NAMES.refreshToken)?.value;
}

/** Short-lived state cookie used for CSRF protection on the OAuth callback. */
export function setStateCookie(state: string): void {
  cookies().set(COOKIE_NAMES.oauthState, state, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 600, // 10 min
  });
}

export function clearStateCookie(): void {
  cookies().set(COOKIE_NAMES.oauthState, "", {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });
}

export function getStateCookie(): string | undefined {
  return cookies().get(COOKIE_NAMES.oauthState)?.value;
}

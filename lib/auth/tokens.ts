"use client";

/**
 * In-memory access token store with sessionStorage mirror.
 *
 * Memory is the source of truth; sessionStorage is a best-effort
 * persistence layer so a full page reload doesn't force re-login
 * while the access token is still valid.
 *
 * A tiny pub/sub lets React (AuthContext) and the axios interceptor
 * read and react to changes without coupling.
 */

const STORAGE_KEY = "gitify_gh_access";

interface StoredToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

type Listener = (token: string | null) => void;

// ---------- private module-level state ----------
let accessToken: string | null = null;
let expiresAt: number | null = null;
const listeners = new Set<Listener>();

// ---------- sessionStorage helpers ----------

function writeStorage(token: string, expAt: number): void {
  if (typeof window === "undefined") return;
  try {
    const data: StoredToken = { accessToken: token, expiresAt: expAt };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // private mode, quota exceeded, or storage disabled — silently skip
  }
}

function clearStorage(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ---------- public API ----------

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },

  /** True if we hold a token that isn't within the 30 s expiry skew window. */
  isFresh(): boolean {
    if (!accessToken || expiresAt === null) return false;
    return Date.now() < expiresAt - 30_000;
  },

  set(token: string, expiresInSec: number): void {
    accessToken = token;
    expiresAt = Date.now() + expiresInSec * 1000;
    writeStorage(token, expiresAt);
    listeners.forEach((l) => l(accessToken));
  },

  clear(): void {
    accessToken = null;
    expiresAt = null;
    clearStorage();
    listeners.forEach((l) => l(null));
  },

  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/**
 * Reads the sessionStorage mirror and restores in-memory state if
 * the stored token is still within its validity window.
 * Call this once on the client before checking `tokenStore.isFresh()`.
 * Safe to call multiple times; idempotent.
 */
export function hydrateTokenFromSessionStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const data = JSON.parse(raw) as StoredToken;

    if (
      typeof data.accessToken !== "string" ||
      !data.accessToken ||
      typeof data.expiresAt !== "number" ||
      Date.now() >= data.expiresAt - 30_000 // same skew as isFresh
    ) {
      clearStorage();
      return;
    }

    // Restore without notifying listeners (no side-effects needed at hydration)
    accessToken = data.accessToken;
    expiresAt = data.expiresAt;
  } catch {
    // malformed JSON or other storage error — leave state as-is
  }
}

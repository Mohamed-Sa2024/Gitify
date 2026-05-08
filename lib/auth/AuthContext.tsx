"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { tokenStore, hydrateTokenFromSessionStorage } from "@/lib/auth/tokens";
import { bootstrapSession, logout as logoutApi } from "@/lib/github/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Always start as "loading" to avoid SSR/client hydration mismatch
  // when reading sessionStorage in the useState initializer.
  const [status, setStatus] = useState<AuthStatus>("loading");

  // Client-only: hydrate from sessionStorage, then attempt a token refresh.
  // useLayoutEffect fires before the first paint so the loading flash is minimal.
  useLayoutEffect(() => {
    let cancelled = false;

    // Restore any valid token from the sessionStorage mirror first.
    hydrateTokenFromSessionStorage();

    if (tokenStore.isFresh()) {
      // User is good to go immediately; bootstrap will silently renew in background.
      setStatus("authenticated");
    }

    // Run refresh regardless — it renews the server-side cookie session.
    // In `finally` we key status on `tokenStore.isFresh()`, NOT on whether
    // bootstrap returned a non-null string, so a failed refresh that leaves
    // a still-valid token does NOT force logout.
    bootstrapSession().finally(() => {
      if (cancelled) return;
      setStatus(tokenStore.isFresh() ? "authenticated" : "unauthenticated");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // React to token changes driven by the axios response interceptor.
  useEffect(() => {
    return tokenStore.subscribe((tok) => {
      setStatus(tok ? "authenticated" : "unauthenticated");
    });
  }, []);

  const signOut = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore — still clear local state
    }
    tokenStore.clear();
    setStatus("unauthenticated");
  };

  return (
    <AuthContext.Provider value={{ status, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

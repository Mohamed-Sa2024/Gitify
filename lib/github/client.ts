"use client";

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { tokenStore } from "@/lib/auth/tokens";

/* ============================================================================
   Same-origin client for our /api/auth/* routes — sends/receives cookies.
   ========================================================================== */
export const apiClient: AxiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/* ============================================================================
   GitHub client — talks to api.github.com directly with the in-memory token.
   ========================================================================== */
export const githubClient: AxiosInstance = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  },
});

/* ----- request interceptor: attach Bearer token ----- */
githubClient.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) {
    cfg.headers.set("Authorization", `Bearer ${token}`);
  }
  return cfg;
});

/* ----- response interceptor: refresh on 401, retry once ----- */

interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

let refreshInFlight: Promise<string> | null = null;

/**
 * Single-flight refresh. Many concurrent 401s share one refresh request.
 * Avoids hammering the backend and prevents racey state in the token store.
 */
function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = apiClient
    .post<RefreshResponse>("/auth/refresh")
    .then((r) => {
      tokenStore.set(r.data.accessToken, r.data.expiresIn);
      return r.data.accessToken;
    })
    .catch((err) => {
      // Only wipe the token if it has actually expired; a network hiccup on
      // refresh must not log the user out while they still hold a valid token.
      if (!tokenStore.isFresh()) {
        tokenStore.clear();
      }
      throw err;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

githubClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;

      try {
        const newToken = await refreshAccessToken();
        original.headers.set("Authorization", `Bearer ${newToken}`);
        return githubClient.request(original);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

/** Used by AuthContext to bootstrap the session via the cookie. */
export async function bootstrapSession(): Promise<string | null> {
  try {
    return await refreshAccessToken();
  } catch {
    return null;
  }
}

/* ============================================================================
   Auth API helpers — co-located here since they share the apiClient.
   ========================================================================== */
interface CallbackResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export async function exchangeCode(
  code: string,
  state: string,
): Promise<CallbackResponse> {
  const res = await apiClient.post<CallbackResponse>("/auth/callback", {
    code,
    state,
  });
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

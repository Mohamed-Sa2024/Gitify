/**
 * Server-only client for GitHub's OAuth token endpoint.
 * Uses fetch (built-in to Next runtimes) — no extra deps.
 */
import "server-only";
import { env, GITHUB_TOKEN_URL } from "./env";

export interface GitHubTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export async function exchangeWithGitHub(
  params: Record<string, string>,
): Promise<GitHubTokenResponse> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.githubClientId,
      client_secret: env.githubClientSecret,
      ...params,
    }),
    // never cache token requests
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GitHub token endpoint returned ${res.status}`);
  }
  return (await res.json()) as GitHubTokenResponse;
}

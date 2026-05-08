import { NextResponse } from "next/server";
import {
  clearRefreshCookie,
  getRefreshCookie,
  setRefreshCookie,
} from "@/lib/auth/cookies";
import { exchangeWithGitHub } from "@/lib/auth/github-oauth";

export const runtime = "nodejs";

export async function POST() {
  const refreshToken = getRefreshCookie();
  if (!refreshToken) {
    return NextResponse.json({ error: "no_refresh_token" }, { status: 401 });
  }

  try {
    const tokens = await exchangeWithGitHub({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    if (tokens.error || !tokens.access_token) {
      // Refresh token expired or revoked — wipe cookie so client redirects to login
      clearRefreshCookie();
      return NextResponse.json(
        { error: tokens.error ?? "refresh_failed" },
        { status: 401 },
      );
    }

    // GitHub rotates refresh tokens on every refresh — store the new one
    if (tokens.refresh_token && tokens.refresh_token_expires_in) {
      setRefreshCookie(tokens.refresh_token, tokens.refresh_token_expires_in);
    }

    return NextResponse.json({
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in ?? 28800,
      tokenType: tokens.token_type ?? "bearer",
      scope: tokens.scope ?? "",
    });
  } catch (err) {
    console.error("refresh failed", err);
    return NextResponse.json({ error: "github_unreachable" }, { status: 502 });
  }
}

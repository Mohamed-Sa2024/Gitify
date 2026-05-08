import { NextResponse, type NextRequest } from "next/server";
import {
  clearStateCookie,
  getStateCookie,
  setRefreshCookie,
} from "@/lib/auth/cookies";
import { exchangeWithGitHub } from "@/lib/auth/github-oauth";

export const runtime = "nodejs";

interface Body {
  code?: string;
  state?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { code, state } = body;
  const cookieState = getStateCookie();

  // CSRF: state from query must match the cookie set in /login
  if (!code || !state || !cookieState || state !== cookieState) {
    clearStateCookie();
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }
  clearStateCookie();

  try {
    const tokens = await exchangeWithGitHub({ code });

    if (tokens.error || !tokens.access_token) {
      return NextResponse.json(
        {
          error: tokens.error ?? "exchange_failed",
          description: tokens.error_description,
        },
        { status: 400 },
      );
    }

    // GitHub Apps with token expiration enabled return both. Standard OAuth Apps don't.
    if (tokens.refresh_token && tokens.refresh_token_expires_in) {
      setRefreshCookie(tokens.refresh_token, tokens.refresh_token_expires_in);
    }

    return NextResponse.json({
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in ?? 28800, // default 8h
      tokenType: tokens.token_type ?? "bearer",
      scope: tokens.scope ?? "",
    });
  } catch (err) {
    console.error("token exchange failed", err);
    return NextResponse.json({ error: "github_unreachable" }, { status: 502 });
  }
}

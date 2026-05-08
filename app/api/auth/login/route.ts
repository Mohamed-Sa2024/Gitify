import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { env } from "@/lib/auth/env";
import { setStateCookie } from "@/lib/auth/cookies";

export const runtime = "nodejs";

export async function GET() {
  const state = crypto.randomBytes(24).toString("hex");
  setStateCookie(state);

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.githubClientId);
  url.searchParams.set("redirect_uri", `${env.appUrl}/auth/callback`);
  url.searchParams.set("state", state);
  // request:user repo read:org for private repos + org access
  // GitHub Apps may ignore scope — classic OAuth Apps use it
  url.searchParams.set("scope", "read:user repo read:org");

  return NextResponse.redirect(url.toString());
}

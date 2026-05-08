import { NextResponse } from "next/server";
import { getRefreshCookie } from "@/lib/auth/cookies";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ authenticated: Boolean(getRefreshCookie()) });
}

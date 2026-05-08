import { NextResponse } from "next/server";
import { clearRefreshCookie } from "@/lib/auth/cookies";

export const runtime = "nodejs";

export async function POST() {
  clearRefreshCookie();
  return NextResponse.json({ ok: true });
}

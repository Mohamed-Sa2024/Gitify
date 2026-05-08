"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { exchangeCode } from "@/lib/github/client";
import { tokenStore } from "@/lib/auth/tokens";
import { TOKENS } from "@/lib/design";

export default function CallbackPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  // StrictMode in dev fires effects twice — guard so we don't double-spend the code.
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const errParam = params.get("error");

    if (errParam) {
      setError(params.get("error_description") ?? errParam);
      return;
    }
    if (!code || !state) {
      setError("Missing code or state in callback URL.");
      return;
    }

    exchangeCode(code, state)
      .then((res) => {
        tokenStore.set(res.accessToken, res.expiresIn);
        router.replace("/dashboard");
      })
      .catch((e) => {
        const msg =
          (e as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Sign-in failed.";
        setError(msg);
      });
  }, [params, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-[400px] rounded-lg p-5 bg-surface border border-border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} style={{ color: TOKENS.red }} />
            <span className="text-[13px] font-semibold text-textP">
              Sign-in failed
            </span>
          </div>
          <div className="text-[12.5px] text-textDim font-mono mb-4">
            {error}
          </div>
          <button
            onClick={() => router.replace("/login")}
            className="text-[12px] font-medium px-3 py-1.5 rounded"
            style={{ background: TOKENS.accent, color: TOKENS.bg }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
  return <Loading />;
}

function Loading() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="font-mono text-textDim text-xs uppercase tracking-widest animate-pulse">
        completing sign-in
      </div>
    </div>
  );
}

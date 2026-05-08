"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, GitPullRequest, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { TOKENS } from "@/lib/design";

export default function LoginPage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  const startLogin = () => {
    // Server route sets state cookie, then redirects to GitHub.
    window.location.href = "/api/auth/login";
  };

  return (
    <div className="min-h-screen bg-bg text-textP flex items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        {/* logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center"
            style={{ background: TOKENS.accent }}
          >
            <GitBranch
              size={18}
              style={{ color: TOKENS.bg }}
              strokeWidth={2.5}
            />
          </div>
          <div className="leading-tight">
            <div className="text-[16px] font-semibold tracking-tight">
              Git<span style={{ color: TOKENS.accent }}>ify</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-textMute">
              github pr ops
            </div>
          </div>
        </div>

        <h1 className="text-[28px] font-bold tracking-tight leading-tight mb-3">
          PRs, organized by branch and stack.
        </h1>
        <p className="text-[14px] text-textDim leading-relaxed mb-10">
          A faster way to navigate complex PR workflows — base-branch grouping,
          stacked-PR visualization, merge readiness scoring, and release flow
          analytics.
        </p>

        <button
          onClick={startLogin}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-md font-medium transition-all hover:brightness-110"
          style={{
            background: TOKENS.accent,
            color: TOKENS.bg,
          }}
        >
          <GithubGlyph />
          <span className="text-[13.5px]">Continue with GitHub</span>
        </button>

        <div className="mt-3 text-[11px] text-textMute font-mono flex items-center justify-center gap-1.5">
          <Lock size={10} /> OAuth via GitHub App · refresh tokens enabled
        </div>

        {/* feature highlights */}
        <div className="mt-12 grid grid-cols-3 gap-3">
          <Highlight Icon={GitBranch} title="Branch tree" sub="Grouped by base" />
          <Highlight
            Icon={GitPullRequest}
            title="Stacked PRs"
            sub="Auto-detected"
          />
          <Highlight Icon={Sparkles} title="Merge ready" sub="0–100 score" />
        </div>
      </div>
    </div>
  );
}

function Highlight({
  Icon,
  title,
  sub,
}: {
  Icon: typeof GitBranch;
  title: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg p-3 bg-surface border border-border">
      <Icon size={14} style={{ color: TOKENS.accent }} />
      <div className="mt-2 text-[12px] font-medium text-textP">{title}</div>
      <div className="text-[10.5px] text-textDim">{sub}</div>
    </div>
  );
}

function GithubGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-1.93c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.18-1.49 3.14-1.18 3.14-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14v3.18c0 .31.21.66.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

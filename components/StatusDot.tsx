"use client";

import { TOKENS } from "@/lib/design";
import type { PRStatus } from "@/types/domain";

const MAP: Record<PRStatus, { color: string; label: string }> = {
  ready: { color: TOKENS.accent, label: "Ready" },
  review: { color: TOKENS.blue, label: "In review" },
  draft: { color: TOKENS.textMute, label: "Draft" },
  blocked: { color: TOKENS.red, label: "Blocked" },
  merged: { color: TOKENS.violet, label: "Merged" },
  closed: { color: TOKENS.textMute, label: "Closed" },
};

export function StatusDot({ status }: { status: PRStatus }) {
  const s = MAP[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-textDim">
      <span className="relative flex h-1.5 w-1.5">
        {status === "ready" && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ background: s.color }}
          />
        )}
        <span
          className="relative inline-flex rounded-full h-1.5 w-1.5"
          style={{ background: s.color }}
        />
      </span>
      {s.label}
    </span>
  );
}

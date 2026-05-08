"use client";

import { CheckCircle2, XCircle, Clock, Circle } from "lucide-react";
import { TOKENS } from "@/lib/design";
import type { CIStatus } from "@/types/domain";

const MAP: Record<CIStatus, { c: string; Icon: typeof Circle; t: string }> = {
  passing: { c: TOKENS.accent, Icon: CheckCircle2, t: "passing" },
  failing: { c: TOKENS.red, Icon: XCircle, t: "failing" },
  pending: { c: TOKENS.amber, Icon: Clock, t: "pending" },
  none: { c: TOKENS.textMute, Icon: Circle, t: "no ci" },
};

export function CIBadge({ ci }: { ci: CIStatus }) {
  const m = MAP[ci];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono"
      style={{ color: m.c }}
    >
      <m.Icon size={11} strokeWidth={2.5} /> {m.t}
    </span>
  );
}

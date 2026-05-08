"use client";

import type { LucideIcon } from "lucide-react";

export function SummaryTile({
  label,
  value,
  accent,
  Icon,
}: {
  label: string;
  value: number;
  accent: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg p-3 flex items-center gap-3 bg-surface border border-border">
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${accent}14`, border: `1px solid ${accent}33` }}
      >
        <Icon size={15} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <div className="text-[19px] font-bold leading-none tracking-tight text-textP">
          {value}
        </div>
        <div className="text-[10.5px] font-mono uppercase tracking-wider mt-1 text-textDim">
          {label}
        </div>
      </div>
    </div>
  );
}

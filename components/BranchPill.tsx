"use client";

import { GitBranch } from "lucide-react";
import { branchType } from "@/lib/design";

interface Props {
  name: string;
  size?: "sm" | "md";
}

export function BranchPill({ name, size = "sm" }: Props) {
  const t = branchType(name);
  const small = size === "sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono ${
        small ? "px-1.5 py-0.5 text-[10.5px]" : "px-2 py-1 text-xs"
      }`}
      style={{
        color: t.color,
        background: t.bg,
        border: `1px solid ${t.color}22`,
      }}
    >
      <GitBranch size={small ? 10 : 12} strokeWidth={2.2} />
      <span className="truncate max-w-[180px]">{name}</span>
    </span>
  );
}

"use client";

import type { LucideIcon } from "lucide-react";
import { TOKENS } from "@/lib/design";

interface Props {
  icon: LucideIcon;
  label: string;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
}

export function NavItem({ icon: Icon, label, badge, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12.5px] transition-all"
      style={{
        background: active ? `${TOKENS.accent}12` : "transparent",
        color: active ? TOKENS.text : TOKENS.textDim,
        borderLeft: `2px solid ${active ? TOKENS.accent : "transparent"}`,
      }}
    >
      <Icon size={13} style={{ color: active ? TOKENS.accent : TOKENS.textMute }} />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span
          className="text-[9.5px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider"
          style={{
            color: badge === "new" ? TOKENS.bg : TOKENS.textDim,
            background: badge === "new" ? TOKENS.accent : TOKENS.bg,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

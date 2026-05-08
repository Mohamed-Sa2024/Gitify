"use client";

import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  color?: string;
}

export function Tag({ children, color = "#8a8a93" }: Props) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider"
      style={{
        color,
        background: `${color}14`,
        border: `1px solid ${color}22`,
      }}
    >
      {children}
    </span>
  );
}

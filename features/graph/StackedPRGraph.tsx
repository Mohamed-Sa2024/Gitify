"use client";

import { useMemo } from "react";
import { Network, AlertTriangle } from "lucide-react";
import { TOKENS, branchType } from "@/lib/design";
import type { PullRequest } from "@/types/domain";
import { StatusDot } from "@/components/StatusDot";
import { CIBadge } from "@/components/CIBadge";

interface Props {
  prs: PullRequest[];
  selectedNumber: number | null;
  onSelect: (pr: PullRequest) => void;
}

interface NodePos {
  pr: PullRequest;
  x: number;
  y: number;
}

interface Layout {
  nodes: Map<number, NodePos>;
  bases: string[];
  width: number;
  height: number;
  colW: number;
  padX: number;
  padY: number;
}

function computeLayout(prs: PullRequest[]): Layout {
  const colW = 320;
  const rowH = 92;
  const padX = 60;
  const padY = 60;

  const bases = Array.from(new Set(prs.map((p) => p.base)));
  const nodes = new Map<number, NodePos>();

  let maxRowsInAnyCol = 0;

  bases.forEach((base, colIdx) => {
    const list = prs.filter((p) => p.base === base);
    const byNumber = new Map(list.map((p) => [p.number, p]));
    const roots = list.filter(
      (p) => p.parentNumber === null || !byNumber.has(p.parentNumber),
    );
    let row = 0;

    const place = (p: PullRequest, depth: number): void => {
      nodes.set(p.number, {
        pr: p,
        x: padX + colIdx * colW + depth * 24,
        y: padY + row * rowH,
      });
      row++;
      list
        .filter((c) => c.parentNumber === p.number)
        .forEach((c) => place(c, depth + 1));
    };

    roots.forEach((r) => place(r, 0));
    if (row > maxRowsInAnyCol) maxRowsInAnyCol = row;
  });

  return {
    nodes,
    bases,
    width: padX * 2 + Math.max(1, bases.length) * colW,
    height: padY * 2 + Math.max(1, maxRowsInAnyCol) * rowH,
    colW,
    padX,
    padY,
  };
}

export function StackedPRGraph({ prs, selectedNumber, onSelect }: Props) {
  const layout = useMemo(() => computeLayout(prs), [prs]);

  if (prs.length === 0) {
    return (
      <div className="rounded-lg p-12 text-center bg-surface border border-border">
        <div className="text-textDim text-sm">Nothing to graph yet.</div>
      </div>
    );
  }

  const dependencyCount = prs.filter((p) => p.parentNumber !== null).length;

  return (
    <div className="rounded-lg overflow-hidden bg-surface border border-border">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Network size={14} style={{ color: TOKENS.accent }} />
        <span className="text-[13px] font-medium text-textP">
          Stacked PR dependency graph
        </span>
        <span className="text-[11px] font-mono text-textMute">
          {prs.length} nodes · {dependencyCount} dependencies
        </span>
      </div>

      <div className="relative overflow-auto" style={{ maxHeight: 600 }}>
        <svg
          width={layout.width}
          height={layout.height}
          style={{ display: "block", minWidth: "100%" }}
        >
          <defs>
            <pattern
              id="grid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke={TOKENS.border}
                strokeWidth="0.5"
                opacity="0.5"
              />
            </pattern>
            <marker
              id="arr"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={TOKENS.borderHi} />
            </marker>
          </defs>
          <rect width={layout.width} height={layout.height} fill="url(#grid)" />

          {layout.bases.map((b, i) => {
            const t = branchType(b);
            return (
              <g key={b}>
                <rect
                  x={layout.padX + i * layout.colW - 12}
                  y={20}
                  width={280}
                  height={28}
                  rx={6}
                  fill={t.bg}
                  stroke={`${t.color}33`}
                />
                <text
                  x={layout.padX + i * layout.colW + 4}
                  y={38}
                  fontSize="12"
                  fontFamily="ui-monospace, monospace"
                  fill={t.color}
                  fontWeight="600"
                >
                  → {b}
                </text>
              </g>
            );
          })}

          {Array.from(layout.nodes.values()).map((n) => {
            if (n.pr.parentNumber === null) return null;
            const parent = layout.nodes.get(n.pr.parentNumber);
            if (!parent) return null;
            const x1 = parent.x + 24;
            const y1 = parent.y + 36;
            const x2 = n.x + 24;
            const y2 = n.y + 12;
            const t = branchType(n.pr.branch);
            const path = `M ${x1} ${y1} C ${x1} ${y1 + 30}, ${x2} ${y2 - 30}, ${x2} ${y2}`;
            return (
              <path
                key={`e-${n.pr.number}`}
                d={path}
                fill="none"
                stroke={t.color}
                strokeWidth="1.8"
                strokeDasharray="4 3"
                opacity="0.7"
                markerEnd="url(#arr)"
              />
            );
          })}

          {Array.from(layout.nodes.values()).map(({ pr, x, y }) => {
            const t = branchType(pr.branch);
            const sel = selectedNumber === pr.number;
            const w = 280;
            const h = 72;
            return (
              <g
                key={pr.number}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: "pointer" }}
                onClick={() => onSelect(pr)}
              >
                <rect
                  width={w}
                  height={h}
                  rx={8}
                  fill={sel ? TOKENS.surface2 : TOKENS.bg}
                  stroke={sel ? t.color : TOKENS.borderHi}
                  strokeWidth={sel ? 1.5 : 1}
                />
                <rect width={3} height={h} rx={1.5} fill={t.color} />
                <text
                  x={14}
                  y={20}
                  fontSize="10.5"
                  fontFamily="ui-monospace, monospace"
                  fill={TOKENS.textMute}
                >
                  #{pr.number}
                </text>
                <text
                  x={48}
                  y={20}
                  fontSize="10.5"
                  fontFamily="ui-monospace, monospace"
                  fill={t.color}
                >
                  {pr.branch}
                </text>
                <foreignObject x={14} y={28} width={w - 28} height={32}>
                  <div
                    style={{
                      fontSize: 12,
                      color: TOKENS.text,
                      lineHeight: 1.3,
                      fontWeight: 500,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {pr.title}
                  </div>
                </foreignObject>
                <foreignObject x={14} y={h - 22} width={w - 28} height={20}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 10,
                      color: TOKENS.textDim,
                    }}
                  >
                    <StatusDot status={pr.status} />
                    <CIBadge ci={pr.ci} />
                    {pr.conflicts && (
                      <span
                        style={{
                          color: TOKENS.red,
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <AlertTriangle size={10} /> conflict
                      </span>
                    )}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

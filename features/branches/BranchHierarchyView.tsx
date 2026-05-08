"use client";

import { Fragment, useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  GitPullRequestDraft,
} from "lucide-react";
import { branchType, TOKENS } from "@/lib/design";
import { PRCard } from "@/components/PRCard";
import type { PullRequest } from "@/types/domain";

interface Props {
  prs: PullRequest[];
  selectedNumber: number | null;
  onSelect: (pr: PullRequest) => void;
}

interface TreeNode extends PullRequest {
  children: TreeNode[];
}

function buildTree(list: PullRequest[]): TreeNode[] {
  const byNumber = new Map<number, TreeNode>(
    list.map((p) => [p.number, { ...p, children: [] }]),
  );
  const roots: TreeNode[] = [];
  for (const node of byNumber.values()) {
    if (node.parentNumber !== null && byNumber.has(node.parentNumber)) {
      byNumber.get(node.parentNumber)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function BranchHierarchyView({ prs, selectedNumber, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const map = new Map<string, PullRequest[]>();
    for (const p of prs) {
      const arr = map.get(p.base) ?? [];
      arr.push(p);
      map.set(p.base, arr);
    }
    return Array.from(map.entries());
  }, [prs]);

  const renderNode = (node: TreeNode, depth = 0) => (
    <Fragment key={node.number}>
      <PRCard
        pr={node}
        onClick={onSelect}
        selected={selectedNumber === node.number}
        depth={depth}
        isStacked={depth > 0}
      />
      {node.children.map((c) => renderNode(c, depth + 1))}
    </Fragment>
  );

  if (prs.length === 0) {
    return (
      <div className="rounded-lg p-12 text-center bg-surface border border-border">
        <div className="text-textDim text-sm">
          No pull requests match the current filters.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(([base, list]) => {
        const t = branchType(base);
        const tree = buildTree(list);
        const isCollapsed = collapsed[base];
        const ready = list.filter((p) => p.status === "ready").length;
        const blocked = list.filter((p) => p.status === "blocked").length;
        const drafts = list.filter((p) => p.draft).length;

        return (
          <div
            key={base}
            className="rounded-lg overflow-hidden bg-surface border border-border"
          >
            <button
              onClick={() => setCollapsed((s) => ({ ...s, [base]: !s[base] }))}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight size={14} className="text-textDim" />
              ) : (
                <ChevronDown size={14} className="text-textDim" />
              )}
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: t.color, boxShadow: `0 0 8px ${t.color}88` }}
                />
                <span className="font-mono text-[13px] tracking-tight text-textP">
                  {base}
                </span>
              </div>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded text-textDim bg-surface2">
                {list.length} PR{list.length !== 1 ? "s" : ""}
              </span>
              <div className="flex-1" />
              <div className="flex items-center gap-3 text-[11px] text-textDim">
                {ready > 0 && (
                  <span className="flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: TOKENS.accent }}
                    />
                    {ready} ready
                  </span>
                )}
                {blocked > 0 && (
                  <span
                    className="flex items-center gap-1"
                    style={{ color: TOKENS.red }}
                  >
                    <AlertTriangle size={11} />
                    {blocked} blocked
                  </span>
                )}
                {drafts > 0 && (
                  <span className="flex items-center gap-1">
                    <GitPullRequestDraft size={11} />
                    {drafts} draft
                  </span>
                )}
              </div>
            </button>

            {!isCollapsed && (
              <div className="border-t border-border">
                {tree.map((n) => renderNode(n))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

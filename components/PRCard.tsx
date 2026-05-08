"use client";

import {
  GitPullRequest,
  GitMerge,
  GitPullRequestDraft,
  GitPullRequestClosed,
  AlertTriangle,
  MessageSquare,
  Eye,
} from "lucide-react";
import { TOKENS, branchType } from "@/lib/design";
import type { PullRequest } from "@/types/domain";
import { BranchPill } from "./BranchPill";
import { StatusDot } from "./StatusDot";
import { CIBadge } from "./CIBadge";
import { Tag } from "./Tag";
import { Avatar } from "./Avatar";

interface Props {
  pr: PullRequest;
  selected?: boolean;
  depth?: number;
  isStacked?: boolean;
  onClick?: (pr: PullRequest) => void;
}

export function PRCard({ pr, selected, depth = 0, isStacked, onClick }: Props) {
  const t = branchType(pr.branch);
  const Icon =
    pr.status === "merged"
      ? GitMerge
      : pr.status === "closed" || pr.status === "blocked"
        ? GitPullRequestClosed
        : pr.draft
          ? GitPullRequestDraft
          : GitPullRequest;
  const iconColor =
    pr.status === "merged"
      ? TOKENS.violet
      : pr.status === "blocked"
        ? TOKENS.red
        : pr.draft
          ? TOKENS.textMute
          : TOKENS.accent;

  return (
    <div
      onClick={() => onClick?.(pr)}
      className="group relative cursor-pointer transition-all"
      style={{
        background: selected ? TOKENS.surface2 : "transparent",
        borderLeft: `2px solid ${selected ? t.color : "transparent"}`,
        paddingLeft: 12 + depth * 4,
      }}
    >
      <div
        className="flex items-start gap-3 px-3 py-2.5 rounded-md group-hover:bg-white/[0.02] transition-colors"
        style={{
          borderLeft: isStacked ? `1px dashed ${TOKENS.borderHi}` : undefined,
          marginLeft: isStacked ? 8 : 0,
        }}
      >
        <Icon size={15} className="mt-0.5 shrink-0" style={{ color: iconColor }} />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-textMute">#{pr.number}</span>
            <span className="text-[13.5px] font-medium leading-tight text-textP">
              {pr.title}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <BranchPill name={pr.branch} />
            <span className="text-[11px] text-textMute">→</span>
            <BranchPill name={pr.base} />

            {pr.conflicts && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  color: TOKENS.red,
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.2)",
                }}
              >
                <AlertTriangle size={10} /> conflicts
              </span>
            )}
            {pr.isLarge && <Tag color={TOKENS.amber}>large</Tag>}
            {pr.isAged && (
              <Tag color={TOKENS.red}>aged {Math.floor(pr.ageHours / 24)}d</Tag>
            )}
            {pr.isStale && !pr.isAged && <Tag color={TOKENS.amber}>stale</Tag>}
            {pr.draft && <Tag color={TOKENS.textMute}>draft</Tag>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-3 text-[11px] text-textDim">
            <span className="font-mono" style={{ color: TOKENS.accent }}>
              +{pr.additions}
            </span>
            <span className="font-mono" style={{ color: TOKENS.red }}>
              −{pr.deletions}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <StatusDot status={pr.status} />
            <CIBadge ci={pr.ci} />
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-textDim">
              <MessageSquare size={11} /> {pr.comments}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-textDim">
              <Eye size={11} /> {pr.approvals}/{pr.reviewers.length}
            </span>
            <div className="flex -space-x-1.5">
              <Avatar login={pr.authorLogin} url={pr.authorAvatarUrl} size={18} />
              {pr.reviewers.slice(0, 2).map((r) => (
                <Avatar key={r.login} login={r.login} url={r.avatarUrl} size={18} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

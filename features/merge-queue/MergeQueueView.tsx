"use client";

import { useMemo } from "react";
import { ChevronRight, Clock, GitMerge, Lock } from "lucide-react";
import { TOKENS, branchType } from "@/lib/design";
import { StatusDot } from "@/components/StatusDot";
import { CIBadge } from "@/components/CIBadge";
import { Avatar } from "@/components/Avatar";
import { BranchPill } from "@/components/BranchPill";
import type { PullRequest } from "@/types/domain";

interface Props {
  prs: PullRequest[];
  selectedNumber: number | null;
  onSelect: (pr: PullRequest) => void;
}

interface QueueItem extends PullRequest {
  position: number;
  /** PR numbers that must merge first (parent in the queue). */
  blockedByNumbers: number[];
}

const QUEUE_BASES = new Set(["main", "master", "develop"]);

function buildQueue(prs: PullRequest[]): QueueItem[] {
  const eligible = prs.filter(
    (p) =>
      (QUEUE_BASES.has(p.base) || p.base.startsWith("release/")) &&
      p.status !== "draft" &&
      p.status !== "merged" &&
      p.status !== "closed",
  );

  // Sort: ready first (oldest waiting tops), then review, then blocked
  const priorityOf = (p: PullRequest): number => {
    if (p.status === "ready") return 0;
    if (p.status === "review" && p.approvals > 0) return 1;
    if (p.status === "review") return 2;
    return 3;
  };

  const sorted = [...eligible].sort((a, b) => {
    const d = priorityOf(a) - priorityOf(b);
    if (d !== 0) return d;
    return b.ageHours - a.ageHours; // older = higher priority within group
  });

  const inQueue = new Set(sorted.map((p) => p.number));

  return sorted.map((pr, i) => ({
    ...pr,
    position: i + 1,
    blockedByNumbers:
      pr.parentNumber !== null && inQueue.has(pr.parentNumber)
        ? [pr.parentNumber]
        : [],
  }));
}

export function MergeQueueView({ prs, selectedNumber, onSelect }: Props) {
  const queue = useMemo(() => buildQueue(prs), [prs]);
  const readyCount = queue.filter((p) => p.status === "ready").length;
  const blockedCount = queue.filter((p) => p.status === "blocked").length;

  if (queue.length === 0) {
    return (
      <div className="rounded-lg p-12 text-center bg-surface border border-border">
        <GitMerge
          size={28}
          className="mx-auto mb-3"
          style={{ color: TOKENS.textMute }}
        />
        <div className="text-[14px] font-medium text-textP">
          Merge queue is empty
        </div>
        <div className="text-[12px] text-textDim mt-1">
          PRs targeting main, master, develop, or release branches appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="In queue" value={queue.length} color={TOKENS.blue} />
        <StatCard
          label="Ready to merge"
          value={readyCount}
          color={TOKENS.accent}
        />
        <StatCard
          label="Blocked"
          value={blockedCount}
          color={blockedCount > 0 ? TOKENS.red : TOKENS.textMute}
        />
      </div>

      <div className="rounded-lg overflow-hidden bg-surface border border-border">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <GitMerge size={13} style={{ color: TOKENS.accent }} />
          <span className="text-[12px] font-medium text-textP">
            Merge queue
          </span>
          <span className="text-[11px] font-mono text-textMute">
            ordered by readiness · oldest first within tier
          </span>
        </div>

        {queue.map((item) => (
          <QueueRow
            key={item.number}
            item={item}
            selected={selectedNumber === item.number}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function QueueRow({
  item,
  selected,
  onSelect,
}: {
  item: QueueItem;
  selected: boolean;
  onSelect: (pr: PullRequest) => void;
}) {
  const t = branchType(item.branch);
  const isReady = item.status === "ready";

  return (
    <div
      onClick={() => onSelect(item)}
      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors border-b border-border last:border-b-0"
      style={{ background: selected ? TOKENS.surface2 : undefined }}
    >
      {/* Queue position badge */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 tabular-nums"
        style={{
          background: isReady ? `${TOKENS.accent}18` : TOKENS.bg,
          border: `1px solid ${isReady ? TOKENS.accent : TOKENS.border}`,
          color: isReady ? TOKENS.accent : TOKENS.textMute,
        }}
      >
        {item.position}
      </div>

      {/* Branch → base */}
      <div className="flex items-center gap-1.5 min-w-0 w-48 shrink-0">
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: t.color }}
        />
        <span
          className="font-mono text-[11px] truncate"
          style={{ color: t.color }}
        >
          {item.branch}
        </span>
        <ChevronRight size={10} className="text-textMute shrink-0" />
        <BranchPill name={item.base} />
      </div>

      {/* Title */}
      <span className="text-[12.5px] text-textP flex-1 truncate min-w-0">
        {item.title}
      </span>

      {/* Stack dependency */}
      {item.blockedByNumbers.length > 0 && (
        <div
          className="flex items-center gap-1 text-[10.5px] font-mono shrink-0"
          style={{ color: TOKENS.amber }}
          title="Must merge parent PR first"
        >
          <Lock size={10} />
          after #{item.blockedByNumbers.join(", #")}
        </div>
      )}

      {/* State indicators */}
      <div className="flex items-center gap-3 shrink-0">
        <StatusDot status={item.status} />
        <CIBadge ci={item.ci} />
        <div className="flex items-center gap-1 text-[10.5px] font-mono text-textDim">
          <Clock size={10} />
          {item.ageHours < 24
            ? `${item.ageHours}h`
            : `${Math.floor(item.ageHours / 24)}d`}
        </div>
        <Avatar login={item.authorLogin} url={item.authorAvatarUrl} size={18} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg p-4 bg-surface border border-border">
      <div
        className="text-[26px] font-bold leading-none tracking-tight"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[10.5px] font-mono uppercase tracking-wider text-textDim mt-1">
        {label}
      </div>
    </div>
  );
}

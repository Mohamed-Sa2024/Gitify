"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  GitMerge,
  type LucideIcon,
  Zap,
} from "lucide-react";
import { TOKENS } from "@/lib/design";
import { PRCard } from "@/components/PRCard";
import type { PullRequest } from "@/types/domain";

interface Props {
  prs: PullRequest[];
  recentlyClosed: PullRequest[];
  selectedNumber: number | null;
  onSelect: (pr: PullRequest) => void;
}

export function StandupView({
  prs,
  recentlyClosed,
  selectedNumber,
  onSelect,
}: Props) {
  // Merged in the last 72h — good enough window for a standup
  const merged = recentlyClosed
    .filter((p) => p.status === "merged" && p.updatedHours < 72)
    .slice(0, 8);

  const ready = prs.filter((p) => p.status === "ready");
  const blocked = prs.filter((p) => p.status === "blocked" || p.conflicts);
  const activeToday = prs.filter(
    (p) => p.updatedHours < 24 && p.status === "review" && !p.conflicts,
  );
  const goingStale = prs.filter(
    (p) => p.isStale && p.status !== "blocked" && p.status !== "merged",
  );

  return (
    <div className="space-y-6">
      <StandupSection
        Icon={GitMerge}
        color={TOKENS.violet}
        title="Merged recently"
        prs={merged}
        selectedNumber={selectedNumber}
        onSelect={onSelect}
        emptyMsg="Nothing merged in the last 3 days."
      />
      <StandupSection
        Icon={CheckCircle2}
        color={TOKENS.accent}
        title="Ready to merge"
        prs={ready}
        selectedNumber={selectedNumber}
        onSelect={onSelect}
        emptyMsg="No PRs are ready to merge yet."
      />
      <StandupSection
        Icon={AlertTriangle}
        color={TOKENS.red}
        title="Blocked / needs attention"
        prs={blocked}
        selectedNumber={selectedNumber}
        onSelect={onSelect}
        emptyMsg="Nothing is blocked. Great shape! 🎉"
      />
      <StandupSection
        Icon={Zap}
        color={TOKENS.blue}
        title="Active today"
        prs={activeToday}
        selectedNumber={selectedNumber}
        onSelect={onSelect}
        emptyMsg="No PR activity in the last 24 hours."
      />
      <StandupSection
        Icon={Clock}
        color={TOKENS.amber}
        title="Going stale"
        prs={goingStale}
        selectedNumber={selectedNumber}
        onSelect={onSelect}
        emptyMsg="No stale PRs. Good hygiene! ✓"
      />
    </div>
  );
}

function StandupSection({
  Icon,
  color,
  title,
  prs,
  selectedNumber,
  onSelect,
  emptyMsg,
}: {
  Icon: LucideIcon;
  color: string;
  title: string;
  prs: PullRequest[];
  selectedNumber: number | null;
  onSelect: (pr: PullRequest) => void;
  emptyMsg: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <Icon size={13} style={{ color }} />
        <span className="text-[12.5px] font-medium text-textP">{title}</span>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: `${color}18`, color }}
        >
          {prs.length}
        </span>
      </div>

      {prs.length === 0 ? (
        <div className="text-[12px] text-textDim italic px-1">{emptyMsg}</div>
      ) : (
        <div className="rounded-lg overflow-hidden bg-surface border border-border">
          {prs.map((pr) => (
            <PRCard
              key={pr.number}
              pr={pr}
              selected={selectedNumber === pr.number}
              onClick={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

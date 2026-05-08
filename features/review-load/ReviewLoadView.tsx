"use client";

import { useMemo } from "react";
import { Clock, Eye } from "lucide-react";
import { TOKENS } from "@/lib/design";
import { Avatar } from "@/components/Avatar";
import { StatusDot } from "@/components/StatusDot";
import type { PullRequest, ReviewerLoad } from "@/types/domain";

interface Props {
  prs: PullRequest[];
  onSelect: (pr: PullRequest) => void;
}

function buildLoads(prs: PullRequest[]): ReviewerLoad[] {
  const map = new Map<string, ReviewerLoad>();

  for (const pr of prs) {
    for (const r of pr.reviewers) {
      const existing = map.get(r.login) ?? {
        login: r.login,
        avatarUrl: r.avatarUrl,
        pendingCount: 0,
        oldestPendingHours: 0,
        approvedCount: 0,
        changesRequestedCount: 0,
        prs: [],
      };

      existing.prs.push(pr);

      if (r.approved) {
        existing.approvedCount++;
      } else if (r.changesRequested) {
        existing.changesRequestedCount++;
      } else {
        existing.pendingCount++;
        if (pr.ageHours > existing.oldestPendingHours) {
          existing.oldestPendingHours = pr.ageHours;
        }
      }

      map.set(r.login, existing);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.pendingCount - a.pendingCount,
  );
}

export function ReviewLoadView({ prs, onSelect }: Props) {
  const loads = useMemo(() => buildLoads(prs), [prs]);

  if (loads.length === 0) {
    return (
      <div className="rounded-lg p-12 text-center bg-surface border border-border">
        <Eye
          size={28}
          className="mx-auto mb-3"
          style={{ color: TOKENS.textMute }}
        />
        <div className="text-[14px] font-medium text-textP">
          No reviewer data
        </div>
        <div className="text-[12px] text-textDim mt-1">
          Assign reviewers to PRs and they will appear here.
        </div>
      </div>
    );
  }

  const maxPending = Math.max(1, ...loads.map((l) => l.pendingCount));
  const totalPending = loads.reduce((s, l) => s + l.pendingCount, 0);
  const avgPending =
    loads.length === 0 ? 0 : totalPending / loads.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Reviewers" value={loads.length} color={TOKENS.blue} />
        <StatCard
          label="Avg queue depth"
          value={Math.round(avgPending * 10) / 10}
          color={TOKENS.amber}
        />
        <StatCard
          label="Max queue depth"
          value={maxPending}
          color={maxPending >= 4 ? TOKENS.red : TOKENS.accent}
        />
      </div>

      <div className="rounded-lg overflow-hidden bg-surface border border-border">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Eye size={13} style={{ color: TOKENS.accent }} />
          <span className="text-[12px] font-medium text-textP">
            Reviewer queue
          </span>
          <span className="text-[11px] font-mono text-textMute">
            sorted by pending reviews
          </span>
        </div>

        <div className="divide-y divide-border">
          {loads.map((load) => (
            <ReviewerRow
              key={load.login}
              load={load}
              maxPending={maxPending}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewerRow({
  load,
  maxPending,
  onSelect,
}: {
  load: ReviewerLoad;
  maxPending: number;
  onSelect: (pr: PullRequest) => void;
}) {
  const barPct = maxPending === 0 ? 0 : (load.pendingCount / maxPending) * 100;
  const overloaded = load.pendingCount >= 4;
  const barColor = overloaded
    ? TOKENS.red
    : load.pendingCount >= 2
      ? TOKENS.amber
      : TOKENS.accent;

  const pendingPRs = load.prs.filter((pr) => {
    const r = pr.reviewers.find((rv) => rv.login === load.login);
    return r && !r.approved && !r.changesRequested;
  });

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        <Avatar login={load.login} url={load.avatarUrl} size={28} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-medium text-textP">
              {load.login}
            </span>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span
                style={{
                  color: overloaded
                    ? TOKENS.red
                    : load.pendingCount > 0
                      ? TOKENS.amber
                      : TOKENS.textMute,
                }}
              >
                {load.pendingCount} pending
              </span>
              {load.approvedCount > 0 && (
                <span style={{ color: TOKENS.accent }}>
                  {load.approvedCount} approved
                </span>
              )}
              {load.changesRequestedCount > 0 && (
                <span style={{ color: TOKENS.red }}>
                  {load.changesRequestedCount} changes req
                </span>
              )}
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-bg">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${barPct}%`, background: barColor }}
            />
          </div>
        </div>
        {load.oldestPendingHours > 0 && (
          <div
            className="flex items-center gap-1 text-[10.5px] font-mono text-textDim shrink-0"
            title="Oldest pending review"
          >
            <Clock size={10} />
            {load.oldestPendingHours < 24
              ? `${load.oldestPendingHours}h`
              : `${Math.floor(load.oldestPendingHours / 24)}d`}{" "}
            oldest
          </div>
        )}
      </div>

      {pendingPRs.length > 0 && (
        <div className="ml-10 space-y-1 mt-1">
          {pendingPRs.slice(0, 4).map((pr) => (
            <button
              key={pr.number}
              onClick={() => onSelect(pr)}
              className="w-full text-left flex items-center gap-2 py-0.5 group"
            >
              <StatusDot status={pr.status} />
              <span className="font-mono text-[10.5px] text-textMute shrink-0">
                #{pr.number}
              </span>
              <span className="text-[11.5px] text-textDim group-hover:text-textP transition-colors truncate">
                {pr.title}
              </span>
            </button>
          ))}
          {pendingPRs.length > 4 && (
            <span className="text-[10.5px] text-textMute font-mono pl-5">
              +{pendingPRs.length - 4} more
            </span>
          )}
        </div>
      )}
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

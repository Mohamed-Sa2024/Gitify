"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { TOKENS } from "@/lib/design";
import { Tag } from "@/components/Tag";
import type { AntiPattern, PullRequest } from "@/types/domain";

interface Props {
  prs: PullRequest[];
  selectedNumber: number | null;
  onSelect: (pr: PullRequest) => void;
}

type Severity = "high" | "medium" | "low";

interface PatternMeta {
  label: string;
  color: string;
  severity: Severity;
  description: string;
}

const META: Record<AntiPattern, PatternMeta> = {
  EMPTY_TITLE: {
    label: "Empty title",
    color: TOKENS.red,
    severity: "high",
    description: "PR has no title",
  },
  NO_DESCRIPTION: {
    label: "No description",
    color: TOKENS.amber,
    severity: "medium",
    description: "PR body is empty — reviewers have no context",
  },
  NO_REVIEWERS: {
    label: "No reviewers",
    color: TOKENS.amber,
    severity: "medium",
    description: "No reviewers assigned — PR may never get reviewed",
  },
  TOO_LARGE: {
    label: "Too large",
    color: TOKENS.red,
    severity: "high",
    description: "Diff > 1 000 lines — consider splitting into smaller PRs",
  },
  NO_CI: {
    label: "No CI",
    color: TOKENS.amber,
    severity: "medium",
    description: "No CI checks configured or running on this PR",
  },
  LONG_RUNNING: {
    label: "Long running",
    color: TOKENS.red,
    severity: "high",
    description: "Open for more than 1 week — likely blocked or forgotten",
  },
  STALE: {
    label: "Stale",
    color: TOKENS.amber,
    severity: "medium",
    description: "No activity in 72+ hours",
  },
};

const SEV_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export function PRHealthView({ prs, selectedNumber, onSelect }: Props) {
  const healthyCount = prs.filter((p) => p.antiPatterns.length === 0).length;
  const totalIssues = prs.reduce((s, p) => s + p.antiPatterns.length, 0);
  const score =
    prs.length === 0
      ? 100
      : Math.round((healthyCount / prs.length) * 100);

  const byPattern = useMemo(() => {
    const map = new Map<AntiPattern, PullRequest[]>();
    for (const pr of prs) {
      for (const ap of pr.antiPatterns) {
        const arr = map.get(ap) ?? [];
        arr.push(pr);
        map.set(ap, arr);
      }
    }
    return map;
  }, [prs]);

  const scoreColor =
    score >= 80 ? TOKENS.accent : score >= 50 ? TOKENS.amber : TOKENS.red;

  return (
    <div className="space-y-4">
      {/* Score card */}
      <div className="rounded-lg p-5 bg-surface border border-border">
        <div className="flex items-center gap-8 flex-wrap">
          <div>
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-textDim mb-1">
              Repo health score
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className="text-[44px] font-bold tracking-tight leading-none"
                style={{ color: scoreColor }}
              >
                {score}
              </span>
              <span className="text-[18px] text-textMute">/ 100</span>
            </div>
            <div className="mt-2 w-40 h-1.5 rounded-full overflow-hidden bg-bg">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${score}%`, background: scoreColor }}
              />
            </div>
          </div>
          <div className="w-px h-14 bg-border hidden sm:block" />
          <div className="flex gap-6">
            <ScoreStat
              label="Healthy PRs"
              value={healthyCount}
              color={TOKENS.accent}
            />
            <ScoreStat
              label="Issues found"
              value={totalIssues}
              color={totalIssues > 0 ? TOKENS.red : TOKENS.accent}
            />
            <ScoreStat
              label="PRs affected"
              value={prs.length - healthyCount}
              color={TOKENS.amber}
            />
          </div>
        </div>
      </div>

      {prs.every((p) => p.antiPatterns.length === 0) ? (
        <div className="rounded-lg p-10 text-center bg-surface border border-border">
          <CheckCircle2
            size={28}
            className="mx-auto mb-3"
            style={{ color: TOKENS.accent }}
          />
          <div className="text-[14px] font-medium text-textP">
            All PRs are healthy
          </div>
          <div className="text-[12px] text-textDim mt-1">
            No anti-patterns detected across {prs.length} PR
            {prs.length !== 1 ? "s" : ""}.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {(Object.keys(META) as AntiPattern[])
            .filter((ap) => byPattern.has(ap))
            .sort(
              (a, b) =>
                SEV_ORDER[META[a].severity] - SEV_ORDER[META[b].severity],
            )
            .map((ap) => {
              const meta = META[ap];
              const affected = byPattern.get(ap) ?? [];
              return (
                <div
                  key={ap}
                  className="rounded-lg overflow-hidden bg-surface border border-border"
                >
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    <AlertTriangle size={13} style={{ color: meta.color }} />
                    <span className="text-[13px] font-medium text-textP">
                      {meta.label}
                    </span>
                    <Tag color={meta.color}>{meta.severity}</Tag>
                    <span className="text-[11px] text-textDim">
                      {meta.description}
                    </span>
                    <div className="flex-1" />
                    <span className="text-[11px] font-mono text-textDim">
                      {affected.length} PR{affected.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {affected.map((pr) => (
                    <button
                      key={pr.number}
                      onClick={() => onSelect(pr)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors border-b border-border last:border-b-0"
                      style={{
                        background:
                          selectedNumber === pr.number
                            ? TOKENS.surface2
                            : undefined,
                      }}
                    >
                      <span className="font-mono text-[11px] text-textMute shrink-0">
                        #{pr.number}
                      </span>
                      <span className="text-[12.5px] text-textP flex-1 truncate">
                        {pr.title}
                      </span>
                      <span className="font-mono text-[11px] text-textDim shrink-0">
                        {pr.authorLogin}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function ScoreStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div
        className="text-[22px] font-bold leading-none tracking-tight"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[10.5px] font-mono uppercase tracking-wider text-textDim mt-0.5">
        {label}
      </div>
    </div>
  );
}

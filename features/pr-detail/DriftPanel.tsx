"use client";

import { GitCommit, RefreshCw } from "lucide-react";
import { TOKENS } from "@/lib/design";
import { useDrift } from "@/hooks/use-drift";

interface Props {
  fullName: string;
  prBranch: string;
  defaultBranch: string;
}

const LEVEL_COLOR = {
  none: TOKENS.accent,
  low: TOKENS.accent,
  medium: TOKENS.amber,
  high: TOKENS.red,
} as const;

const LEVEL_LABEL = {
  none: "Up to date",
  low: "Slightly behind",
  medium: "Moderately stale",
  high: "Critically stale",
} as const;

export function DriftPanel({ fullName, prBranch, defaultBranch }: Props) {
  const { data, isLoading } = useDrift({ fullName, prBranch, defaultBranch });

  return (
    <div className="p-5 border-b border-border">
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw size={13} style={{ color: TOKENS.accent }} />
        <span className="text-[11px] font-mono uppercase tracking-wider text-textMute">
          Diff drift
        </span>
      </div>
      {isLoading ? (
        <div className="h-8 rounded bg-surface2 animate-pulse" />
      ) : data ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span
              className="text-[12.5px] font-medium"
              style={{ color: LEVEL_COLOR[data.level] }}
            >
              {LEVEL_LABEL[data.level]}
            </span>
            {data.driftCommits > 0 && (
              <span
                className="text-[11px] font-mono px-2 py-0.5 rounded"
                style={{
                  background: `${LEVEL_COLOR[data.level]}15`,
                  color: LEVEL_COLOR[data.level],
                }}
              >
                {data.driftCommits} commit{data.driftCommits !== 1 ? "s" : ""} behind{" "}
                {defaultBranch}
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-bg">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width:
                  data.driftCommits === 0
                    ? "0%"
                    : `${Math.min(100, (data.driftCommits / 30) * 100)}%`,
                background: LEVEL_COLOR[data.level],
              }}
            />
          </div>
          {data.driftCommits > 0 && (
            <p className="text-[11.5px] text-textDim">
              This branch is {data.driftCommits} commit
              {data.driftCommits !== 1 ? "s" : ""} behind {defaultBranch}.
              Rebasing now reduces conflict risk.
            </p>
          )}
          {data.driftCommits === 0 && (
            <div className="flex items-center gap-1.5 text-[11.5px] text-textDim">
              <GitCommit size={11} style={{ color: TOKENS.accent }} />
              Branch is current with {defaultBranch}.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

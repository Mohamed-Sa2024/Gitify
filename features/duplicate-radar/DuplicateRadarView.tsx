"use client";

import { useState } from "react";
import { AlertTriangle, Bot, Copy, Loader2, Zap } from "lucide-react";
import { TOKENS } from "@/lib/design";
import { Tag } from "@/components/Tag";
import { Avatar } from "@/components/Avatar";
import { StatusDot } from "@/components/StatusDot";
import { useDuplicateRadar } from "@/hooks/use-duplicate-radar";
import type { PullRequest } from "@/types/domain";

interface Props {
  prs: PullRequest[];
  selectedNumber: number | null;
  onSelect: (pr: PullRequest) => void;
}

export function DuplicateRadarView({ prs, selectedNumber, onSelect }: Props) {
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  const { data, isLoading, refetch } = useDuplicateRadar({
    prs,
    enabled: analysisEnabled,
  });

  const prByNumber = new Map(prs.map((p) => [p.number, p]));

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div
        className="rounded-lg p-5 flex items-start justify-between gap-4"
        style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}` }}
      >
        <div className="flex items-start gap-3">
          <Bot size={20} style={{ color: TOKENS.accent }} className="mt-0.5 shrink-0" />
          <div>
            <div className="text-[13.5px] font-medium text-textP mb-1">
              Duplicate Work Radar
            </div>
            <p className="text-[12px] text-textDim max-w-[420px] leading-relaxed">
              Claude analyzes all open PR titles, descriptions, and file changes to
              detect pairs that may be solving the same problem. Runs on demand to
              save API calls.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (!analysisEnabled) {
              setAnalysisEnabled(true);
            } else {
              void refetch();
            }
          }}
          disabled={isLoading || prs.length < 2}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded text-[12px] font-medium transition-all disabled:opacity-50"
          style={{
            background: TOKENS.accent,
            color: TOKENS.bg,
          }}
        >
          {isLoading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Zap size={13} />
          )}
          {isLoading ? "Analyzing…" : analysisEnabled ? "Re-run" : "Run Analysis"}
        </button>
      </div>

      {/* Not yet run state */}
      {!analysisEnabled && (
        <div
          className="rounded-lg p-10 text-center"
          style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}` }}
        >
          <Copy size={28} className="mx-auto mb-3" style={{ color: TOKENS.textMute }} />
          <div className="text-[14px] font-medium text-textP mb-1">
            Ready to scan {prs.length} open PRs
          </div>
          <div className="text-[12px] text-textDim">
            Click &ldquo;Run Analysis&rdquo; to detect duplicate or overlapping work.
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div
          className="rounded-lg p-10 text-center"
          style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}` }}
        >
          <Loader2
            size={24}
            className="mx-auto mb-3 animate-spin"
            style={{ color: TOKENS.accent }}
          />
          <div className="text-[12px] font-mono text-textDim">
            Claude is reviewing {Math.min(prs.length, 40)} PRs for overlap…
          </div>
        </div>
      )}

      {/* Results */}
      {data && !isLoading && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="PRs analyzed" value={data.analyzedCount} color={TOKENS.blue} />
            <StatCard
              label="Duplicate pairs"
              value={data.pairs.length}
              color={data.pairs.length > 0 ? TOKENS.amber : TOKENS.accent}
            />
            <StatCard
              label="High similarity"
              value={data.pairs.filter((p) => p.similarity === "high").length}
              color={
                data.pairs.filter((p) => p.similarity === "high").length > 0
                  ? TOKENS.red
                  : TOKENS.accent
              }
            />
          </div>

          {data.pairs.length === 0 ? (
            <div
              className="rounded-lg p-10 text-center"
              style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}` }}
            >
              <div className="text-[14px] font-medium text-textP mb-1">
                No duplicates detected
              </div>
              <div className="text-[12px] text-textDim">
                All {data.analyzedCount} PRs appear to be working on distinct problems.
              </div>
            </div>
          ) : (
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}` }}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <AlertTriangle size={13} style={{ color: TOKENS.amber }} />
                <span className="text-[12px] font-medium text-textP">
                  Potential duplicate pairs
                </span>
              </div>
              <div className="divide-y divide-border">
                {data.pairs.map((pair, i) => {
                  const prA = prByNumber.get(pair.prANumber);
                  const prB = prByNumber.get(pair.prBNumber);
                  if (!prA || !prB) return null;
                  const simColor =
                    pair.similarity === "high" ? TOKENS.red : TOKENS.amber;
                  return (
                    <div key={i} className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Tag color={simColor}>{pair.similarity} similarity</Tag>
                        <span className="text-[11.5px] text-textDim flex-1">
                          {pair.reason}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {([prA, prB] as PullRequest[]).map((pr) => (
                          <button
                            key={pr.number}
                            onClick={() => onSelect(pr)}
                            className="text-left p-3 rounded transition-all hover:bg-white/[0.03]"
                            style={{
                              background:
                                selectedNumber === pr.number
                                  ? TOKENS.surface2
                                  : TOKENS.bg,
                              border: `1px solid ${
                                selectedNumber === pr.number
                                  ? simColor + "44"
                                  : TOKENS.border
                              }`,
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <StatusDot status={pr.status} />
                              <span className="font-mono text-[10.5px] text-textMute">
                                #{pr.number}
                              </span>
                              <Avatar
                                login={pr.authorLogin}
                                url={pr.authorAvatarUrl}
                                size={14}
                              />
                            </div>
                            <p className="text-[12px] text-textP font-medium leading-snug">
                              {pr.title}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-[10.5px] font-mono text-textMute text-right">
            Analysis ran at {new Date(data.generatedAt).toLocaleTimeString()}
          </div>
        </>
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
    <div
      className="rounded-lg p-4"
      style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}` }}
    >
      <div
        className="text-[26px] font-bold leading-none tracking-tight"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[10.5px] font-mono uppercase tracking-wider text-textMute mt-1">
        {label}
      </div>
    </div>
  );
}

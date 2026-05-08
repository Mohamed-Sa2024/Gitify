"use client";

import { useMemo } from "react";
import { AlertTriangle, FileCode, FolderOpen, Loader2 } from "lucide-react";
import { TOKENS, branchType } from "@/lib/design";
import { usePullFiles } from "@/hooks/use-pull-files";
import type { PullRequest } from "@/types/domain";

interface Props {
  prs: PullRequest[];
  fullName: string | null;
  selectedNumber: number | null;
  onSelect: (pr: PullRequest) => void;
}

interface DirSummary {
  dir: string;
  totalChanges: number;
  prCount: number;
  conflictFileCount: number;
}

export function BlastRadiusView({
  prs,
  fullName,
  selectedNumber,
  onSelect,
}: Props) {
  const { filesByPR, isLoading } = usePullFiles(prs, fullName);

  // file → PRs that touch it
  const fileToPRs = useMemo(() => {
    const map = new Map<string, PullRequest[]>();
    for (const pr of prs) {
      const files = filesByPR.get(pr.number) ?? [];
      for (const f of files) {
        const arr = map.get(f.filename) ?? [];
        arr.push(pr);
        map.set(f.filename, arr);
      }
    }
    return map;
  }, [prs, filesByPR]);

  // files touched by >1 PR (conflict risk)
  const conflictFiles = useMemo(
    () =>
      Array.from(fileToPRs.entries())
        .filter(([, ps]) => ps.length > 1)
        .sort((a, b) => b[1].length - a[1].length),
    [fileToPRs],
  );

  // directory-level summary
  const dirSummary = useMemo<DirSummary[]>(() => {
    const map = new Map<
      string,
      { totalChanges: number; prNums: Set<number>; conflictFiles: number }
    >();
    for (const pr of prs) {
      const files = filesByPR.get(pr.number) ?? [];
      for (const f of files) {
        const existing = map.get(f.directory) ?? {
          totalChanges: 0,
          prNums: new Set<number>(),
          conflictFiles: 0,
        };
        existing.totalChanges += f.changes;
        existing.prNums.add(pr.number);
        if ((fileToPRs.get(f.filename)?.length ?? 0) > 1) {
          existing.conflictFiles++;
        }
        map.set(f.directory, existing);
      }
    }
    return Array.from(map.entries())
      .map(([dir, d]) => ({
        dir,
        totalChanges: d.totalChanges,
        prCount: d.prNums.size,
        conflictFileCount: d.conflictFiles,
      }))
      .sort((a, b) => b.totalChanges - a.totalChanges)
      .slice(0, 25);
  }, [prs, filesByPR, fileToPRs]);

  if (isLoading) {
    return (
      <div className="rounded-lg p-12 text-center bg-surface border border-border">
        <Loader2
          size={24}
          className="mx-auto mb-3 animate-spin"
          style={{ color: TOKENS.accent }}
        />
        <div className="text-[12px] text-textDim font-mono">
          Fetching file changes across {prs.length} PR
          {prs.length !== 1 ? "s" : ""}…
        </div>
        <div className="text-[11px] text-textMute font-mono mt-1">
          This makes one API request per PR.
        </div>
      </div>
    );
  }

  const maxChanges = Math.max(1, ...dirSummary.map((d) => d.totalChanges));
  const totalFiles = fileToPRs.size;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Files changed"
          value={totalFiles}
          color={TOKENS.accent}
        />
        <StatCard
          label="Conflict risk files"
          value={conflictFiles.length}
          color={conflictFiles.length > 0 ? TOKENS.red : TOKENS.accent}
        />
        <StatCard
          label="Directories touched"
          value={dirSummary.length}
          color={TOKENS.blue}
        />
      </div>

      {/* Conflict risk files */}
      {conflictFiles.length > 0 && (
        <div className="rounded-lg overflow-hidden bg-surface border border-border">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <AlertTriangle size={13} style={{ color: TOKENS.red }} />
            <span className="text-[12px] font-medium text-textP">
              Conflict risk
            </span>
            <span className="text-[11px] font-mono text-textDim">
              {conflictFiles.length} file
              {conflictFiles.length !== 1 ? "s" : ""} touched by multiple PRs
            </span>
          </div>

          {conflictFiles.slice(0, 15).map(([filename, cPRs]) => (
            <div
              key={filename}
              className="px-4 py-3 border-b border-border last:border-b-0"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileCode size={11} style={{ color: TOKENS.red }} />
                <span className="font-mono text-[11.5px] text-textP flex-1 truncate">
                  {filename}
                </span>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: "rgba(248,113,113,0.1)",
                    color: TOKENS.red,
                    border: "1px solid rgba(248,113,113,0.2)",
                  }}
                >
                  {cPRs.length} PRs
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-5 flex-wrap">
                {cPRs.map((pr) => {
                  const t = branchType(pr.branch);
                  return (
                    <button
                      key={pr.number}
                      onClick={() => onSelect(pr)}
                      className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded transition-all hover:brightness-110"
                      style={{
                        background: t.bg,
                        border: `1px solid ${t.color}33`,
                        color: t.color,
                        outline:
                          selectedNumber === pr.number
                            ? `1.5px solid ${t.color}`
                            : undefined,
                      }}
                    >
                      #{pr.number} {pr.branch}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {conflictFiles.length === 0 && totalFiles > 0 && (
        <div
          className="rounded-lg p-4 flex items-center gap-3 text-[12.5px] text-textP"
          style={{
            background: "rgba(200,255,62,0.06)",
            border: `1px solid ${TOKENS.accent}33`,
          }}
        >
          <AlertTriangle size={13} style={{ color: TOKENS.accent }} />
          No files are touched by more than one PR — no merge conflicts
          predicted.
        </div>
      )}

      {/* Directory heatmap */}
      {dirSummary.length > 0 && (
        <div className="rounded-lg overflow-hidden bg-surface border border-border">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <FolderOpen size={13} style={{ color: TOKENS.accent }} />
            <span className="text-[12px] font-medium text-textP">
              Directory impact
            </span>
            <span className="text-[11px] font-mono text-textMute">
              by lines changed
            </span>
          </div>

          <div className="divide-y divide-border">
            {dirSummary.map(({ dir, totalChanges, prCount, conflictFileCount }) => {
              const pct = (totalChanges / maxChanges) * 100;
              const hasConflicts = conflictFileCount > 0;
              return (
                <div key={dir} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen
                        size={11}
                        style={{
                          color: hasConflicts ? TOKENS.red : TOKENS.textMute,
                          flexShrink: 0,
                        }}
                      />
                      <span className="font-mono text-[11.5px] text-textP truncate">
                        {dir}
                      </span>
                      {hasConflicts && (
                        <span
                          className="text-[9.5px] font-mono uppercase tracking-wider px-1 py-0.5 rounded shrink-0"
                          style={{
                            color: TOKENS.red,
                            background: "rgba(248,113,113,0.1)",
                          }}
                        >
                          {conflictFileCount} conflict
                          {conflictFileCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10.5px] font-mono text-textDim shrink-0 ml-3">
                      <span>
                        {prCount} PR{prCount !== 1 ? "s" : ""}
                      </span>
                      <span
                        style={{
                          color: hasConflicts ? TOKENS.red : TOKENS.accent,
                        }}
                      >
                        {totalChanges.toLocaleString()} lines
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-bg">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: hasConflicts ? TOKENS.red : TOKENS.accent,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
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

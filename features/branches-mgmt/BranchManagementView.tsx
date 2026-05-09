"use client";

import { useState } from "react";
import { Lock, Search, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { TOKENS } from "@/lib/design";
import { Tag } from "@/components/Tag";
import { useBranchesDetail } from "@/hooks/use-branches-detail";
import { deleteBranch } from "@/lib/github/pulls";
import type { BranchSummary } from "@/types/domain";
import type { PullRequest } from "@/types/domain";

interface Props {
  fullName: string;
  openPRs: PullRequest[];
  onSelectPR: (n: number) => void;
}

type Filter = "all" | "active" | "stale" | "protected";

function formatAge(ageHours: number): string {
  if (ageHours < 1) return "< 1h ago";
  if (ageHours < 24) return `${Math.floor(ageHours)}h ago`;
  const days = Math.floor(ageHours / 24);
  return `${days}d ago`;
}

export function BranchManagementView({ fullName, openPRs, onSelectPR }: Props) {
  const queryClient = useQueryClient();
  const parts = fullName.split("/");
  const owner = parts[0] ?? "";
  const repo = parts[1] ?? "";

  // We need defaultBranch — infer from openPRs base or fall back
  const defaultBranch = openPRs[0]?.base ?? "main";

  const { branches, isLoading } = useBranchesDetail(fullName, openPRs, defaultBranch);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  // Delete confirmation state: branchName → "confirming" | "deleting" | null
  const [deleteState, setDeleteState] = useState<Record<string, "confirming" | "deleting">>({});
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const filtered = branches.filter((b) => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "active") return !b.isStale;
    if (filter === "stale") return b.isStale;
    if (filter === "protected") return b.isProtected;
    return true;
  });

  const total = branches.length;
  const active = branches.filter((b) => !b.isStale).length;
  const stale = branches.filter((b) => b.isStale).length;
  const protected_ = branches.filter((b) => b.isProtected).length;

  const handleDelete = async (branch: BranchSummary) => {
    if (deleteState[branch.name] === "confirming") {
      setDeleteState((s) => ({ ...s, [branch.name]: "deleting" }));
      try {
        await deleteBranch({ owner, repo, branch: branch.name });
        await queryClient.invalidateQueries({ queryKey: ["branches-detail", fullName] });
        await queryClient.invalidateQueries({ queryKey: ["branches", fullName] });
        setDeleteState((s) => { const n = { ...s }; delete n[branch.name]; return n; });
      } catch (err) {
        const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
        const msg = axiosErr.response?.data?.message ?? axiosErr.message ?? "Delete failed";
        setDeleteErrors((e) => ({ ...e, [branch.name]: msg }));
        setDeleteState((s) => { const n = { ...s }; delete n[branch.name]; return n; });
        setTimeout(() => {
          setDeleteErrors((e) => { const n = { ...e }; delete n[branch.name]; return n; });
        }, 4000);
      }
    } else {
      setDeleteState((s) => ({ ...s, [branch.name]: "confirming" }));
    }
  };

  const cancelDelete = (name: string) => {
    setDeleteState((s) => { const n = { ...s }; delete n[name]; return n; });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-surface border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div
        className="rounded-lg px-5 py-3 flex items-center gap-6 border"
        style={{ background: TOKENS.surface, borderColor: TOKENS.border }}
      >
        <Stat label="Total" value={total} color={TOKENS.text} />
        <Stat label="Active" value={active} color={TOKENS.accent} />
        <Stat label="Stale" value={stale} color={TOKENS.red} />
        <Stat label="Protected" value={protected_} color={TOKENS.blue} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-surface border border-border">
          {(["all", "active", "stale", "protected"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded text-[12px] capitalize transition-all"
              style={{
                background: filter === f ? TOKENS.surface2 : "transparent",
                color: filter === f ? TOKENS.text : TOKENS.textDim,
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface border border-border flex-1 min-w-[160px] max-w-[300px]">
          <Search size={12} style={{ color: TOKENS.textMute }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branches…"
            className="bg-transparent outline-none text-[12px] flex-1 placeholder:text-textMute"
            style={{ color: TOKENS.text }}
          />
        </div>
      </div>

      {/* Branch list */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: TOKENS.border }}>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[12.5px]" style={{ color: TOKENS.textDim }}>
            No branches match the current filter.
          </div>
        ) : (
          filtered.map((branch, idx) => (
            <BranchRow
              key={branch.name}
              branch={branch}
              isLast={idx === filtered.length - 1}
              deleteState={deleteState[branch.name]}
              deleteError={deleteErrors[branch.name]}
              onDelete={() => void handleDelete(branch)}
              onCancelDelete={() => cancelDelete(branch.name)}
              onSelectPR={onSelectPR}
            />
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[20px] font-bold font-mono" style={{ color }}>{value}</span>
      <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: TOKENS.textDim }}>{label}</span>
    </div>
  );
}

function BranchRow({
  branch,
  isLast,
  deleteState,
  deleteError,
  onDelete,
  onCancelDelete,
  onSelectPR,
}: {
  branch: BranchSummary;
  isLast: boolean;
  deleteState: "confirming" | "deleting" | undefined;
  deleteError: string | undefined;
  onDelete: () => void;
  onCancelDelete: () => void;
  onSelectPR: (n: number) => void;
}) {
  const canDelete = !branch.isDefault && !branch.isProtected;

  return (
    <div
      className="px-4 py-3"
      style={{
        background: TOKENS.surface,
        borderBottom: isLast ? "none" : `1px solid ${TOKENS.border}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + name + badges */}
        <div className="flex items-start gap-2 min-w-0">
          <span className="mt-0.5 text-[13px] shrink-0">
            {branch.isProtected ? "🔒" : branch.isDefault ? "✓" : branch.hasOpenPR ? "⚡" : branch.isStale ? "⚠" : "·"}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {branch.hasOpenPR && branch.openPRNumber !== null ? (
                <button
                  onClick={() => onSelectPR(branch.openPRNumber!)}
                  className="font-mono text-[13px] hover:underline"
                  style={{ color: TOKENS.text }}
                >
                  {branch.name}
                </button>
              ) : (
                <span className="font-mono text-[13px]" style={{ color: TOKENS.text }}>
                  {branch.name}
                </span>
              )}
              {branch.isDefault && <Tag color={TOKENS.accent}>default</Tag>}
              {branch.isProtected && <Tag color={TOKENS.blue}>protected</Tag>}
              {branch.isStale && <Tag color={TOKENS.red}>stale</Tag>}
              {branch.hasOpenPR && branch.openPRNumber !== null && (
                <Tag color={TOKENS.violet}>open PR #{branch.openPRNumber}</Tag>
              )}
            </div>

            {/* Commit line */}
            <div
              className={`mt-1 flex items-center gap-2 flex-wrap text-[11px] font-mono ${branch.isStale ? "opacity-60" : ""}`}
              style={{ color: TOKENS.textDim }}
            >
              <span>{branch.lastCommitSha}</span>
              {branch.lastCommitMessage && (
                <>
                  <span style={{ color: TOKENS.textMute }}>·</span>
                  <span className="truncate max-w-[240px]">{branch.lastCommitMessage}</span>
                </>
              )}
              {branch.lastCommitAuthor && (
                <>
                  <span style={{ color: TOKENS.textMute }}>·</span>
                  <span>{branch.lastCommitAuthor}</span>
                </>
              )}
              {branch.lastCommitDate && (
                <>
                  <span style={{ color: TOKENS.textMute }}>·</span>
                  <span>{formatAge(branch.ageHours)}</span>
                </>
              )}
            </div>

            {deleteError && (
              <div className="mt-1 text-[11px] font-mono" style={{ color: TOKENS.red }}>
                {deleteError}
              </div>
            )}
          </div>
        </div>

        {/* Right: delete controls */}
        {canDelete && (
          <div className="flex items-center gap-2 shrink-0">
            {deleteState === "confirming" ? (
              <>
                <span className="text-[11px] font-mono" style={{ color: TOKENS.textDim }}>
                  Delete `{branch.name}`?
                </span>
                <button
                  onClick={onCancelDelete}
                  className="text-[11px] font-mono px-2 py-0.5 rounded transition-colors"
                  style={{ color: TOKENS.textDim }}
                >
                  Cancel
                </button>
                <button
                  onClick={onDelete}
                  className="text-[11px] font-mono px-2 py-0.5 rounded transition-colors"
                  style={{ color: TOKENS.red }}
                >
                  Delete
                </button>
              </>
            ) : deleteState === "deleting" ? (
              <span className="text-[11px] font-mono" style={{ color: TOKENS.textMute }}>
                Deleting…
              </span>
            ) : (
              <button
                onClick={onDelete}
                className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded transition-colors"
                style={{ color: "#f87171" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <Trash2 size={11} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

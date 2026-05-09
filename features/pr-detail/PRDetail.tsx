"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  ChevronsRight,
  Flame,
  GitMerge,
  Loader2,
  Network,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { TOKENS, branchType } from "@/lib/design";
import { Avatar } from "@/components/Avatar";
import { BranchPill } from "@/components/BranchPill";
import { StatusDot } from "@/components/StatusDot";
import { Tag } from "@/components/Tag";
import { DiffViewer } from "./DiffViewer";
import { ReviewPanel } from "./ReviewPanel";
import { mergePull } from "@/lib/github/pulls";
import type { PullRequest } from "@/types/domain";

interface Props {
  pr: PullRequest;
  allPRs: PullRequest[];
  fullName: string | null;
  onClose: () => void;
}

type MergeMethod = "merge" | "squash" | "rebase";

interface MergeStep {
  number: number;
  title: string;
  state: "waiting" | "merging" | "done" | "error";
  error?: string;
}

/** Builds the chain from root → this PR in merge order. */
function buildChainToCurrentPR(
  pr: PullRequest,
  allPRs: PullRequest[],
): PullRequest[] {
  const chain: PullRequest[] = [];
  let current: PullRequest | undefined = pr;
  while (current) {
    chain.unshift(current);
    if (current.parentNumber === null) break;
    const parent = allPRs.find((p) => p.number === current!.parentNumber);
    if (!parent) break;
    current = parent;
  }
  return chain;
}

export function PRDetail({ pr, allPRs, fullName, onClose }: Props) {
  const t = branchType(pr.branch);
  const queryClient = useQueryClient();
  const parent = allPRs.find((p) => p.number === pr.parentNumber);
  const children = allPRs.filter((p) => p.parentNumber === pr.number);
  const isInStack = parent !== undefined || children.length > 0;
  const chain = isInStack ? buildChainToCurrentPR(pr, allPRs) : [pr];

  const mergeReady =
    pr.status === "ready" &&
    pr.ci === "passing" &&
    !pr.conflicts &&
    pr.approvals >= 1;

  const score = (() => {
    let s = 0;
    if (pr.ci === "passing") s += 30;
    else if (pr.ci === "pending") s += 10;
    if (!pr.conflicts) s += 25;
    if (pr.approvals >= 1) s += 25;
    if (!pr.draft) s += 10;
    if (!pr.isAged) s += 10;
    return s;
  })();

  // ── Tab state ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"overview" | "diff">("overview");

  // ── Single PR merge state ─────────────────────────────────────────────────
  const [singleMerging, setSingleMerging] = useState(false);
  const [singleMergeError, setSingleMergeError] = useState<string | null>(null);
  const [singleMergeSuccess, setSingleMergeSuccess] = useState(false);
  const [singleMergeMethod, setSingleMergeMethod] = useState<MergeMethod>("merge");

  const handleSingleMerge = async () => {
    if (singleMerging || !fullName) return;
    const parts = fullName.split("/");
    const owner = parts[0];
    const repo = parts[1];
    if (!owner || !repo) return;
    setSingleMerging(true);
    setSingleMergeError(null);
    try {
      await mergePull({ owner, repo, number: pr.number, mergeMethod: singleMergeMethod });
      setSingleMergeSuccess(true);
      await queryClient.invalidateQueries({ queryKey: ["pulls", fullName] });
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      setSingleMergeError(axiosErr.response?.data?.message ?? axiosErr.message ?? "Merge failed");
    } finally {
      setSingleMerging(false);
    }
  };

  const isMergeDisabled =
    pr.status === "draft" ||
    pr.conflicts === true ||
    !fullName ||
    singleMerging;

  const mergeDisabledReason = pr.status === "draft"
    ? "Cannot merge a draft PR"
    : pr.conflicts
      ? "PR has merge conflicts"
      : !fullName
        ? "No repository selected"
        : undefined;

  // ── Sequential stack merge state ──────────────────────────────────────────
  const [mergeMethod, setMergeMethod] = useState<MergeMethod>("merge");
  const [mergeSteps, setMergeSteps] = useState<MergeStep[] | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  const startStackMerge = async () => {
    const parts = fullName?.split("/") ?? [];
    const owner = parts[0];
    const repo = parts[1];
    if (!owner || !repo) return;

    const steps: MergeStep[] = chain.map((p) => ({
      number: p.number,
      title: p.title,
      state: "waiting",
    }));
    setMergeSteps(steps);
    setIsMerging(true);

    for (let i = 0; i < chain.length; i++) {
      const p = chain[i];
      if (!p) break;

      setMergeSteps((prev) =>
        prev
          ? prev.map((s, idx) =>
              idx === i ? { ...s, state: "merging" } : s,
            )
          : null,
      );

      try {
        await mergePull({
          owner,
          repo,
          number: p.number,
          mergeMethod,
        });
        setMergeSteps((prev) =>
          prev
            ? prev.map((s, idx) =>
                idx === i ? { ...s, state: "done" } : s,
              )
            : null,
        );
        // Invalidate so the PR list refreshes
        await queryClient.invalidateQueries({ queryKey: ["pulls", fullName] });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Merge failed";
        setMergeSteps((prev) =>
          prev
            ? prev.map((s, idx) =>
                idx === i ? { ...s, state: "error", error: msg } : s,
              )
            : null,
        );
        break;
      }
    }

    setIsMerging(false);
  };

  const resetMerge = () => {
    setMergeSteps(null);
    setIsMerging(false);
  };

  return (
    <div className="h-full flex flex-col bg-surface border-l border-border animate-slide-in-right">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[11px] text-textMute">
                #{pr.number}
              </span>
              <StatusDot status={pr.status} />
            </div>
            <h2 className="text-[16px] font-semibold leading-snug text-textP">
              {pr.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/5 text-textDim shrink-0"
            aria-label="Close detail drawer"
          >
            <ChevronsRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <BranchPill name={pr.branch} size="md" />
          <ChevronRight size={12} className="text-textMute" />
          <BranchPill name={pr.base} size="md" />
        </div>

        {pr.antiPatterns.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {pr.antiPatterns.map((ap) => (
              <Tag key={ap} color={TOKENS.amber}>
                {ap.toLowerCase().replace(/_/g, " ")}
              </Tag>
            ))}
          </div>
        )}
      </div>

      {/* Tab strip */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
        {(["overview", "diff"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1 rounded text-[12px] capitalize transition-all"
            style={{
              background: tab === t ? TOKENS.surface2 : "transparent",
              color: tab === t ? TOKENS.text : TOKENS.textDim,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-auto">
        {tab === "diff" && fullName && (
          <DiffViewer fullName={fullName} prNumber={pr.number} />
        )}
        {tab === "overview" && (
        <>
        {/* Merge readiness */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={13} style={{ color: TOKENS.accent }} />
            <span className="text-[11px] font-mono uppercase tracking-wider text-textDim">
              Merge readiness
            </span>
          </div>
          <div
            className="rounded-lg p-4"
            style={{
              background: mergeReady ? "rgba(200,255,62,0.06)" : TOKENS.surface2,
              border: `1px solid ${mergeReady ? `${TOKENS.accent}33` : TOKENS.border}`,
            }}
          >
            <div className="flex items-baseline justify-between mb-2">
              <span
                className="text-[26px] font-bold tracking-tight"
                style={{ color: mergeReady ? TOKENS.accent : TOKENS.text }}
              >
                {score}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-textMute">
                / 100
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-bg mb-3">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${score}%`,
                  background: mergeReady ? TOKENS.accent : TOKENS.red,
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Check ok={pr.ci === "passing"} label="CI passing" />
              <Check ok={!pr.conflicts} label="No merge conflicts" />
              <Check
                ok={pr.approvals >= 1}
                label={`${pr.approvals}/${pr.reviewers.length} required reviews`}
              />
              <Check ok={!pr.draft} label="Not in draft" />
            </div>
          </div>
        </div>

        {/* Stack chain */}
        {isInStack && (
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <Network size={13} style={{ color: TOKENS.accent }} />
              <span className="text-[11px] font-mono uppercase tracking-wider text-textDim">
                Stack
              </span>
              <span className="text-[10px] font-mono text-textMute ml-auto">
                {chain.length} PR{chain.length !== 1 ? "s" : ""} in chain
              </span>
            </div>
            <div className="space-y-1.5">
              {chain.map((p) => (
                <ChainItem
                  key={p.number}
                  pr={p}
                  isCurrent={p.number === pr.number}
                />
              ))}
              {children.map((c) => (
                <ChainItem key={c.number} pr={c} role="child" />
              ))}
            </div>
          </div>
        )}

        {/* Sequential stack merge */}
        {isInStack && (
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <GitMerge size={13} style={{ color: TOKENS.accent }} />
              <span className="text-[11px] font-mono uppercase tracking-wider text-textDim">
                Sequential stack merge
              </span>
            </div>

            {mergeSteps ? (
              <div className="space-y-2">
                {mergeSteps.map((step, i) => (
                  <div
                    key={step.number}
                    className="flex items-center gap-3 py-1.5"
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {step.state === "done" ? (
                        <CheckCircle2 size={14} style={{ color: TOKENS.accent }} />
                      ) : step.state === "error" ? (
                        <XCircle size={14} style={{ color: TOKENS.red }} />
                      ) : step.state === "merging" ? (
                        <Loader2
                          size={14}
                          className="animate-spin"
                          style={{ color: TOKENS.amber }}
                        />
                      ) : (
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: TOKENS.textMute }}
                        >
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10.5px]" style={{ color: TOKENS.blue }}>
                      #{step.number}
                    </span>
                    <span className="text-[12px] text-textP flex-1 truncate">
                      {step.title}
                    </span>
                    {step.state === "error" && (
                      <span className="text-[10.5px] font-mono text-red-400">
                        {step.error}
                      </span>
                    )}
                  </div>
                ))}

                {!isMerging && (
                  <button
                    onClick={resetMerge}
                    className="text-[11px] font-mono text-textDim hover:text-textP transition-colors mt-2"
                  >
                    reset
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="text-[12px] text-textDim mb-3">
                  Merges {chain.length} PR{chain.length !== 1 ? "s" : ""} in
                  order: root → this PR. Requires{" "}
                  <span style={{ color: TOKENS.amber }}>pull_requests: write</span>{" "}
                  permission on your GitHub App.
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-mono text-textMute">
                    Method:
                  </span>
                  {(["merge", "squash", "rebase"] as MergeMethod[]).map(
                    (m) => (
                      <button
                        key={m}
                        onClick={() => setMergeMethod(m)}
                        className="text-[11px] font-mono px-2 py-0.5 rounded transition-all"
                        style={{
                          background:
                            mergeMethod === m
                              ? `${TOKENS.accent}18`
                              : TOKENS.surface2,
                          border: `1px solid ${mergeMethod === m ? `${TOKENS.accent}55` : TOKENS.border}`,
                          color:
                            mergeMethod === m ? TOKENS.accent : TOKENS.textDim,
                        }}
                      >
                        {m}
                      </button>
                    ),
                  )}
                </div>

                <button
                  onClick={startStackMerge}
                  disabled={!fullName}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-[12px] font-medium transition-all"
                  style={{
                    background: TOKENS.surface2,
                    border: `1px solid ${TOKENS.borderHi}`,
                    color: TOKENS.text,
                    cursor: fullName ? "pointer" : "not-allowed",
                  }}
                >
                  <GitMerge size={13} />
                  Merge stack ({chain.length} PR
                  {chain.length !== 1 ? "s" : ""})
                </button>
              </>
            )}
          </div>
        )}

        {/* Reviewers */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={13} style={{ color: TOKENS.accent }} />
              <span className="text-[11px] font-mono uppercase tracking-wider text-textDim">
                Reviewers
              </span>
            </div>
            <span className="text-[11px] font-mono text-textDim">
              {pr.approvals}/{pr.reviewers.length}
            </span>
          </div>
          {pr.reviewers.length === 0 ? (
            <div className="text-[12px] text-textDim italic">
              No reviewers requested.
            </div>
          ) : (
            <div className="space-y-2">
              {pr.reviewers.map((r) => (
                <div
                  key={r.login}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Avatar login={r.login} url={r.avatarUrl} size={20} />
                    <span className="text-[12.5px] text-textP">{r.login}</span>
                  </div>
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider"
                    style={{
                      color: r.approved
                        ? TOKENS.accent
                        : r.changesRequested
                          ? TOKENS.red
                          : TOKENS.textMute,
                    }}
                  >
                    {r.approved
                      ? "approved"
                      : r.changesRequested
                        ? "changes req"
                        : "pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risk analysis */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bot size={13} style={{ color: TOKENS.accent }} />
            <span className="text-[11px] font-mono uppercase tracking-wider text-textDim">
              Risk analysis
            </span>
          </div>
          <div className="rounded-lg p-3 bg-surface2 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Flame
                size={12}
                style={{
                  color:
                    pr.risk === "high"
                      ? TOKENS.red
                      : pr.risk === "medium"
                        ? TOKENS.amber
                        : TOKENS.accent,
                }}
              />
              <span className="text-[12px] capitalize text-textP">
                {pr.risk} risk
              </span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-textDim">
              {pr.risk === "high"
                ? "Large diff or many changed files. Recommend extra senior review and feature-flag rollout."
                : pr.risk === "medium"
                  ? "Moderate scope. Suggest one extra reviewer with relevant context."
                  : "Low blast radius — safe to merge once approved."}
            </p>
          </div>
        </div>

        {/* Review panel */}
        {pr.status !== "merged" && pr.status !== "closed" && fullName && (
          <ReviewPanel pr={pr} fullName={fullName} />
        )}
        </>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-border space-y-2">
        {/* Merge method selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-textMute">Method:</span>
          {(["merge", "squash", "rebase"] as MergeMethod[]).map((m) => (
            <button
              key={m}
              onClick={() => setSingleMergeMethod(m)}
              className="text-[11px] font-mono px-2 py-0.5 rounded transition-all"
              style={{
                background: singleMergeMethod === m ? `${TOKENS.accent}18` : TOKENS.surface2,
                border: `1px solid ${singleMergeMethod === m ? `${TOKENS.accent}55` : TOKENS.border}`,
                color: singleMergeMethod === m ? TOKENS.accent : TOKENS.textDim,
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => void handleSingleMerge()}
            disabled={isMergeDisabled}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-[12px] font-medium transition-all"
            style={{
              background: singleMergeSuccess
                ? TOKENS.accent
                : isMergeDisabled
                  ? TOKENS.surface2
                  : TOKENS.accent,
              color: singleMergeSuccess
                ? TOKENS.bg
                : isMergeDisabled
                  ? TOKENS.textMute
                  : TOKENS.bg,
              border: `1px solid ${isMergeDisabled && !singleMergeSuccess ? TOKENS.border : TOKENS.accent}`,
              cursor: isMergeDisabled ? "not-allowed" : "pointer",
            }}
            title={mergeDisabledReason ?? "Merge this PR"}
          >
            {singleMerging ? (
              <><Loader2 size={13} className="animate-spin" /> Merging…</>
            ) : singleMergeSuccess ? (
              <><CheckCircle2 size={13} /> Merged!</>
            ) : (
              <><GitMerge size={13} /> Merge PR</>
            )}
          </button>
          <a
            href={pr.url}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded text-[12px] inline-flex items-center gap-1 bg-surface2 text-textP border border-border hover:border-borderHi transition-colors"
            title="Open on GitHub"
          >
            <ArrowUpRight size={13} /> GitHub
          </a>
        </div>

        {singleMergeError && (
          <Tag color={TOKENS.red}>{singleMergeError}</Tag>
        )}
      </div>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 size={12} style={{ color: TOKENS.accent }} />
      ) : (
        <XCircle size={12} style={{ color: TOKENS.red }} />
      )}
      <span
        className="text-[11.5px]"
        style={{ color: ok ? TOKENS.text : TOKENS.textDim }}
      >
        {label}
      </span>
    </div>
  );
}

function ChainItem({
  pr,
  isCurrent = false,
  role,
}: {
  pr: PullRequest;
  isCurrent?: boolean;
  role?: "child";
}) {
  const t = branchType(pr.branch);
  return (
    <div
      className="flex items-center gap-2 pl-3 py-1.5 rounded min-w-0"
      style={{
        background: isCurrent ? TOKENS.surface2 : undefined,
        border: isCurrent ? `1px solid ${t.color}33` : undefined,
      }}
    >
      {isCurrent ? (
        <span
          className="text-[9px] font-mono uppercase tracking-wider shrink-0"
          style={{ color: t.color }}
        >
          this
        </span>
      ) : (
        <span className="text-[9px] font-mono uppercase tracking-wider shrink-0 text-textMute">
          {role ?? "root"}
        </span>
      )}
      <span
        className="font-mono text-[10.5px] shrink-0"
        style={{ color: t.color }}
      >
        {pr.branch}
      </span>
      <span className="text-[11.5px] truncate text-textDim">{pr.title}</span>
    </div>
  );
}

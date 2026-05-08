"use client";

import { useEffect, useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  GitBranch,
  GitMerge,
  Hash,
  Inbox,
  Network,
  Shield,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { SummaryTile } from "@/components/SummaryTile";
import { BranchHierarchyView } from "@/features/branches/BranchHierarchyView";
import { StackedPRGraph } from "@/features/graph/StackedPRGraph";
import { AnalyticsView } from "@/features/analytics/AnalyticsView";
import { PRDetail } from "@/features/pr-detail/PRDetail";
import { FilterPanel } from "@/features/filters/FilterPanel";
import { StandupView } from "@/features/standup/StandupView";
import { PRHealthView } from "@/features/health/PRHealthView";
import { ReviewLoadView } from "@/features/review-load/ReviewLoadView";
import { MergeQueueView } from "@/features/merge-queue/MergeQueueView";
import { BlastRadiusView } from "@/features/blast-radius/BlastRadiusView";
import { useRepos } from "@/hooks/use-repos";
import { usePulls } from "@/hooks/use-pulls";
import { useClosedPulls } from "@/hooks/use-closed-pulls";
import { useFilteredPRs } from "@/hooks/use-filtered-prs";
import { useUIStore, type ViewMode } from "@/store/ui-store";
import { TOKENS } from "@/lib/design";
import type { PullRequest } from "@/types/domain";
import type { LucideIcon } from "lucide-react";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardLayout />
    </RequireAuth>
  );
}

function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Topbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <DashboardMain />
      </div>
    </div>
  );
}

const TABS: { id: ViewMode; label: string; Icon: LucideIcon }[] = [
  { id: "branches", label: "Tree", Icon: GitBranch },
  { id: "graph", label: "Graph", Icon: Network },
  { id: "standup", label: "Standup", Icon: Zap },
  { id: "merge-queue", label: "Queue", Icon: GitMerge },
  { id: "analytics", label: "Analytics", Icon: BarChart3 },
  { id: "health", label: "Health", Icon: Shield },
  { id: "review-load", label: "Load", Icon: Users },
  { id: "blast-radius", label: "Blast Radius", Icon: Target },
];

function DashboardMain() {
  const {
    view,
    setView,
    activeRepoFullName,
    setActiveRepo,
    selectedPRNumber,
    selectPR,
    filtersOpen,
  } = useUIStore();

  // Auto-pick first repo on load
  const { data: repos } = useRepos();
  useEffect(() => {
    if (!activeRepoFullName && repos && repos.length > 0) {
      setActiveRepo(repos[0]!.fullName);
    }
  }, [activeRepoFullName, repos, setActiveRepo]);

  const {
    data: prs,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePulls({ fullName: activeRepoFullName });

  // Only fetch closed PRs when the standup view is active
  const { data: closedPRs } = useClosedPulls({
    fullName: activeRepoFullName,
    enabled: view === "standup",
  });

  const filteredPRs = useFilteredPRs(prs);

  const selectedPR = useMemo(
    () => prs?.find((p) => p.number === selectedPRNumber) ?? null,
    [prs, selectedPRNumber],
  );

  return (
    <main className="flex-1 min-w-0 flex overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        <div className="p-5 space-y-4">
          {/* View tabs + meta row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1 p-0.5 rounded-md bg-surface border border-border flex-wrap">
              {TABS.map((tab) => {
                const active = view === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setView(tab.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] transition-all"
                    style={{
                      background: active ? TOKENS.surface2 : "transparent",
                      color: active ? TOKENS.text : TOKENS.textDim,
                    }}
                  >
                    <tab.Icon size={12} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-textDim">
              <span>
                <span className="text-textP">{filteredPRs.length}</span> /{" "}
                {prs?.length ?? 0} PRs
              </span>
              <span className="w-px h-3 bg-border" />
              <span className="flex items-center gap-1">
                <Hash size={11} /> live
              </span>
              <span className="flex items-center gap-1">
                <Zap
                  size={11}
                  style={{
                    color: isFetching ? TOKENS.amber : TOKENS.accent,
                  }}
                />
                {isFetching ? "syncing…" : "synced"}
              </span>
            </div>
          </div>

          {/* Summary tiles — not shown in full-page analytics-style views */}
          {view !== "analytics" &&
            view !== "health" &&
            view !== "review-load" &&
            view !== "blast-radius" &&
            filteredPRs.length > 0 && <HeroSummary prs={filteredPRs} />}

          {/* Filter panel */}
          {filtersOpen && prs && prs.length > 0 && (
            <div className="rounded-lg p-4 bg-surface border border-border animate-fade-in">
              <FilterPanel prs={prs} />
            </div>
          )}

          {/* Main content */}
          {!activeRepoFullName ? (
            <EmptyState
              Icon={Inbox}
              title="Select a repository"
              sub="Pick one from the sidebar to load its open PRs."
            />
          ) : isLoading ? (
            <Skeleton />
          ) : isError ? (
            <ErrorState
              message={
                (error as { message?: string } | null)?.message ??
                "Failed to load PRs."
              }
              onRetry={() => refetch()}
            />
          ) : prs && prs.length === 0 ? (
            <EmptyState
              Icon={GitBranch}
              title="No open PRs"
              sub="This repository has no open pull requests right now."
            />
          ) : (
            <>
              {view === "branches" && (
                <BranchHierarchyView
                  prs={filteredPRs}
                  selectedNumber={selectedPRNumber}
                  onSelect={(p: PullRequest) => selectPR(p.number)}
                />
              )}
              {view === "graph" && (
                <StackedPRGraph
                  prs={filteredPRs}
                  selectedNumber={selectedPRNumber}
                  onSelect={(p) => selectPR(p.number)}
                />
              )}
              {view === "standup" && (
                <StandupView
                  prs={filteredPRs}
                  recentlyClosed={closedPRs ?? []}
                  selectedNumber={selectedPRNumber}
                  onSelect={(p) => selectPR(p.number)}
                />
              )}
              {view === "merge-queue" && (
                <MergeQueueView
                  prs={filteredPRs}
                  selectedNumber={selectedPRNumber}
                  onSelect={(p) => selectPR(p.number)}
                />
              )}
              {view === "analytics" && (
                <AnalyticsView prs={filteredPRs} />
              )}
              {view === "health" && (
                <PRHealthView
                  prs={filteredPRs}
                  selectedNumber={selectedPRNumber}
                  onSelect={(p) => selectPR(p.number)}
                />
              )}
              {view === "review-load" && (
                <ReviewLoadView
                  prs={filteredPRs}
                  onSelect={(p) => selectPR(p.number)}
                />
              )}
              {view === "blast-radius" && (
                <BlastRadiusView
                  prs={filteredPRs}
                  fullName={activeRepoFullName}
                  selectedNumber={selectedPRNumber}
                  onSelect={(p) => selectPR(p.number)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* PR detail drawer */}
      {selectedPR && prs && (
        <div className="w-[380px] shrink-0 hidden lg:block overflow-y-auto">
          <PRDetail
            pr={selectedPR}
            allPRs={prs}
            fullName={activeRepoFullName}
            onClose={() => selectPR(null)}
          />
        </div>
      )}
    </main>
  );
}

/* ─── shared pieces ─────────────────────────────────────────────────────── */

function HeroSummary({ prs }: { prs: PullRequest[] }) {
  const ready = prs.filter((p) => p.status === "ready").length;
  const blocked = prs.filter((p) => p.status === "blocked").length;
  const conflicts = prs.filter((p) => p.conflicts).length;
  const aged = prs.filter((p) => p.isAged).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <SummaryTile
        label="Ready to merge"
        value={ready}
        accent={TOKENS.accent}
        Icon={CheckCircle2}
      />
      <SummaryTile
        label="Blocked"
        value={blocked}
        accent={TOKENS.red}
        Icon={AlertTriangle}
      />
      <SummaryTile
        label="Conflicts"
        value={conflicts}
        accent={TOKENS.amber}
        Icon={GitMerge}
      />
      <SummaryTile
        label="Aged > 3 days"
        value={aged}
        accent={TOKENS.violet}
        Icon={Clock}
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-32 rounded-lg bg-surface border border-border animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyState({
  Icon,
  title,
  sub,
}: {
  Icon: LucideIcon;
  title: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg p-12 text-center bg-surface border border-border">
      <Icon
        size={28}
        className="mx-auto mb-4"
        style={{ color: TOKENS.textMute }}
      />
      <div className="text-[15px] font-medium text-textP mb-1">{title}</div>
      <div className="text-[12.5px] text-textDim">{sub}</div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg p-12 text-center bg-surface border border-border">
      <AlertTriangle
        size={28}
        className="mx-auto mb-4"
        style={{ color: TOKENS.red }}
      />
      <div className="text-[15px] font-medium text-textP mb-1">
        Could not load PRs
      </div>
      <div className="text-[12.5px] text-textDim font-mono mb-4">
        {message}
      </div>
      <button
        onClick={onRetry}
        className="text-[12px] font-medium px-3 py-1.5 rounded"
        style={{ background: TOKENS.accent, color: TOKENS.bg }}
      >
        Retry
      </button>
    </div>
  );
}

"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { fetchBranches, fetchBranchDetail } from "@/lib/github/pulls";
import type { PullRequest, BranchSummary } from "@/types/domain";

export function useBranchesDetail(
  fullName: string | null,
  openPRs: PullRequest[],
  defaultBranch = "main",
): { branches: BranchSummary[]; isLoading: boolean } {
  const parts = fullName?.split("/") ?? [];
  const owner = parts[0];
  const repo = parts[1];
  const enabled = !!owner && !!repo;

  const { data: basicList, isLoading: listLoading } = useQuery({
    queryKey: ["branches", fullName],
    enabled,
    staleTime: 2 * 60_000,
    queryFn: () => fetchBranches({ owner: owner!, repo: repo! }),
  });

  // Cap at 30 to avoid rate limits
  const capped = basicList?.slice(0, 30) ?? [];

  const detailResults = useQueries({
    queries: capped.map((b) => ({
      queryKey: ["branch-detail", fullName, b.name],
      enabled: enabled && capped.length > 0,
      staleTime: 3 * 60_000,
      queryFn: () =>
        fetchBranchDetail({ owner: owner!, repo: repo!, branch: b.name }),
    })),
  });

  const isLoading = listLoading || detailResults.some((r) => r.isLoading);

  // Build open PR head branch lookup
  const openPRByHead = new Map<string, number>();
  for (const pr of openPRs) {
    openPRByHead.set(pr.branch, pr.number);
  }

  const now = Date.now();

  const branches: BranchSummary[] = detailResults
    .map((result, idx) => {
      const basic = capped[idx];
      if (!basic) return null;

      const detail = result.data;
      const sha = detail?.commit.sha ?? basic.commit.sha;
      const rawDate = detail?.commit.commit.author?.date ?? null;
      const ageHours = rawDate
        ? (now - new Date(rawDate).getTime()) / 3_600_000
        : 0;
      const message = detail?.commit.commit.message ?? "";
      const firstLine = message.split("\n")[0] ?? "";
      const author = detail?.commit.commit.author?.name ?? "";
      const prNumber = openPRByHead.get(basic.name) ?? null;

      return {
        name: basic.name,
        lastCommitSha: sha.slice(0, 7),
        lastCommitMessage: firstLine.slice(0, 60),
        lastCommitAuthor: author,
        lastCommitDate: rawDate ?? "",
        ageHours,
        isDefault: basic.name === defaultBranch,
        isProtected: basic.protected,
        isStale: ageHours > 14 * 24,
        hasOpenPR: prNumber !== null,
        openPRNumber: prNumber,
      } satisfies BranchSummary;
    })
    .filter((b): b is BranchSummary => b !== null);

  // Sort: default first, then non-stale alphabetically, then stale alphabetically
  branches.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    if (!a.isStale && b.isStale) return -1;
    if (a.isStale && !b.isStale) return 1;
    return a.name.localeCompare(b.name);
  });

  return { branches, isLoading };
}

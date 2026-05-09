"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBranchComparison } from "@/lib/github/pulls";

export interface DriftResult {
  driftCommits: number;
  uniqueCommits: number;
  status: "ahead" | "behind" | "diverged" | "identical";
  level: "none" | "low" | "medium" | "high";
}

export function useDrift({
  fullName,
  prBranch,
  defaultBranch,
  enabled = true,
}: {
  fullName: string | null;
  prBranch: string;
  defaultBranch: string;
  enabled?: boolean;
}) {
  return useQuery<DriftResult>({
    queryKey: ["drift", fullName, prBranch, defaultBranch],
    staleTime: 5 * 60_000,
    enabled: !!fullName && !!prBranch && !!defaultBranch && enabled,
    queryFn: async (): Promise<DriftResult> => {
      if (!fullName) {
        return { driftCommits: 0, uniqueCommits: 0, status: "identical", level: "none" };
      }
      const [owner, repo] = fullName.split("/");
      if (!owner || !repo) {
        return { driftCommits: 0, uniqueCommits: 0, status: "identical", level: "none" };
      }
      const cmp = await fetchBranchComparison({
        owner,
        repo,
        base: prBranch,
        head: defaultBranch,
      });
      const drift = cmp.ahead_by;
      const level: DriftResult["level"] =
        drift === 0 ? "none" : drift <= 5 ? "low" : drift <= 20 ? "medium" : "high";
      return {
        driftCommits: drift,
        uniqueCommits: cmp.behind_by,
        status: cmp.status,
        level,
      };
    },
  });
}

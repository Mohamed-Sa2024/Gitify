"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchClosedPulls } from "@/lib/github/pulls";
import { enrichPR } from "@/lib/pr-analysis";
import type { PullRequest } from "@/types/domain";

/**
 * Fetch the 30 most-recently-updated closed PRs for a repo.
 * Only activated when `enabled` is true (e.g. standup view is active)
 * to avoid unnecessary API calls when the view isn't visible.
 */
export function useClosedPulls({
  fullName,
  enabled: enabledProp = true,
}: {
  fullName: string | null;
  enabled?: boolean;
}) {
  return useQuery<PullRequest[]>({
    enabled: !!fullName && enabledProp,
    queryKey: ["closed-pulls", fullName],
    staleTime: 3 * 60_000,
    queryFn: async () => {
      if (!fullName) return [];
      const parts = fullName.split("/");
      const owner = parts[0];
      const repo = parts[1];
      if (!owner || !repo) return [];

      const list = await fetchClosedPulls({ owner, repo });
      // Enrich without reviews/checks — we only need merged_at + basic fields
      return list.map((pr) => enrichPR({ pr, reviews: [], checkRuns: [] }));
    },
  });
}

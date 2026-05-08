"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchPulls,
  fetchPullDetail,
  fetchPullReviews,
  fetchCheckRuns,
} from "@/lib/github/pulls";
import { enrichPR, buildStacks } from "@/lib/pr-analysis";
import type { PullRequest } from "@/types/domain";

interface UsePullsArgs {
  fullName: string | null;
}

/**
 * Coordinated fetch:
 *   1. List PRs (one request)
 *   2. For each PR, fan out detail + reviews + check-runs in parallel
 *   3. Enrich each into a PullRequest
 *   4. Detect stacks across the set
 *
 * We hit the per-PR detail endpoint because the list endpoint omits
 * `additions`/`deletions`/`mergeable`. Failures of any one auxiliary
 * call fall back gracefully (e.g. checks empty → CI = "none").
 */
export function usePulls({ fullName }: UsePullsArgs) {
  return useQuery<PullRequest[]>({
    enabled: !!fullName,
    queryKey: ["pulls", fullName],
    staleTime: 60_000,
    refetchInterval: 90_000,
    queryFn: async () => {
      if (!fullName) return [];
      const [owner, repo] = fullName.split("/");
      if (!owner || !repo) return [];

      const list = await fetchPulls({ owner, repo, state: "open" });
      if (list.length === 0) return [];

      const enrichments = await Promise.all(
        list.map(async (listPr) => {
          const [detail, reviews, checks] = await Promise.all([
            fetchPullDetail({ owner, repo, number: listPr.number }).catch(
              () => listPr, // fall back to list shape if detail fails
            ),
            fetchPullReviews({ owner, repo, number: listPr.number }).catch(
              () => [],
            ),
            fetchCheckRuns({ owner, repo, sha: listPr.head.sha }).catch(() => ({
              total_count: 0,
              check_runs: [],
            })),
          ]);
          return enrichPR({
            pr: detail,
            reviews,
            checkRuns: checks.check_runs,
          });
        }),
      );

      return buildStacks(enrichments);
    },
  });
}

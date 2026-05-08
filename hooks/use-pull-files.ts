"use client";

import { useQueries } from "@tanstack/react-query";
import { fetchPullFiles } from "@/lib/github/pulls";
import type { PullRequest, FileChange } from "@/types/domain";

/**
 * Fan out one /pulls/{n}/files request per PR and return a map of
 * PR number → FileChange[]. Results are cached for 5 min so the blast-radius
 * view doesn't hammer the API on every render.
 */
export function usePullFiles(
  prs: PullRequest[],
  fullName: string | null,
): { filesByPR: Map<number, FileChange[]>; isLoading: boolean } {
  const parts = fullName?.split("/") ?? [];
  const owner = parts[0];
  const repo = parts[1];
  const enabled = !!owner && !!repo;

  const results = useQueries({
    queries: prs.map((pr) => ({
      queryKey: ["pull-files", fullName, pr.number],
      enabled,
      staleTime: 5 * 60_000,
      queryFn: async (): Promise<FileChange[]> => {
        if (!owner || !repo) return [];
        const files = await fetchPullFiles({ owner, repo, number: pr.number });
        return files.map((f) => ({
          filename: f.filename,
          directory: f.filename.includes("/")
            ? f.filename.split("/").slice(0, -1).join("/")
            : ".",
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
        }));
      },
    })),
  });

  const filesByPR = new Map<number, FileChange[]>();
  const isLoading = results.some((r) => r.isLoading);

  results.forEach((result, idx) => {
    const pr = prs[idx];
    if (!pr || !result.data) return;
    filesByPR.set(pr.number, result.data);
  });

  return { filesByPR, isLoading };
}

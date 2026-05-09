"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBranches } from "@/lib/github/pulls";
import type { GhBranch } from "@/types/github";

export function useBranches(fullName: string | null): {
  branches: GhBranch[];
  isLoading: boolean;
} {
  const parts = fullName?.split("/") ?? [];
  const owner = parts[0];
  const repo = parts[1];

  const { data, isLoading } = useQuery({
    queryKey: ["branches", fullName],
    enabled: !!owner && !!repo,
    staleTime: 2 * 60_000,
    queryFn: () => fetchBranches({ owner: owner!, repo: repo! }),
  });

  return { branches: data ?? [], isLoading };
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPullFiles } from "@/lib/github/pulls";
import type { GhPullFile } from "@/types/github";

export function useDiff(
  fullName: string | null,
  number: number | null,
): { files: GhPullFile[]; isLoading: boolean; isError: boolean } {
  const parts = fullName?.split("/") ?? [];
  const owner = parts[0];
  const repo = parts[1];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pull-files", fullName, number],
    enabled: !!owner && !!repo && number !== null,
    staleTime: 5 * 60_000,
    queryFn: () =>
      fetchPullFiles({ owner: owner!, repo: repo!, number: number! }),
  });

  return { files: data ?? [], isLoading, isError };
}

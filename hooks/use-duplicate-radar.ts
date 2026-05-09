"use client";

import { useQuery } from "@tanstack/react-query";
import type { DuplicatePair, DuplicateRadarResult, PullRequest } from "@/types/domain";

interface RawPair {
  prANumber?: number;
  prBNumber?: number;
  similarity?: string;
  reason?: string;
}

interface RawRadarJSON {
  pairs?: RawPair[];
}

export function useDuplicateRadar({
  prs,
  enabled = false,
}: {
  prs: PullRequest[];
  enabled?: boolean;
}) {
  return useQuery<DuplicateRadarResult>({
    queryKey: ["duplicate-radar", prs.map((p) => p.number).join(",")],
    staleTime: 10 * 60_000,
    enabled: enabled && prs.length >= 2,
    queryFn: async (): Promise<DuplicateRadarResult> => {
      const prSummaries = prs
        .slice(0, 40)
        .map(
          (p) =>
            `PR #${p.number}: "${p.title}" | base: ${p.base} | files: ${p.changedFiles} | author: ${p.authorLogin} | desc: ${(p.body ?? "").slice(0, 120).replace(/\n/g, " ")}`,
        )
        .join("\n");

      const prompt = `You are analyzing a list of open Pull Requests to detect duplicate or overlapping work.
Open PRs:
${prSummaries}
Identify pairs of PRs that appear to be solving similar or overlapping problems. Consider:
- Similar titles or descriptions suggesting the same fix
- Both PRs likely touching the same area of the codebase
- One PR possibly superseding or duplicating another's work
- Two PRs implementing the same feature from different angles
Return a JSON object:
{
  "pairs": [
    {
      "prANumber": 42,
      "prBNumber": 67,
      "similarity": "high" | "medium",
      "reason": "One sentence explaining why these two PRs appear to overlap"
    }
  ]
}
Rules:
- Only include pairs with genuine overlap concern, not superficial similarity
- "high" similarity: very likely solving the same problem
- "medium" similarity: meaningfully overlapping scope worth discussing
- Return an empty pairs array if no significant overlap is found
- Do not return more than 10 pairs
Respond ONLY with valid JSON. No markdown, no backticks, no explanation outside the JSON object.`;

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens: 1000 }),
      });
      const { text } = (await response.json()) as { text: string };
      try {
        const parsed = JSON.parse(text) as RawRadarJSON;
        const pairs: DuplicatePair[] = (parsed.pairs ?? []).map((p) => ({
          prANumber: p.prANumber ?? 0,
          prBNumber: p.prBNumber ?? 0,
          similarity: p.similarity === "high" ? "high" : "medium",
          reason: p.reason ?? "",
        }));
        return {
          pairs,
          analyzedCount: Math.min(prs.length, 40),
          generatedAt: Date.now(),
        };
      } catch {
        return { pairs: [], analyzedCount: 0, generatedAt: Date.now() };
      }
    },
  });
}

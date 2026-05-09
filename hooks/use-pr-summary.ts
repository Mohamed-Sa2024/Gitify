"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPullFiles } from "@/lib/github/pulls";
import type { PRSummaryResult } from "@/types/domain";

interface RawSummaryJSON {
  aiSummary?: string;
  descriptionMatch?: string;
  mismatchReason?: string;
}

export function usePRSummary({
  fullName,
  prNumber,
  prTitle,
  prBody,
  enabled = true,
}: {
  fullName: string | null;
  prNumber: number;
  prTitle: string;
  prBody: string | null;
  enabled?: boolean;
}) {
  return useQuery<PRSummaryResult>({
    queryKey: ["pr-summary", fullName, prNumber],
    staleTime: 15 * 60_000,
    enabled: !!fullName && enabled,
    queryFn: async (): Promise<PRSummaryResult> => {
      const fallback: PRSummaryResult = {
        aiSummary: "",
        descriptionMatch: "no-description",
        generatedAt: Date.now(),
      };
      if (!fullName) return fallback;
      const [owner, repo] = fullName.split("/");
      if (!owner || !repo) return fallback;

      const files = await fetchPullFiles({ owner, repo, number: prNumber });
      const fileSummary = files
        .slice(0, 30)
        .map((f) => `${f.status} ${f.filename} (+${f.additions} -${f.deletions})`)
        .join("\n");

      const hasDescription = !!prBody && prBody.trim().length > 10;
      const prompt = `You are analyzing a GitHub Pull Request.
PR Title: ${prTitle}
PR Description: ${hasDescription ? prBody : "(none provided)"}
Files changed:
${fileSummary}
Return a JSON object:
{
  "aiSummary": "2-3 sentence plain-English summary of what this PR actually does, derived from the file changes",
  "descriptionMatch": "match" | "mismatch" | "no-description",
  "mismatchReason": "if mismatch, one sentence explaining what the code does that the description doesn't mention — omit this field otherwise"
}
descriptionMatch rules:
- "no-description" if no description was provided
- "match" if the description accurately reflects the file changes
- "mismatch" if the code changes are significantly broader, narrower, or different from the description
Respond ONLY with valid JSON. No markdown, no backticks, no explanation outside the JSON object.`;

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens: 1000 }),
      });
      const { text } = (await response.json()) as { text: string };
      try {
        const parsed = JSON.parse(text) as RawSummaryJSON;
        const match = parsed.descriptionMatch;
        return {
          aiSummary: parsed.aiSummary ?? "",
          descriptionMatch:
            match === "match" || match === "mismatch" ? match : "no-description",
          mismatchReason: parsed.mismatchReason,
          generatedAt: Date.now(),
        };
      } catch {
        return { ...fallback, aiSummary: text.slice(0, 200) };
      }
    },
  });
}

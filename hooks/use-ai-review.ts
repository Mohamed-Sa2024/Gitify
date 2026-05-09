"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPullFiles } from "@/lib/github/pulls";
import type { AIReviewResult, AIFinding } from "@/types/domain";

interface RawFinding {
  severity?: string;
  file?: string;
  title?: string;
  description?: string;
}

interface RawReviewJSON {
  summary?: string;
  findings?: RawFinding[];
}

function severityOf(s: string | undefined): AIFinding["severity"] {
  if (s === "critical") return "critical";
  if (s === "warning") return "warning";
  return "suggestion";
}

export function useAIReview({
  fullName,
  prNumber,
  prTitle,
  prBody,
  enabled = false,
}: {
  fullName: string | null;
  prNumber: number;
  prTitle: string;
  prBody: string | null;
  enabled?: boolean;
}) {
  return useQuery<AIReviewResult>({
    queryKey: ["ai-review", fullName, prNumber],
    staleTime: 10 * 60_000,
    enabled: !!fullName && enabled,
    queryFn: async (): Promise<AIReviewResult> => {
      if (!fullName) {
        return { summary: "", findings: [], generatedAt: Date.now() };
      }
      const [owner, repo] = fullName.split("/");
      if (!owner || !repo) {
        return { summary: "", findings: [], generatedAt: Date.now() };
      }
      const files = await fetchPullFiles({ owner, repo, number: prNumber });
      const top20 = files.slice(0, 20);
      const fileContent = top20
        .map((f) => {
          const patchSnippet = f.patch
            ? f.patch.slice(0, 800) + (f.patch.length > 800 ? "\n... (truncated)" : "")
            : "(binary or no diff available)";
          return `### ${f.filename} (+${f.additions} -${f.deletions})\n${patchSnippet}`;
        })
        .join("\n\n");
      const prompt = `You are a senior software engineer conducting a code review.
PR Title: ${prTitle}
PR Description: ${prBody ?? "(none)"}
Changed files and diffs:
${fileContent}
Analyze this PR and return a JSON object with:
{
  "summary": "2-3 sentence plain-English summary of what this PR actually does",
  "findings": [
    {
      "severity": "critical" | "warning" | "suggestion",
      "file": "path/to/file.ts",
      "title": "short issue title",
      "description": "clear explanation of the issue and how to fix it"
    }
  ]
}
Focus on: potential bugs, unhandled error cases, security issues, missing null checks, performance problems, and clear deviations from good practice. Do not comment on style or formatting. Return at most 10 findings. If the code looks clean, return an empty findings array.
Respond ONLY with valid JSON. No markdown, no backticks, no explanation outside the JSON object.`;
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens: 1000 }),
      });
      const { text } = (await response.json()) as { text: string };
      try {
        const parsed = JSON.parse(text) as RawReviewJSON;
        const findings: AIFinding[] = (parsed.findings ?? []).map((f) => ({
          severity: severityOf(f.severity),
          file: f.file ?? "unknown",
          title: f.title ?? "Untitled finding",
          description: f.description ?? "",
        }));
        return {
          summary: parsed.summary ?? "",
          findings,
          generatedAt: Date.now(),
        };
      } catch {
        return {
          summary: text.slice(0, 300),
          findings: [],
          generatedAt: Date.now(),
        };
      }
    },
  });
}

"use client";

import { AlertTriangle, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { TOKENS } from "@/lib/design";
import { usePRSummary } from "@/hooks/use-pr-summary";

interface Props {
  fullName: string;
  prNumber: number;
  prTitle: string;
  prBody: string | null;
}

export function PRSummaryCard({ fullName, prNumber, prTitle, prBody }: Props) {
  const { data, isLoading } = usePRSummary({
    fullName,
    prNumber,
    prTitle,
    prBody,
  });

  if (isLoading) {
    return (
      <div
        className="rounded-lg px-4 py-3 flex items-center gap-2"
        style={{ background: TOKENS.surface2, border: `1px solid ${TOKENS.border}` }}
      >
        <Loader2 size={12} className="animate-spin" style={{ color: TOKENS.accent }} />
        <span className="text-[11.5px] font-mono text-textDim">
          Generating summary…
        </span>
      </div>
    );
  }

  if (!data?.aiSummary) return null;

  const matchColor =
    data.descriptionMatch === "mismatch"
      ? TOKENS.amber
      : data.descriptionMatch === "no-description"
        ? TOKENS.textMute
        : TOKENS.accent;

  const MatchIcon =
    data.descriptionMatch === "mismatch" ? AlertTriangle : CheckCircle2;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${TOKENS.border}` }}
    >
      {/* Summary */}
      <div
        className="flex items-start gap-2.5 px-4 py-3"
        style={{ background: TOKENS.surface2 }}
      >
        <FileText
          size={12}
          className="mt-0.5 shrink-0"
          style={{ color: TOKENS.accent }}
        />
        <p className="text-[12px] leading-relaxed text-textDim">{data.aiSummary}</p>
      </div>

      {/* Description match indicator */}
      {data.descriptionMatch !== "no-description" && (
        <div
          className="flex items-start gap-2 px-4 py-2.5 border-t border-border"
          style={{ background: `${matchColor}0a` }}
        >
          <MatchIcon
            size={11}
            className="mt-0.5 shrink-0"
            style={{ color: matchColor }}
          />
          <div>
            <span className="text-[10.5px] font-mono" style={{ color: matchColor }}>
              {data.descriptionMatch === "match"
                ? "Description matches code changes"
                : "Description mismatch"}
            </span>
            {data.mismatchReason && (
              <p className="text-[11px] text-textDim mt-0.5">{data.mismatchReason}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

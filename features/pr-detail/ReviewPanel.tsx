"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { TOKENS } from "@/lib/design";
import { submitReview } from "@/lib/github/pulls";
import type { PullRequest } from "@/types/domain";
import type { GhReviewEvent } from "@/types/github";

interface Props {
  pr: PullRequest;
  fullName: string;
}

const EVENT_CONFIG: { event: GhReviewEvent; label: string; color: string }[] = [
  { event: "APPROVE", label: "Approve", color: TOKENS.accent },
  { event: "REQUEST_CHANGES", label: "Request changes", color: TOKENS.red },
  { event: "COMMENT", label: "Comment", color: TOKENS.blue },
];

export function ReviewPanel({ pr, fullName }: Props) {
  const queryClient = useQueryClient();
  const [event, setEvent] = useState<GhReviewEvent>("APPROVE");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const bodyRequired = event === "REQUEST_CHANGES" || event === "COMMENT";
    if (bodyRequired && !body.trim()) {
      setValidationError("A comment body is required for this review type.");
      return;
    }
    setValidationError(null);
    setError(null);

    const parts = fullName.split("/");
    const owner = parts[0];
    const repo = parts[1];
    if (!owner || !repo) return;

    setSubmitting(true);
    try {
      await submitReview({ owner, repo, number: pr.number, event, body });
      await queryClient.invalidateQueries({ queryKey: ["pulls", fullName] });
      setBody("");
      setEvent("APPROVE");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosErr.response?.data?.message ?? axiosErr.message ?? "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 border-t border-border">
      <span className="text-[11px] font-mono uppercase tracking-wider text-textDim block mb-3">
        Submit review
      </span>

      {/* Event selector */}
      <div className="flex items-center gap-2 mb-3">
        {EVENT_CONFIG.map(({ event: e, label, color }) => (
          <button
            key={e}
            onClick={() => setEvent(e)}
            className="text-[11px] font-mono px-2 py-0.5 rounded transition-all"
            style={{
              background: event === e ? `${color}18` : TOKENS.surface2,
              border: `1px solid ${event === e ? `${color}55` : TOKENS.border}`,
              color: event === e ? color : TOKENS.textDim,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={submitting}
        placeholder="Add a review comment…"
        rows={3}
        className="w-full px-3 py-2 rounded text-[12px] font-mono outline-none resize-none min-h-[80px] focus:border-accent transition-colors"
        style={{
          background: TOKENS.surface2,
          border: `1px solid ${validationError ? TOKENS.red : TOKENS.border}`,
          color: TOKENS.text,
        }}
      />

      {validationError && (
        <p className="text-[11px] font-mono mt-1" style={{ color: TOKENS.red }}>
          {validationError}
        </p>
      )}

      {/* Submit row */}
      <div className="flex items-center justify-between mt-3">
        <div>
          {error && (
            <p className="text-[11px] font-mono" style={{ color: TOKENS.red }}>
              {error}
            </p>
          )}
          {success && (
            <span className="flex items-center gap-1 text-[11px] font-mono" style={{ color: TOKENS.accent }}>
              <CheckCircle2 size={12} /> Submitted!
            </span>
          )}
        </div>
        <button
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-[12px] font-medium transition-all"
          style={{
            background: submitting ? TOKENS.surface2 : TOKENS.accent,
            color: submitting ? TOKENS.textMute : TOKENS.bg,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? (
            <><Loader2 size={12} className="animate-spin" /> Submitting…</>
          ) : (
            "Submit →"
          )}
        </button>
      </div>
    </div>
  );
}

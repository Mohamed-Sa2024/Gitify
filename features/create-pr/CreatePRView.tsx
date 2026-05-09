"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { TOKENS } from "@/lib/design";
import { useBranches } from "@/hooks/use-branches";
import { createPull } from "@/lib/github/pulls";
import { useUIStore } from "@/store/ui-store";

interface Props {
  fullName: string;
  defaultBranch: string;
  onClose: () => void;
}

export function CreatePRView({ fullName, defaultBranch, onClose }: Props) {
  const queryClient = useQueryClient();
  const { selectPR } = useUIStore();
  const { branches, isLoading: branchesLoading } = useBranches(fullName);

  const [title, setTitle] = useState("");
  const [base, setBase] = useState(defaultBranch);
  const [head, setHead] = useState("");
  const [body, setBody] = useState("");
  const [draft, setDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const parts = fullName.split("/");
  const owner = parts[0] ?? "";
  const repo = parts[1] ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    if (!head) { setError("Head branch is required."); return; }
    if (head === base) { setError("Head and base branches must differ."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const newPR = await createPull({
        owner,
        repo,
        payload: { title: title.trim(), head, base, body: body || undefined, draft },
      });
      await queryClient.invalidateQueries({ queryKey: ["pulls", fullName] });
      selectPR(newPR.number);
      onClose();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosErr.response?.data?.message ?? axiosErr.message ?? "Failed to create PR");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-[600px] mx-4 rounded-xl border"
        style={{ background: TOKENS.surface, borderColor: TOKENS.borderHi }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: TOKENS.border }}>
          <span className="text-[14px] font-semibold" style={{ color: TOKENS.text }}>
            New Pull Request
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/5"
            style={{ color: TOKENS.textDim }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider" style={{ color: TOKENS.textDim }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              placeholder="PR title"
              className="w-full px-3 py-2 rounded text-[14px] outline-none"
              style={{
                background: TOKENS.surface2,
                border: `1px solid ${TOKENS.border}`,
                color: TOKENS.text,
              }}
            />
          </div>

          {/* Base branch */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider" style={{ color: TOKENS.textDim }}>
              Merge into
            </label>
            <select
              value={base}
              onChange={(e) => setBase(e.target.value)}
              disabled={submitting || branchesLoading}
              className="w-full px-3 py-2 rounded text-[13px] outline-none font-mono"
              style={{
                background: TOKENS.surface2,
                border: `1px solid ${TOKENS.border}`,
                color: TOKENS.text,
              }}
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name} style={{ background: TOKENS.surface2 }}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Head branch */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider" style={{ color: TOKENS.textDim }}>
              From branch
            </label>
            <select
              value={head}
              onChange={(e) => setHead(e.target.value)}
              disabled={submitting || branchesLoading}
              className="w-full px-3 py-2 rounded text-[13px] outline-none font-mono"
              style={{
                background: TOKENS.surface2,
                border: `1px solid ${TOKENS.border}`,
                color: TOKENS.text,
              }}
            >
              <option value="" style={{ background: TOKENS.surface2 }}>
                — select branch —
              </option>
              {branches
                .filter((b) => b.name !== base)
                .map((b) => (
                  <option key={b.name} value={b.name} style={{ background: TOKENS.surface2 }}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider" style={{ color: TOKENS.textDim }}>
              Description
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={submitting}
              placeholder="Describe your changes…"
              rows={5}
              className="w-full px-3 py-2 rounded text-[12px] outline-none font-mono resize-none min-h-[120px]"
              style={{
                background: TOKENS.surface2,
                border: `1px solid ${TOKENS.border}`,
                color: TOKENS.text,
              }}
            />
          </div>

          {/* Draft toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={draft}
              onChange={(e) => setDraft(e.target.checked)}
              disabled={submitting}
              className="rounded"
              style={{ accentColor: TOKENS.accent }}
            />
            <span className="text-[12.5px]" style={{ color: TOKENS.textDim }}>
              Open as draft
            </span>
          </label>

          {/* Error */}
          {error && (
            <div
              className="text-[12px] font-mono px-3 py-2 rounded"
              style={{ background: `${TOKENS.red}14`, color: TOKENS.red, border: `1px solid ${TOKENS.red}22` }}
            >
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded text-[12px] font-medium"
              style={{
                background: "transparent",
                border: `1px solid ${TOKENS.border}`,
                color: TOKENS.textDim,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded text-[12px] font-medium"
              style={{
                background: submitting ? TOKENS.surface2 : TOKENS.accent,
                color: submitting ? TOKENS.textMute : TOKENS.bg,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? (
                <><Loader2 size={13} className="animate-spin" /> Creating…</>
              ) : (
                "Create PR →"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

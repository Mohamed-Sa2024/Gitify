"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { TOKENS } from "@/lib/design";
import { useDiff } from "@/hooks/use-diff";
import type { GhPullFile } from "@/types/github";

interface Props {
  fullName: string;
  prNumber: number;
}

// ── Unified diff parser ───────────────────────────────────────────────────────

type LineKind = "hunk" | "add" | "del" | "ctx";

interface DiffLine {
  kind: LineKind;
  oldNum: number | null;
  newNum: number | null;
  content: string;
}

function parsePatch(patch: string): DiffLine[] {
  const lines = patch.split("\n");
  const result: DiffLine[] = [];
  let oldNum = 0;
  let newNum = 0;

  for (const raw of lines) {
    if (raw.startsWith("\\")) continue; // "No newline at end of file"

    const hunkMatch = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      oldNum = parseInt(hunkMatch[1] ?? "0", 10);
      newNum = parseInt(hunkMatch[2] ?? "0", 10);
      result.push({ kind: "hunk", oldNum: null, newNum: null, content: raw });
      continue;
    }

    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      result.push({ kind: "add", oldNum: null, newNum, content: raw.slice(1) });
      newNum++;
    } else if (raw.startsWith("-") && !raw.startsWith("---")) {
      result.push({ kind: "del", oldNum, newNum: null, content: raw.slice(1) });
      oldNum++;
    } else {
      result.push({ kind: "ctx", oldNum, newNum, content: raw.slice(1) });
      oldNum++;
      newNum++;
    }
  }

  return result;
}

// ── File card ─────────────────────────────────────────────────────────────────

function FileDiff({ file }: { file: GhPullFile }) {
  const total = file.additions + file.deletions;
  const [collapsed, setCollapsed] = useState(total > 300);

  const statusColor =
    file.status === "added"
      ? TOKENS.accent
      : file.status === "removed"
        ? TOKENS.red
        : TOKENS.blue;

  const lines = file.patch ? parsePatch(file.patch) : null;

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: TOKENS.border }}>
      {/* File header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
        style={{ background: TOKENS.surface }}
      >
        {collapsed ? (
          <ChevronRight size={12} style={{ color: TOKENS.textMute }} />
        ) : (
          <ChevronDown size={12} style={{ color: TOKENS.textMute }} />
        )}
        <span
          className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
          style={{ color: statusColor, background: `${statusColor}14`, border: `1px solid ${statusColor}22` }}
        >
          {file.status}
        </span>
        <span className="font-mono text-[12px] flex-1 truncate" style={{ color: TOKENS.text }}>
          {file.filename}
        </span>
        <span className="font-mono text-[11px] shrink-0" style={{ color: TOKENS.accent }}>
          +{file.additions}
        </span>
        <span className="font-mono text-[11px] ml-1 shrink-0" style={{ color: TOKENS.red }}>
          -{file.deletions}
        </span>
      </button>

      {!collapsed && (
        <div style={{ background: TOKENS.bg, borderTop: `1px solid ${TOKENS.border}` }}>
          {!lines ? (
            <div className="px-4 py-3 text-[11.5px] font-mono" style={{ color: TOKENS.textMute }}>
              Binary file or diff not available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, idx) => (
                    <DiffLineRow key={idx} line={line} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiffLineRow({ line }: { line: DiffLine }) {
  if (line.kind === "hunk") {
    return (
      <tr style={{ background: "rgba(96,165,250,0.08)" }}>
        <td colSpan={3} className="px-3 py-0.5">
          <span className="font-mono text-[11px]" style={{ color: "#60a5fa" }}>
            {line.content}
          </span>
        </td>
      </tr>
    );
  }

  const bg =
    line.kind === "add"
      ? "rgba(200,255,62,0.08)"
      : line.kind === "del"
        ? "rgba(248,113,113,0.08)"
        : "transparent";

  const textColor =
    line.kind === "add"
      ? "rgba(200,255,62,0.8)"
      : line.kind === "del"
        ? "rgba(248,113,113,0.8)"
        : TOKENS.textDim;

  const borderLeft =
    line.kind === "add"
      ? `2px solid ${TOKENS.accent}`
      : line.kind === "del"
        ? `2px solid ${TOKENS.red}`
        : "2px solid transparent";

  return (
    <tr style={{ background: bg, borderLeft }}>
      <td
        className="w-10 text-right font-mono text-[10.5px] px-2 select-none"
        style={{ color: TOKENS.textMute, minWidth: "2.5rem" }}
      >
        {line.oldNum ?? ""}
      </td>
      <td
        className="w-10 text-right font-mono text-[10.5px] px-2 select-none"
        style={{ color: TOKENS.textMute, minWidth: "2.5rem" }}
      >
        {line.newNum ?? ""}
      </td>
      <td className="pl-2 pr-4 py-0.5 w-full">
        <span
          className="font-mono text-[11.5px] whitespace-pre-wrap break-all"
          style={{ color: textColor }}
        >
          {line.content}
        </span>
      </td>
    </tr>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function DiffViewer({ fullName, prNumber }: Props) {
  const { files, isLoading, isError } = useDiff(fullName, prNumber);

  if (isLoading) {
    return (
      <div className="space-y-3 p-5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 rounded-lg animate-pulse border border-border"
            style={{ background: TOKENS.surface }}
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-5 flex items-center gap-3">
        <AlertCircle size={14} style={{ color: TOKENS.red }} />
        <span className="text-[12.5px]" style={{ color: TOKENS.red }}>
          Failed to load diff.
        </span>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1 text-[11px] font-mono"
          style={{ color: TOKENS.textDim }}
        >
          <RefreshCw size={11} /> retry
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="p-5 text-center text-[12.5px]" style={{ color: TOKENS.textDim }}>
        No files changed in this PR.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {files.map((file) => (
        <FileDiff key={file.filename} file={file} />
      ))}
    </div>
  );
}

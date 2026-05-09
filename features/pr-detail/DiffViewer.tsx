"use client";

import { useState, useMemo } from "react";
import Prism from "prismjs";
// Language grammars — order matters (dependencies must come first)
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-graphql";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-dart";
import "prismjs/components/prism-markdown";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Circle,
  RefreshCw,
} from "lucide-react";
import { TOKENS } from "@/lib/design";
import { useDiff } from "@/hooks/use-diff";
import type { GhPullFile } from "@/types/github";

// ── Language detection ────────────────────────────────────────────────────────

const EXT_LANG: Record<string, string> = {
  ts: "typescript", tsx: "tsx",
  js: "javascript", jsx: "jsx", mjs: "javascript", cjs: "javascript",
  py: "python", pyi: "python",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin", kts: "kotlin",
  c: "c", h: "c",
  cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp",
  cs: "csharp",
  rb: "ruby",
  html: "markup", htm: "markup", xml: "markup", svg: "markup",
  css: "css",
  scss: "scss",
  json: "json",
  yaml: "yaml", yml: "yaml",
  sh: "bash", bash: "bash", zsh: "bash",
  sql: "sql",
  md: "markdown", mdx: "markdown",
  graphql: "graphql", gql: "graphql",
  swift: "swift",
  dart: "dart",
};

function detectLang(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANG[ext] ?? "plaintext";
}

// ── Prism token flattener ─────────────────────────────────────────────────────

type FlatToken = { type: string; content: string };

function flattenTokens(stream: (string | Prism.Token)[]): FlatToken[] {
  const result: FlatToken[] = [];
  function visit(node: string | Prism.Token, inherited = "plain") {
    if (typeof node === "string") {
      if (node) result.push({ type: inherited, content: node });
    } else {
      const type = node.type;
      const content = node.content;
      if (typeof content === "string") {
        result.push({ type, content });
      } else if (Array.isArray(content)) {
        for (const child of content) visit(child, type);
      }
    }
  }
  for (const node of stream) visit(node);
  return result;
}

function tokenizeLine(code: string, lang: string): FlatToken[] {
  try {
    const grammar = Prism.languages[lang] ?? Prism.languages["plaintext"];
    if (!grammar) return [{ type: "plain", content: code }];
    const stream = Prism.tokenize(code, grammar);
    return flattenTokens(stream);
  } catch {
    return [{ type: "plain", content: code }];
  }
}

// ── VS Code Dark+ token colors ────────────────────────────────────────────────

const TC: Record<string, string> = {
  // Comments
  comment: "#6A9955",
  prolog: "#6A9955",
  doctype: "#6A9955",
  cdata: "#6A9955",
  // Keywords / control
  keyword: "#569CD6",
  "control-flow": "#C586C0",
  module: "#C586C0",
  directive: "#569CD6",
  important: "#569CD6",
  atrule: "#569CD6",
  // Strings
  string: "#CE9178",
  "template-string": "#CE9178",
  "string-interpolation": "#CE9178",
  "template-literal": "#CE9178",
  "attr-value": "#CE9178",
  char: "#CE9178",
  // Numbers
  number: "#B5CEA8",
  unit: "#B5CEA8",
  // Booleans / null / undefined
  boolean: "#569CD6",
  null: "#569CD6",
  undefined: "#4FCEFF",
  constant: "#4FC1FF",
  // Functions
  function: "#DCDCAA",
  "function-variable": "#DCDCAA",
  method: "#DCDCAA",
  "method-definition": "#DCDCAA",
  // Types / Classes
  "class-name": "#4EC9B0",
  type: "#4EC9B0",
  builtin: "#4EC9B0",
  namespace: "#4EC9B0",
  // Variables / Properties
  variable: "#9CDCFE",
  parameter: "#9CDCFE",
  property: "#9CDCFE",
  "attr-name": "#9CDCFE",
  interpolation: "#9CDCFE",
  // Operators / Punctuation
  operator: "#D4D4D4",
  punctuation: "#D4D4D4",
  // Regex
  regex: "#D16969",
  // HTML/XML tags
  tag: "#569CD6",
  "tag.punctuation": "#808080",
  // Decorators
  decorator: "#DCDCAA",
  annotation: "#DCDCAA",
  // CSS
  selector: "#D7BA7D",
  // Other
  symbol: "#CE9178",
  bold: "#D4D4D4",
  italic: "#D4D4D4",
  plain: "#D4D4D4",
};

const DEFAULT_CODE_COLOR = "#D4D4D4";

// ── Syntax-highlighted code ───────────────────────────────────────────────────

const MAX_HIGHLIGHT_LINES = 600;

function HighlightedCode({
  code,
  lang,
}: {
  code: string;
  lang: string;
}) {
  const tokens = useMemo(() => tokenizeLine(code, lang), [code, lang]);
  return (
    <>
      {tokens.map((tok, i) => (
        <span key={i} style={{ color: TC[tok.type] ?? DEFAULT_CODE_COLOR }}>
          {tok.content}
        </span>
      ))}
    </>
  );
}

// ── Diff parser ────────────────────────────────────────────────────────────────

type LineKind = "hunk" | "add" | "del" | "ctx";

interface DiffLine {
  kind: LineKind;
  oldNum: number | null;
  newNum: number | null;
  content: string;
  hunkContext?: string;
}

function parsePatch(patch: string): DiffLine[] {
  const lines = patch.split("\n");
  const result: DiffLine[] = [];
  let oldNum = 0;
  let newNum = 0;

  for (const raw of lines) {
    if (raw.startsWith("\\")) continue;

    const hunkMatch = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
    if (hunkMatch) {
      oldNum = parseInt(hunkMatch[1] ?? "0", 10);
      newNum = parseInt(hunkMatch[2] ?? "0", 10);
      result.push({
        kind: "hunk",
        oldNum: null,
        newNum: null,
        content: raw,
        hunkContext: hunkMatch[3]?.trim() ?? "",
      });
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

function extractHunkRange(raw: string): string {
  const m = raw.match(/^@@ (-\d+(?:,\d+)? \+\d+(?:,\d+)?) @@/);
  return m ? (m[1] ?? "") : "";
}

// ── Visual helpers ─────────────────────────────────────────────────────────────

function ChangeBar({ additions, deletions }: { additions: number; deletions: number }) {
  const total = additions + deletions;
  if (total === 0) return null;
  const addBlocks = Math.round((additions / total) * 5);
  const delBlocks = 5 - addBlocks;
  return (
    <span className="flex items-center gap-[3px] shrink-0">
      {Array.from({ length: addBlocks }).map((_, i) => (
        <span key={`a${i}`} className="inline-block w-[9px] h-[9px] rounded-[2px]" style={{ background: TOKENS.accent }} />
      ))}
      {Array.from({ length: delBlocks }).map((_, i) => (
        <span key={`d${i}`} className="inline-block w-[9px] h-[9px] rounded-[2px]" style={{ background: TOKENS.red }} />
      ))}
    </span>
  );
}

function FilePath({
  filename,
  status,
  previousFilename,
}: {
  filename: string;
  status: string;
  previousFilename?: string;
}) {
  const parts = filename.split("/");
  const name = parts.pop() ?? filename;
  const dir = parts.length > 0 ? parts.join("/") + "/" : "";
  return (
    <span className="font-mono text-[11.5px] flex-1 min-w-0 truncate">
      {status === "renamed" && previousFilename && (
        <>
          <span style={{ color: TOKENS.textMute }}>{previousFilename}</span>
          <span style={{ color: TOKENS.textDim }}> → </span>
        </>
      )}
      {dir && <span style={{ color: TOKENS.textMute }}>{dir}</span>}
      <span style={{ color: TOKENS.text }}>{name}</span>
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  added: TOKENS.accent,
  removed: TOKENS.red,
  modified: TOKENS.blue,
  renamed: TOKENS.violet,
  copied: TOKENS.violet,
  changed: TOKENS.amber,
};

const STATUS_LABELS: Record<string, string> = {
  added: "A", removed: "D", modified: "M",
  renamed: "R", copied: "C", changed: "M", unchanged: "U",
};

// Lang badge — shows the detected language in the file header
function LangBadge({ lang }: { lang: string }) {
  if (lang === "plaintext") return null;
  return (
    <span
      className="font-mono text-[9.5px] px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider"
      style={{
        color: TOKENS.textMute,
        background: TOKENS.surface2,
        border: `1px solid ${TOKENS.border}`,
      }}
    >
      {lang}
    </span>
  );
}

// ── Hunk header row ────────────────────────────────────────────────────────────

function HunkRow({ line }: { line: DiffLine }) {
  const range = extractHunkRange(line.content);
  const ctx = line.hunkContext;
  return (
    <tr style={{ background: "rgba(96,165,250,0.07)" }}>
      <td
        colSpan={3}
        style={{
          borderTop: "1px solid rgba(96,165,250,0.18)",
          borderBottom: "1px solid rgba(96,165,250,0.18)",
        }}
      >
        <div className="flex items-center gap-2 px-3 py-[5px]">
          <span className="font-mono text-[10.5px] tabular-nums" style={{ color: "#60a5fa" }}>
            {range}
          </span>
          {ctx && (
            <>
              <span style={{ color: "rgba(96,165,250,0.3)", fontSize: 11 }}>·</span>
              <span
                className="font-mono text-[10.5px] truncate max-w-[480px]"
                style={{ color: "rgba(96,165,250,0.55)" }}
              >
                {ctx}
              </span>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Code line row ──────────────────────────────────────────────────────────────

interface CodeRowProps {
  line: DiffLine;
  lang: string;
  highlight: boolean;
}

const ROW_STYLE: Record<Exclude<LineKind, "hunk">, { bg: string; sign: string; signColor: string; border: string }> = {
  add: { bg: "rgba(200,255,62,0.09)", sign: "+", signColor: TOKENS.accent, border: `3px solid ${TOKENS.accent}` },
  del: { bg: "rgba(248,113,113,0.09)", sign: "−", signColor: TOKENS.red, border: `3px solid ${TOKENS.red}` },
  ctx: { bg: "transparent", sign: " ", signColor: "transparent", border: "3px solid transparent" },
};

function CodeRow({ line, lang, highlight }: CodeRowProps) {
  const s = ROW_STYLE[line.kind as Exclude<LineKind, "hunk">];

  return (
    <tr style={{ background: s.bg, borderLeft: s.border }}>
      {/* Old line number */}
      <td
        className="text-right font-mono text-[10px] select-none tabular-nums px-2"
        style={{
          color: TOKENS.textMute,
          minWidth: "3rem",
          verticalAlign: "top",
          paddingTop: 3,
          paddingBottom: 3,
          userSelect: "none",
        }}
      >
        {line.oldNum ?? ""}
      </td>
      {/* New line number */}
      <td
        className="text-right font-mono text-[10px] select-none tabular-nums px-2"
        style={{
          color: TOKENS.textMute,
          minWidth: "3rem",
          borderRight: `1px solid ${TOKENS.border}`,
          verticalAlign: "top",
          paddingTop: 3,
          paddingBottom: 3,
          userSelect: "none",
        }}
      >
        {line.newNum ?? ""}
      </td>
      {/* Sign + code */}
      <td className="w-full py-[3px]">
        <div className="flex items-start">
          {/* ± sign */}
          <span
            className="font-mono text-[11px] w-5 text-center select-none shrink-0 leading-5"
            style={{ color: s.signColor, userSelect: "none" }}
          >
            {s.sign}
          </span>
          {/* Code */}
          <pre
            className="font-mono text-[12px] flex-1 leading-5 pr-6 overflow-x-visible"
            style={{ background: "transparent", margin: 0, padding: 0 }}
          >
            {highlight ? (
              <HighlightedCode code={line.content || " "} lang={lang} />
            ) : (
              <span style={{ color: DEFAULT_CODE_COLOR }}>{line.content || " "}</span>
            )}
          </pre>
        </div>
      </td>
    </tr>
  );
}

// ── File card ──────────────────────────────────────────────────────────────────

function FileDiff({
  file,
  forceExpanded,
  viewed,
  onToggleViewed,
}: {
  file: GhPullFile;
  forceExpanded?: boolean;
  viewed: boolean;
  onToggleViewed: () => void;
}) {
  const total = file.additions + file.deletions;
  const [localCollapsed, setLocalCollapsed] = useState(total > 300);

  // Auto-collapse when marked viewed, auto-expand when unmarked
  const handleToggleViewed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewed) setLocalCollapsed(true);
    onToggleViewed();
  };

  const collapsed = forceExpanded === undefined ? localCollapsed : !forceExpanded;

  const lang = useMemo(() => detectLang(file.filename), [file.filename]);
  const lines = useMemo(() => (file.patch ? parsePatch(file.patch) : null), [file.patch]);
  const codeLineCount = lines?.filter((l) => l.kind !== "hunk").length ?? 0;
  const highlight = codeLineCount <= MAX_HIGHLIGHT_LINES;

  const statusColor = STATUS_COLORS[file.status] ?? TOKENS.textDim;
  const statusLabel = STATUS_LABELS[file.status] ?? "?";

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${TOKENS.border}` }}
    >
      {/* Header */}
      <button
        onClick={() => setLocalCollapsed((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
        style={{
          background: viewed ? `rgba(200,255,62,0.04)` : TOKENS.surface,
          opacity: viewed ? 0.65 : 1,
        }}
      >
        {collapsed ? (
          <ChevronRight size={11} style={{ color: TOKENS.textMute }} className="shrink-0" />
        ) : (
          <ChevronDown size={11} style={{ color: TOKENS.textMute }} className="shrink-0" />
        )}

        {/* Status letter */}
        <span
          className="font-mono text-[10px] font-bold w-4 text-center shrink-0 select-none"
          style={{ color: statusColor }}
          title={file.status}
        >
          {statusLabel}
        </span>

        {/* Path */}
        <FilePath
          filename={file.filename}
          status={file.status}
          previousFilename={file.previous_filename}
        />

        {/* Language badge */}
        <LangBadge lang={lang} />

        {/* Change counts */}
        <span className="flex items-center gap-2 shrink-0 ml-1">
          <span className="font-mono text-[10.5px]" style={{ color: TOKENS.accent }}>
            +{file.additions}
          </span>
          <span className="font-mono text-[10.5px]" style={{ color: TOKENS.red }}>
            −{file.deletions}
          </span>
        </span>

        <ChangeBar additions={file.additions} deletions={file.deletions} />

        {/* Viewed toggle */}
        <button
          onClick={handleToggleViewed}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-mono shrink-0 transition-all hover:opacity-100"
          style={{
            marginLeft: 4,
            color: viewed ? TOKENS.accent : TOKENS.textMute,
            border: `1px solid ${viewed ? TOKENS.accent + "55" : TOKENS.border}`,
            background: viewed ? TOKENS.accent + "12" : "transparent",
          }}
          title={viewed ? "Mark as not viewed" : "Mark as viewed"}
        >
          {viewed ? (
            <CheckCircle2 size={11} />
          ) : (
            <Circle size={11} />
          )}
          Viewed
        </button>
      </button>

      {/* Body */}
      {!collapsed && (
        <div style={{ borderTop: `1px solid ${TOKENS.border}`, background: "#1e1e1e" }}>
          {!lines ? (
            <div className="px-4 py-4 font-mono text-[11px] italic" style={{ color: TOKENS.textMute }}>
              Binary file or no diff available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-full">
                <colgroup>
                  <col style={{ width: "3rem" }} />
                  <col style={{ width: "3rem" }} />
                  <col />
                </colgroup>
                <tbody>
                  {lines.map((line, idx) =>
                    line.kind === "hunk" ? (
                      <HunkRow key={idx} line={line} />
                    ) : (
                      <CodeRow key={idx} line={line} lang={lang} highlight={highlight} />
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Summary bar ────────────────────────────────────────────────────────────────

function SummaryBar({
  files,
  viewedCount,
  allExpanded,
  onExpandAll,
  onCollapseAll,
  onMarkAllViewed,
  onClearViewed,
}: {
  files: GhPullFile[];
  viewedCount: number;
  allExpanded: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onMarkAllViewed: () => void;
  onClearViewed: () => void;
}) {
  const totalAdd = files.reduce((s, f) => s + f.additions, 0);
  const totalDel = files.reduce((s, f) => s + f.deletions, 0);
  const allViewed = viewedCount === files.length;
  const progress = files.length > 0 ? (viewedCount / files.length) * 100 : 0;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}` }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-4 font-mono text-[11.5px]">
          <span style={{ color: TOKENS.textDim }}>
            <span style={{ color: TOKENS.text }}>{files.length}</span>{" "}
            file{files.length !== 1 ? "s" : ""} changed
          </span>
          <span style={{ color: TOKENS.accent }}>+{totalAdd}</span>
          <span style={{ color: TOKENS.red }}>−{totalDel}</span>
          <span
            className="flex items-center gap-1.5"
            style={{ color: allViewed ? TOKENS.accent : TOKENS.textDim }}
          >
            {allViewed ? <CheckCircle2 size={11} /> : <Circle size={11} />}
            {viewedCount}/{files.length} viewed
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={allViewed ? onClearViewed : onMarkAllViewed}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10.5px] font-mono transition-all"
            style={{
              color: allViewed ? TOKENS.textDim : TOKENS.accent,
              border: `1px solid ${allViewed ? TOKENS.border : TOKENS.accent + "55"}`,
              background: allViewed ? "transparent" : TOKENS.accent + "10",
            }}
          >
            {allViewed ? <Circle size={10} /> : <CheckCircle2 size={10} />}
            {allViewed ? "Clear all" : "Mark all viewed"}
          </button>
          <button
            onClick={onExpandAll}
            disabled={allExpanded}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10.5px] font-mono transition-colors disabled:opacity-40"
            style={{ color: TOKENS.textDim, border: `1px solid ${TOKENS.border}` }}
          >
            <ChevronsUpDown size={10} /> Expand all
          </button>
          <button
            onClick={onCollapseAll}
            disabled={!allExpanded}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10.5px] font-mono transition-colors disabled:opacity-40"
            style={{ color: TOKENS.textDim, border: `1px solid ${TOKENS.border}` }}
          >
            <ChevronsDownUp size={10} /> Collapse all
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] w-full" style={{ background: TOKENS.border }}>
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: allViewed ? TOKENS.accent : TOKENS.blue,
          }}
        />
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function DiffViewer({ fullName, prNumber }: { fullName: string; prNumber: number }) {
  const { files, isLoading, isError, refetch } = useDiff(fullName, prNumber);
  const [forceExpanded, setForceExpanded] = useState<boolean | undefined>(undefined);
  const [viewed, setViewed] = useState<Set<string>>(new Set());

  const toggleViewed = (filename: string) =>
    setViewed((prev) => {
      const next = new Set(prev);
      next.has(filename) ? next.delete(filename) : next.add(filename);
      return next;
    });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-10 rounded-lg animate-pulse"
            style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}` }}
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
          onClick={() => void refetch()}
          className="flex items-center gap-1 text-[11px] font-mono"
          style={{ color: TOKENS.textDim }}
        >
          <RefreshCw size={11} /> retry
        </button>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="p-5 text-center text-[12.5px]" style={{ color: TOKENS.textDim }}>
        No files changed in this PR.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <SummaryBar
        files={files}
        viewedCount={viewed.size}
        allExpanded={forceExpanded === true}
        onExpandAll={() => setForceExpanded(true)}
        onCollapseAll={() => setForceExpanded(false)}
        onMarkAllViewed={() => setViewed(new Set(files.map((f) => f.filename)))}
        onClearViewed={() => setViewed(new Set())}
      />
      {files.map((file) => (
        <FileDiff
          key={file.filename}
          file={file}
          forceExpanded={forceExpanded}
          viewed={viewed.has(file.filename)}
          onToggleViewed={() => toggleViewed(file.filename)}
        />
      ))}
    </div>
  );
}

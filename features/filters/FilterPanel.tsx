"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { TOKENS } from "@/lib/design";
import { BranchPill } from "@/components/BranchPill";
import { Avatar } from "@/components/Avatar";
import { StatusDot } from "@/components/StatusDot";
import { useFilterStore } from "@/store/filter-store";
import type { PullRequest, PRStatus } from "@/types/domain";
import type { ReactNode } from "react";

interface Props {
  prs: PullRequest[];
}

const STATUS_OPTIONS: PRStatus[] = ["ready", "review", "blocked", "draft", "merged"];

export function FilterPanel({ prs }: Props) {
  const f = useFilterStore();

  const allBases = Array.from(new Set(prs.map((p) => p.base)));
  const allAuthors = Array.from(new Set(prs.map((p) => p.authorLogin)));
  const allLabels = Array.from(
    new Set(prs.flatMap((p) => p.labels.map((l) => l.name))),
  );
  const authorAvatars = new Map(
    prs.map((p) => [p.authorLogin, p.authorAvatarUrl]),
  );

  return (
    <div className="space-y-4">
      <Group label="Base branch">
        {allBases.length === 0 && <Empty />}
        {allBases.map((b) => (
          <Chip
            key={b}
            active={f.bases.includes(b)}
            onClick={() => f.toggleArrayFilter("bases", b)}
          >
            <BranchPill name={b} />
          </Chip>
        ))}
      </Group>

      <Group label="Author">
        {allAuthors.length === 0 && <Empty />}
        {allAuthors.map((a) => (
          <Chip
            key={a}
            active={f.authors.includes(a)}
            onClick={() => f.toggleArrayFilter("authors", a)}
          >
            <Avatar login={a} url={authorAvatars.get(a)} size={16} />
            <span className="text-[11.5px]">{a}</span>
          </Chip>
        ))}
      </Group>

      <Group label="Status">
        {STATUS_OPTIONS.map((s) => (
          <Chip
            key={s}
            active={f.statuses.includes(s)}
            onClick={() => f.toggleArrayFilter("statuses", s)}
          >
            <StatusDot status={s} />
          </Chip>
        ))}
      </Group>

      {allLabels.length > 0 && (
        <Group label="Label">
          {allLabels.map((l) => (
            <Chip
              key={l}
              active={f.labels.includes(l)}
              onClick={() => f.toggleArrayFilter("labels", l)}
            >
              <span className="text-[11px] font-mono">{l}</span>
            </Chip>
          ))}
        </Group>
      )}

      <Group label="Quick">
        <Chip
          active={f.conflictsOnly}
          onClick={() => f.setBoolean("conflictsOnly", !f.conflictsOnly)}
        >
          <AlertTriangle size={11} /> <span className="text-[11.5px]">conflicts</span>
        </Chip>
        <Chip
          active={f.agedOnly}
          onClick={() => f.setBoolean("agedOnly", !f.agedOnly)}
        >
          <Clock size={11} /> <span className="text-[11.5px]">aged &gt; 3d</span>
        </Chip>
      </Group>

      {f.activeCount() > 0 && (
        <button
          onClick={f.reset}
          className="text-[11px] font-mono uppercase tracking-wider text-textDim hover:text-textP transition-colors"
        >
          clear all filters
        </button>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider mb-2 text-textMute">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Empty() {
  return <span className="text-[11px] text-textMute italic">— no values —</span>;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded transition-all"
      style={{
        background: active ? `${TOKENS.accent}18` : TOKENS.surface2,
        border: `1px solid ${active ? `${TOKENS.accent}55` : TOKENS.border}`,
        color: active ? TOKENS.accent : TOKENS.text,
      }}
    >
      {children}
    </button>
  );
}

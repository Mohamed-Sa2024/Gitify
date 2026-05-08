"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Shield,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TOKENS } from "@/lib/design";
import { Tag } from "@/components/Tag";
import type { PullRequest } from "@/types/domain";

interface Props {
  prs: PullRequest[];
}

function deriveVelocity(prs: PullRequest[]) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const opened = new Array(7).fill(0);
  const merged = new Array(7).fill(0);
  for (const p of prs) {
    const created = new Date(Date.now() - p.ageHours * 3_600_000).getDay();
    const idx = (created + 6) % 7;
    if (idx >= 0 && idx < 7) opened[idx]++;
    if (p.status === "merged") merged[idx]++;
  }
  return days.map((d, i) => ({ day: d, opened: opened[i], merged: merged[i] }));
}

export function AnalyticsView({ prs }: Props) {
  const ready = prs.filter((p) => p.status === "ready").length;
  const review = prs.filter((p) => p.status === "review").length;
  const blocked = prs.filter((p) => p.status === "blocked").length;
  const aged = prs.filter((p) => p.isAged).length;
  const velocity = useMemo(() => deriveVelocity(prs), [prs]);

  // Stub for time-to-review — in a real app this comes from review timeline events
  const reviewTime = [
    { week: "W1", hours: 18 },
    { week: "W2", hours: 14 },
    { week: "W3", hours: 22 },
    { week: "W4", hours: 11 },
    { week: "W5", hours: 9 },
    { week: "W6", hours: 12 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Ready to merge", value: ready, color: TOKENS.accent, Icon: CheckCircle2 },
          { label: "In review", value: review, color: TOKENS.blue, Icon: Eye },
          { label: "Blocked", value: blocked, color: TOKENS.red, Icon: AlertTriangle },
          { label: "Aged > 3d", value: aged, color: TOKENS.amber, Icon: Clock },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-lg p-4 bg-surface border border-border"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-textDim">
                {k.label}
              </span>
              <k.Icon size={13} style={{ color: k.color }} />
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none text-textP">
              {k.value}
            </div>
            <div className="mt-2 h-1 rounded-full overflow-hidden bg-bg">
              <div
                className="h-full"
                style={{
                  width: `${prs.length === 0 ? 0 : (k.value / prs.length) * 100}%`,
                  background: k.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg p-4 bg-surface border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={13} style={{ color: TOKENS.accent }} />
            <span className="text-[12px] font-medium text-textP">
              Velocity — last 7 days
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={velocity}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TOKENS.accent} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={TOKENS.accent} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TOKENS.blue} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={TOKENS.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={TOKENS.border} strokeDasharray="2 2" vertical={false} />
              <XAxis dataKey="day" stroke={TOKENS.textMute} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke={TOKENS.textMute} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: TOKENS.surface2,
                  border: `1px solid ${TOKENS.border}`,
                  borderRadius: 6,
                  fontSize: 11,
                }}
              />
              <Area type="monotone" dataKey="merged" stroke={TOKENS.accent} fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="opened" stroke={TOKENS.blue} fill="url(#g2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg p-4 bg-surface border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={13} style={{ color: TOKENS.accent }} />
            <span className="text-[12px] font-medium text-textP">
              Avg time-to-review (hrs)
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={reviewTime}>
              <CartesianGrid stroke={TOKENS.border} strokeDasharray="2 2" vertical={false} />
              <XAxis dataKey="week" stroke={TOKENS.textMute} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke={TOKENS.textMute} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: TOKENS.surface2,
                  border: `1px solid ${TOKENS.border}`,
                  borderRadius: 6,
                  fontSize: 11,
                }}
              />
              <Bar dataKey="hours" fill={TOKENS.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ReleaseReadiness prs={prs} />
    </div>
  );
}

function ReleaseReadiness({ prs }: { prs: PullRequest[] }) {
  const releasePRs = prs.filter((p) => p.base.startsWith("release/"));
  const allCi = releasePRs.every((p) => p.ci === "passing");
  const noConflicts = releasePRs.every((p) => !p.conflicts);
  const conflictCount = releasePRs.filter((p) => p.conflicts).length;
  const allApproved = releasePRs.every((p) => p.approvals >= 1);
  const score =
    releasePRs.length === 0
      ? 0
      : Math.round(
          ([allCi, noConflicts, allApproved].filter(Boolean).length / 3) * 100,
        );

  return (
    <div className="rounded-lg p-5 bg-surface border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={13} style={{ color: TOKENS.accent }} />
          <span className="text-[12px] font-medium text-textP">
            Release readiness
          </span>
        </div>
        <Tag
          color={
            score >= 80 ? TOKENS.accent : score >= 50 ? TOKENS.amber : TOKENS.red
          }
        >
          {score}% ready
        </Tag>
      </div>
      <div className="space-y-2.5">
        <Row label="All release PRs CI passing" done={allCi} />
        <Row
          label="No outstanding conflicts"
          done={noConflicts}
          detail={
            conflictCount > 0
              ? `${conflictCount} PR${conflictCount === 1 ? "" : "s"} with conflicts`
              : undefined
          }
        />
        <Row label="Required approvals met" done={allApproved} />
        <Row label="QA sign-off" done={false} detail="Manual gate" />
        <Row
          label="Release notes generated"
          done={false}
          detail="Auto-draft available"
        />
      </div>
    </div>
  );
}

function Row({
  label,
  done,
  detail,
}: {
  label: string;
  done: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded bg-surface2">
      <div className="flex items-center gap-2.5">
        {done ? (
          <CheckCircle2 size={13} style={{ color: TOKENS.accent }} />
        ) : (
          <Circle size={13} style={{ color: TOKENS.textMute }} />
        )}
        <span className="text-[12.5px] text-textP">{label}</span>
      </div>
      {detail && <span className="text-[11px] text-textDim">{detail}</span>}
    </div>
  );
}

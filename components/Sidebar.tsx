"use client";

import {
  Activity,
  Bot,
  Building2,
  Folder,
  Inbox,
  LayoutGrid,
  Plus,
  Star,
  User,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { NavItem } from "@/components/NavItem";
import { useRepos, useViewer } from "@/hooks/use-repos";
import { useUIStore } from "@/store/ui-store";
import { TOKENS, branchType } from "@/lib/design";
import type { RepoSummary } from "@/types/domain";

const BRANCH_LEGEND = [
  "main",
  "develop",
  "feature",
  "bugfix",
  "hotfix",
  "release",
  "chore",
];

/* ─── small repo row component ────────────────────────────────────────────── */

function RepoRow({ repo }: { repo: RepoSummary }) {
  const { activeRepoFullName, setActiveRepo } = useUIStore();
  const router = useRouter();
  const pathname = usePathname();
  const active = activeRepoFullName === repo.fullName;

  return (
    <button
      key={repo.id}
      onClick={() => {
        setActiveRepo(repo.fullName);
        if (!pathname.startsWith("/dashboard")) router.push("/dashboard");
      }}
      title={repo.fullName}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] transition-all hover:bg-white/[0.02]"
      style={{
        background: active ? TOKENS.surface2 : "transparent",
        color: active ? TOKENS.text : TOKENS.textDim,
      }}
    >
      <Folder
        size={12}
        style={{ color: active ? TOKENS.accent : TOKENS.textMute }}
      />
      <span className="truncate flex-1 text-left font-mono">
        {repo.fullName}
      </span>
      <span
        className="text-[10px] px-1 rounded font-mono text-textMute bg-bg shrink-0"
        title={`${repo.openIssuesCount} open issues + PRs`}
      >
        {repo.openIssuesCount}
      </span>
    </button>
  );
}

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: typeof Folder;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5 px-2 pt-1">
      <Icon size={10} className="text-textMute shrink-0" />
      <span className="text-[10px] font-mono uppercase tracking-wider text-textMute truncate">
        {label}
      </span>
    </div>
  );
}

/* ─── Sidebar ──────────────────────────────────────────────────────────────── */

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: repos, isLoading } = useRepos();
  const { data: viewer } = useViewer();

  const onDashboard = pathname.startsWith("/dashboard");
  const onSettings = pathname.startsWith("/settings");

  const viewerLogin = viewer?.login ?? null;

  // Group repos once data is available
  const yours =
    viewerLogin && repos
      ? repos.filter((r) => r.owner === viewerLogin)
      : [];

  // Org repos grouped by org name
  const orgMap = new Map<string, RepoSummary[]>();
  if (repos) {
    for (const r of repos) {
      if (r.owner === viewerLogin || r.ownerType !== "Organization") continue;
      const arr = orgMap.get(r.owner) ?? [];
      arr.push(r);
      orgMap.set(r.owner, arr);
    }
  }

  const collaborators =
    repos?.filter(
      (r) => r.owner !== viewerLogin && r.ownerType !== "Organization",
    ) ?? [];

  return (
    <aside className="w-[240px] shrink-0 p-3 space-y-5 bg-surface border-r border-border overflow-y-auto">
      <div>
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-textMute">
            Workspace
          </span>
        </div>
        <NavItem icon={Inbox} label="Inbox" badge="—" />
        <NavItem
          icon={LayoutGrid}
          label="Dashboard"
          active={onDashboard}
          onClick={() => router.push("/dashboard")}
        />
        <NavItem icon={Activity} label="Activity" />
        <NavItem icon={Bot} label="AI Insights" badge="new" />
        <NavItem
          icon={SettingsIcon}
          label="Settings"
          active={onSettings}
          onClick={() => router.push("/settings")}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-textMute">
            Repositories
          </span>
          <Plus size={12} className="text-textDim" />
        </div>

        {isLoading && (
          <div className="px-2 py-1.5 text-[11px] text-textMute font-mono animate-pulse">
            loading…
          </div>
        )}

        {!isLoading && repos && repos.length === 0 && (
          <div className="px-2 py-1.5 text-[11px] text-textMute italic">
            No repos available.
          </div>
        )}

        {/* Yours */}
        {yours.length > 0 && (
          <div className="mb-2">
            <SectionLabel icon={User} label="Yours" />
            {yours.map((r) => (
              <RepoRow key={r.id} repo={r} />
            ))}
          </div>
        )}

        {/* One subsection per org */}
        {Array.from(orgMap.entries()).map(([org, orgRepos]) => (
          <div key={org} className="mb-2">
            <SectionLabel icon={Building2} label={org} />
            {orgRepos.map((r) => (
              <RepoRow key={r.id} repo={r} />
            ))}
          </div>
        ))}

        {/* Collaborator repos */}
        {collaborators.length > 0 && (
          <div className="mb-2">
            <SectionLabel icon={Users} label="Collaborators" />
            {collaborators.map((r) => (
              <RepoRow key={r.id} repo={r} />
            ))}
          </div>
        )}

        {/* Flat list while viewer is loading (no grouping yet) */}
        {!viewerLogin && !isLoading && repos && repos.length > 0 && (
          <>
            {repos.slice(0, 30).map((r) => (
              <RepoRow key={r.id} repo={r} />
            ))}
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-textMute">
            Saved filters
          </span>
        </div>
        {[
          { label: "Mine — needs review" },
          { label: "Blocked PRs" },
          { label: "Stale > 3 days" },
        ].map((f) => (
          <button
            key={f.label}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12.5px] hover:bg-white/[0.02] text-textDim"
          >
            <Star size={11} className="text-textMute" />
            <span className="truncate flex-1 text-left">{f.label}</span>
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-textMute">
            Branch types
          </span>
        </div>
        <div className="space-y-1">
          {BRANCH_LEGEND.map((key) => {
            const t = branchType(key);
            return (
              <div
                key={key}
                className="flex items-center gap-2 px-2 py-1 text-[11.5px] text-textDim"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: t.color }}
                />
                <span className="font-mono">{t.label}/*</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

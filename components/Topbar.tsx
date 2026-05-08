"use client";

import { useState, type ChangeEvent } from "react";
import {
  Bell,
  ChevronRight,
  Filter,
  GitBranch,
  LogOut,
  Search,
} from "lucide-react";
import { TOKENS } from "@/lib/design";
import { Avatar } from "@/components/Avatar";
import { useFilterStore } from "@/store/filter-store";
import { useUIStore } from "@/store/ui-store";
import { useAuth } from "@/lib/auth/AuthContext";
import { useViewer } from "@/hooks/use-repos";

/**
 * Self-contained top bar:
 *  - Pulls the breadcrumb context (active repo) from the UI store
 *  - Pulls the search + filter chip count from the filter store
 *  - Pulls the viewer (for the avatar/menu) from a query hook
 */
export function Topbar() {
  const { search, setSearch, activeCount } = useFilterStore();
  const { filtersOpen, toggleFilters, activeRepoFullName } = useUIStore();
  const { signOut } = useAuth();
  const { data: viewer } = useViewer();
  const [menuOpen, setMenuOpen] = useState(false);

  const filterCount = activeCount();
  const [orgFromRepo, repoName] = (activeRepoFullName ?? "").split("/");

  return (
    <div className="sticky top-0 z-40 backdrop-blur-md border-b border-border bg-bg/90">
      <div className="flex items-center gap-4 px-5 py-3">
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: TOKENS.accent }}
          >
            <GitBranch
              size={15}
              strokeWidth={2.5}
              style={{ color: TOKENS.bg }}
            />
          </div>
          <div className="leading-tight">
            <div className="text-[13.5px] font-semibold tracking-tight">
              Git<span style={{ color: TOKENS.accent }}>ify</span>
            </div>
            <div className="text-[9.5px] font-mono uppercase tracking-widest text-textMute">
              github pr ops
            </div>
          </div>
        </div>

        <div className="w-px h-6 bg-border" />

        <div className="hidden sm:flex items-center gap-2 text-[12.5px] min-w-0">
          {orgFromRepo && (
            <span className="text-textDim shrink-0">{orgFromRepo}</span>
          )}
          {repoName && (
            <>
              <ChevronRight size={12} className="text-textMute shrink-0" />
              <span className="font-medium truncate">{repoName}</span>
            </>
          )}
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface border border-border w-[280px]">
          <Search size={13} className="text-textMute" />
          <input
            type="text"
            placeholder="Search PRs, branches, authors…"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="bg-transparent outline-none flex-1 text-[12.5px] text-textP placeholder:text-textMute"
            spellCheck={false}
          />
        </div>

        <button
          onClick={toggleFilters}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px]"
          style={{
            background: filtersOpen ? `${TOKENS.accent}18` : TOKENS.surface,
            border: `1px solid ${filtersOpen ? `${TOKENS.accent}55` : TOKENS.border}`,
            color: filtersOpen ? TOKENS.accent : TOKENS.text,
          }}
        >
          <Filter size={12} /> Filters
          {filterCount > 0 && (
            <span
              className="ml-1 px-1 rounded text-[10px] font-mono"
              style={{ background: TOKENS.accent, color: TOKENS.bg }}
            >
              {filterCount}
            </span>
          )}
        </button>

        <button
          className="p-1.5 rounded-md bg-surface border border-border text-textDim hover:text-textP transition-colors"
          aria-label="Notifications"
        >
          <Bell size={14} />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full focus-visible:outline-none"
            aria-label="Account menu"
          >
            <Avatar
              login={viewer?.login ?? "you"}
              url={viewer?.avatar_url}
              size={26}
              ringColor={TOKENS.bg}
            />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-9 z-40 w-48 rounded-md p-1 bg-surface border border-border shadow-2xl animate-fade-in">
                {viewer && (
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <div className="text-[12.5px] font-medium truncate">
                      {viewer.login}
                    </div>
                    <div className="text-[10.5px] font-mono text-textMute">
                      signed in
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    void signOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-[12.5px] text-textDim hover:bg-surface2 hover:text-textP transition-colors"
                >
                  <LogOut size={12} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

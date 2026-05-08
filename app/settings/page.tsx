"use client";

import { LogOut, Settings as SettingsIcon, Shield } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { Avatar } from "@/components/Avatar";
import { useViewer } from "@/hooks/use-repos";
import { useAuth } from "@/lib/auth/AuthContext";
import { TOKENS } from "@/lib/design";

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsLayout />
    </RequireAuth>
  );
}

function SettingsLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Topbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <SettingsMain />
      </div>
    </div>
  );
}

function SettingsMain() {
  const { data: viewer } = useViewer();
  const { signOut } = useAuth();

  return (
    <main className="flex-1 min-w-0 p-8 overflow-y-auto">
      <div className="max-w-[640px] space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon size={14} style={{ color: TOKENS.accent }} />
            <span className="text-[10.5px] font-mono uppercase tracking-wider text-textDim">
              Settings
            </span>
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight text-textP">
            Account
          </h1>
        </div>

        <Card title="Signed in as">
          {viewer ? (
            <div className="flex items-center gap-3">
              <Avatar
                login={viewer.login}
                url={viewer.avatar_url}
                size={42}
              />
              <div>
                <div className="text-[14px] font-medium text-textP">
                  {viewer.login}
                </div>
                <a
                  href={viewer.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11.5px] text-textDim font-mono hover:text-textP transition-colors"
                >
                  {viewer.html_url}
                </a>
              </div>
            </div>
          ) : (
            <div className="text-[12px] text-textMute">Loading…</div>
          )}
        </Card>

        <Card title="Security">
          <div className="space-y-3">
            <Row Icon={Shield} label="OAuth via GitHub App" sub="Refresh tokens enabled, 8h access tokens" />
            <Row
              Icon={Shield}
              label="Refresh token storage"
              sub="HttpOnly cookie, scoped to /api/auth"
            />
            <Row
              Icon={Shield}
              label="Access token storage"
              sub="In-memory only, never persisted to disk"
            />
          </div>
        </Card>

        <Card title="Session">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-[12.5px] font-medium transition-all hover:bg-white/5 text-textP border border-border"
          >
            <LogOut size={13} /> Sign out
          </button>
        </Card>
      </div>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg p-5 bg-surface border border-border">
      <div className="text-[10.5px] font-mono uppercase tracking-wider text-textDim mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  Icon,
  label,
  sub,
}: {
  Icon: typeof Shield;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={14} className="mt-0.5 shrink-0" style={{ color: TOKENS.accent }} />
      <div>
        <div className="text-[12.5px] text-textP font-medium">{label}</div>
        <div className="text-[11px] text-textDim font-mono">{sub}</div>
      </div>
    </div>
  );
}

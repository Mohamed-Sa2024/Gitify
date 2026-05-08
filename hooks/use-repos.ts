"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllReposForDashboard, fetchViewer } from "@/lib/github/repos";
import type { GhRepo, GhUser } from "@/types/github";
import type { RepoSummary } from "@/types/domain";

export function useViewer() {
  return useQuery<GhUser>({
    queryKey: ["viewer"],
    queryFn: fetchViewer,
    staleTime: 5 * 60_000,
  });
}

function toRepoSummary(r: GhRepo): RepoSummary {
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    owner: r.owner.login,
    ownerType: r.owner.type === "Organization" ? "Organization" : "User",
    defaultBranch: r.default_branch,
    openIssuesCount: r.open_issues_count,
    stargazersCount: r.stargazers_count,
    description: r.description,
  };
}

export function useRepos() {
  return useQuery<RepoSummary[]>({
    queryKey: ["repos"],
    queryFn: async (): Promise<RepoSummary[]> => {
      // Fetch repos and viewer in parallel so sorting is accurate on first load.
      const [repos, viewer] = await Promise.all([
        fetchAllReposForDashboard(),
        fetchViewer(),
      ]);

      const viewerLogin = viewer.login;
      const summaries = repos.map(toRepoSummary);

      // Sort: yours → org repos (by org name) → collaborator user repos
      summaries.sort((a, b) => {
        const aYours = a.owner === viewerLogin ? 0 : 1;
        const bYours = b.owner === viewerLogin ? 0 : 1;
        if (aYours !== bYours) return aYours - bYours;

        const aOrg = a.ownerType === "Organization" ? 0 : 1;
        const bOrg = b.ownerType === "Organization" ? 0 : 1;
        if (aOrg !== bOrg) return aOrg - bOrg;

        if (a.owner !== b.owner) return a.owner.localeCompare(b.owner);
        return a.fullName.localeCompare(b.fullName);
      });

      return summaries;
    },
    staleTime: 5 * 60_000,
  });
}

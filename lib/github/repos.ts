"use client";

import { githubClient } from "./client";
import type {
  GhInstallationReposResponse,
  GhInstallationsResponse,
  GhRepo,
  GhUser,
} from "@/types/github";

const MAX_PAGES = 10;

export async function fetchViewer(): Promise<GhUser> {
  const r = await githubClient.get<GhUser>("/user");
  return r.data;
}

/**
 * GET /user/repos — all repos the viewer can access.
 * Paginates until a page returns fewer than perPage items or MAX_PAGES is hit.
 */
export async function fetchUserRepos(opts?: {
  perPage?: number;
}): Promise<GhRepo[]> {
  const perPage = opts?.perPage ?? 100;
  const all: GhRepo[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const r = await githubClient.get<GhRepo[]>("/user/repos", {
      params: {
        sort: "pushed",
        direction: "desc",
        per_page: perPage,
        page,
        affiliation: "owner,collaborator,organization_member",
      },
    });
    all.push(...r.data);
    if (r.data.length < perPage) break;
  }

  return all;
}

/**
 * Discovers repos via GitHub App installations.
 * Classic OAuth tokens may not support `/user/installations` — failure returns [].
 */
export async function fetchReposFromGitHubAppInstallations(): Promise<
  GhRepo[]
> {
  try {
    const perPage = 100;

    // Paginate installations
    const installations: Array<{ id: number }> = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const r = await githubClient.get<GhInstallationsResponse>(
        "/user/installations",
        { params: { per_page: perPage, page } },
      );
      installations.push(...r.data.installations);
      if (r.data.installations.length < perPage) break;
    }

    // For each installation, paginate its repos
    const allRepos: GhRepo[] = [];
    for (const inst of installations) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const r = await githubClient.get<GhInstallationReposResponse>(
          `/user/installations/${inst.id}/repositories`,
          { params: { per_page: perPage, page } },
        );
        allRepos.push(...r.data.repositories);
        if (r.data.repositories.length < perPage) break;
      }
    }

    return allRepos;
  } catch {
    return [];
  }
}

/**
 * Merges user repos + installation repos, deduplicating by repo id.
 * User repos win in case of conflict (they carry richer ownership data).
 */
export async function fetchAllReposForDashboard(): Promise<GhRepo[]> {
  const [userRepos, installRepos] = await Promise.all([
    fetchUserRepos({ perPage: 100 }),
    fetchReposFromGitHubAppInstallations(),
  ]);

  const map = new Map<number, GhRepo>();
  // Install repos first so user repos overwrite on collision
  for (const r of installRepos) map.set(r.id, r);
  for (const r of userRepos) map.set(r.id, r);

  return Array.from(map.values());
}

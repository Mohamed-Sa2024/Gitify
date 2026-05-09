"use client";

import { githubClient } from "./client";
import type {
  GhBranch,
  GhBranchDetail,
  GhCheckRunsResponse,
  GhCompareResponse,
  GhCreatePRPayload,
  GhPull,
  GhPullFile,
  GhMergeResponse,
  GhReview,
  GhReviewEvent,
} from "@/types/github";

interface RepoCoord {
  owner: string;
  repo: string;
}

/**
 * GET /repos/{owner}/{repo}/pulls
 * NOTE: List endpoint omits additions/deletions/mergeable. The detail endpoint
 * has them — we fetch detail per-PR for accuracy.
 */
export async function fetchPulls({
  owner,
  repo,
  state = "open",
}: RepoCoord & { state?: "open" | "closed" | "all" }): Promise<GhPull[]> {
  const r = await githubClient.get<GhPull[]>(`/repos/${owner}/${repo}/pulls`, {
    params: { state, per_page: 100, sort: "updated", direction: "desc" },
  });
  return r.data;
}

export async function fetchPullDetail({
  owner,
  repo,
  number,
}: RepoCoord & { number: number }): Promise<GhPull> {
  const r = await githubClient.get<GhPull>(
    `/repos/${owner}/${repo}/pulls/${number}`,
  );
  return r.data;
}

export async function fetchPullReviews({
  owner,
  repo,
  number,
}: RepoCoord & { number: number }): Promise<GhReview[]> {
  const r = await githubClient.get<GhReview[]>(
    `/repos/${owner}/${repo}/pulls/${number}/reviews`,
    { params: { per_page: 100 } },
  );
  return r.data;
}

/**
 * GET /repos/{owner}/{repo}/commits/{sha}/check-runs
 * The "current" CI status is the check-runs for the PR's head SHA.
 */
export async function fetchCheckRuns({
  owner,
  repo,
  sha,
}: RepoCoord & { sha: string }): Promise<GhCheckRunsResponse> {
  const r = await githubClient.get<GhCheckRunsResponse>(
    `/repos/${owner}/${repo}/commits/${sha}/check-runs`,
    { params: { per_page: 50 } },
  );
  return r.data;
}

/** GET /repos/{owner}/{repo}/pulls/{number}/files — files changed in a PR. */
export async function fetchPullFiles({
  owner,
  repo,
  number,
}: RepoCoord & { number: number }): Promise<GhPullFile[]> {
  const r = await githubClient.get<GhPullFile[]>(
    `/repos/${owner}/${repo}/pulls/${number}/files`,
    { params: { per_page: 100 } },
  );
  return r.data;
}

/**
 * PUT /repos/{owner}/{repo}/pulls/{number}/merge
 * Requires `pull_requests: write` on the GitHub App installation.
 */
export async function mergePull({
  owner,
  repo,
  number,
  commitTitle,
  mergeMethod = "merge",
}: RepoCoord & {
  number: number;
  commitTitle?: string;
  mergeMethod?: "merge" | "squash" | "rebase";
}): Promise<GhMergeResponse> {
  const r = await githubClient.put<GhMergeResponse>(
    `/repos/${owner}/${repo}/pulls/${number}/merge`,
    {
      ...(commitTitle ? { commit_title: commitTitle } : {}),
      merge_method: mergeMethod,
    },
  );
  return r.data;
}

/**
 * Fetch the most recently updated closed PRs — used by the Standup view to
 * show what merged since yesterday.
 */
export async function fetchClosedPulls({
  owner,
  repo,
}: RepoCoord): Promise<GhPull[]> {
  const r = await githubClient.get<GhPull[]>(`/repos/${owner}/${repo}/pulls`, {
    params: {
      state: "closed",
      per_page: 30,
      sort: "updated",
      direction: "desc",
    },
  });
  return r.data;
}

/** GET /repos/{owner}/{repo}/branches */
export async function fetchBranches({
  owner,
  repo,
}: RepoCoord): Promise<GhBranch[]> {
  const r = await githubClient.get<GhBranch[]>(
    `/repos/${owner}/${repo}/branches`,
    { params: { per_page: 100 } },
  );
  return r.data;
}

/** GET /repos/{owner}/{repo}/branches/{branch} */
export async function fetchBranchDetail({
  owner,
  repo,
  branch,
}: RepoCoord & { branch: string }): Promise<GhBranchDetail> {
  const r = await githubClient.get<GhBranchDetail>(
    `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
  );
  return r.data;
}

/** DELETE /repos/{owner}/{repo}/git/refs/heads/{branch} */
export async function deleteBranch({
  owner,
  repo,
  branch,
}: RepoCoord & { branch: string }): Promise<void> {
  await githubClient.delete(
    `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
  );
}

/** POST /repos/{owner}/{repo}/pulls */
export async function createPull({
  owner,
  repo,
  payload,
}: RepoCoord & { payload: GhCreatePRPayload }): Promise<GhPull> {
  const r = await githubClient.post<GhPull>(
    `/repos/${owner}/${repo}/pulls`,
    payload,
  );
  return r.data;
}

/** POST /repos/{owner}/{repo}/pulls/{number}/reviews */
export async function submitReview({
  owner,
  repo,
  number,
  event,
  body,
}: RepoCoord & {
  number: number;
  event: GhReviewEvent;
  body: string;
}): Promise<GhReview> {
  const r = await githubClient.post<GhReview>(
    `/repos/${owner}/${repo}/pulls/${number}/reviews`,
    { event, body },
  );
  return r.data;
}

/**
 * GET /repos/{owner}/{repo}/compare/{base}...{head}
 * ahead_by = commits on defaultBranch that PR branch doesn't have = drift.
 */
export async function fetchBranchComparison({
  owner,
  repo,
  base,
  head,
}: RepoCoord & { base: string; head: string }): Promise<GhCompareResponse> {
  const r = await githubClient.get<GhCompareResponse>(
    `/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
  );
  return r.data;
}

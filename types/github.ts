/**
 * Subset of GitHub REST API types — only the fields we actually use.
 * Full schemas: https://docs.github.com/en/rest/overview/api-versions
 */

export interface GhUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  type?: "User" | "Organization";
}

export interface GhLabel {
  id: number;
  name: string;
  color: string; // hex without #
  description: string | null;
}

export interface GhRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: GhUser;
  default_branch: string;
  open_issues_count: number;
  stargazers_count: number;
  description: string | null;
  pushed_at: string | null;
  html_url: string;
}

export interface GhBranchRef {
  ref: string; // e.g. "feature/auth-ui"
  sha: string;
  repo: { name: string; full_name: string } | null;
}

export type GhPullState = "open" | "closed";
export type GhMergeableState =
  | "clean"
  | "dirty"
  | "blocked"
  | "unstable"
  | "behind"
  | "draft"
  | "unknown";

export interface GhPull {
  id: number;
  number: number;
  state: GhPullState;
  title: string;
  body: string | null;
  user: GhUser | null;
  draft: boolean;
  head: GhBranchRef;
  base: GhBranchRef;
  labels: GhLabel[];
  requested_reviewers: GhUser[];
  assignees: GhUser[];
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  closed_at: string | null;
  comments: number;
  review_comments: number;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  mergeable: boolean | null;
  mergeable_state?: GhMergeableState;
  html_url: string;
}

export type GhReviewState =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "COMMENTED"
  | "DISMISSED"
  | "PENDING";

export interface GhReview {
  id: number;
  user: GhUser | null;
  state: GhReviewState;
  submitted_at: string | null;
}

export type GhCheckConclusion =
  | "success"
  | "failure"
  | "neutral"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "action_required"
  | null;

export type GhCheckStatus = "queued" | "in_progress" | "completed";

export interface GhCheckRun {
  id: number;
  name: string;
  status: GhCheckStatus;
  conclusion: GhCheckConclusion;
}

export interface GhCheckRunsResponse {
  total_count: number;
  check_runs: GhCheckRun[];
}

export type GhFileStatus =
  | "added"
  | "modified"
  | "removed"
  | "renamed"
  | "copied"
  | "changed"
  | "unchanged";

export interface GhPullFile {
  sha: string;
  filename: string;
  status: GhFileStatus;
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  patch?: string;
}

export interface GhMergeResponse {
  sha: string;
  merged: boolean;
  message: string;
}

export interface GhInstallation {
  id: number;
  app_id: number;
  account: GhUser | null;
}

export interface GhInstallationsResponse {
  total_count: number;
  installations: GhInstallation[];
}

export interface GhInstallationReposResponse {
  total_count: number;
  repositories: GhRepo[];
}

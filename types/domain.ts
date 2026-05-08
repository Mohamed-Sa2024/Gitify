/**
 * Domain types — denormalized, UI-friendly shape derived from GhPull + reviews + checks.
 * The mapping happens in `lib/pr-analysis.ts`.
 */

export type PRStatus = "ready" | "review" | "draft" | "blocked" | "merged" | "closed";

export type CIStatus = "passing" | "failing" | "pending" | "none";

export type RiskLevel = "low" | "medium" | "high";

export type AntiPattern =
  | "NO_DESCRIPTION"
  | "NO_REVIEWERS"
  | "TOO_LARGE"
  | "NO_CI"
  | "LONG_RUNNING"
  | "STALE"
  | "EMPTY_TITLE";

export interface PRReviewer {
  login: string;
  avatarUrl: string;
  approved: boolean;
  changesRequested: boolean;
}

export interface FileChange {
  filename: string;
  directory: string;
  status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
}

export interface ReviewerLoad {
  login: string;
  avatarUrl: string;
  pendingCount: number;
  oldestPendingHours: number;
  approvedCount: number;
  changesRequestedCount: number;
  prs: PullRequest[];
}

export interface PullRequest {
  id: number;
  number: number;
  url: string;

  title: string;
  body: string | null;

  branch: string; // head.ref
  base: string; // base.ref
  /** Set if this PR's base branch matches another PR's head branch (stack detection). */
  parentNumber: number | null;

  authorLogin: string;
  authorAvatarUrl: string;
  reviewers: PRReviewer[];
  approvals: number;

  status: PRStatus;
  draft: boolean;
  conflicts: boolean;
  ci: CIStatus;

  additions: number;
  deletions: number;
  changedFiles: number;
  comments: number;
  ageHours: number;
  updatedHours: number;
  labels: { name: string; color: string }[];

  risk: RiskLevel;
  isLarge: boolean;
  isStale: boolean;
  isAged: boolean;
  antiPatterns: AntiPattern[];
}

export interface RepoSummary {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  ownerType: "User" | "Organization";
  defaultBranch: string;
  openIssuesCount: number;
  stargazersCount: number;
  description: string | null;
}

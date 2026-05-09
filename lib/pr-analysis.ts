import type {
  GhPull,
  GhReview,
  GhCheckRun,
  GhCheckConclusion,
} from "@/types/github";
import type {
  CIStatus,
  PRStatus,
  PullRequest,
  PRReviewer,
  RiskLevel,
  AntiPattern,
} from "@/types/domain";
import { hoursSince } from "./format";

/* ---------- CI ---------- */
function ciFromChecks(runs: GhCheckRun[]): CIStatus {
  if (runs.length === 0) return "none";
  if (runs.some((r) => r.status !== "completed")) return "pending";

  const failing: GhCheckConclusion[] = [
    "failure",
    "timed_out",
    "action_required",
    "cancelled",
  ];
  const conclusions = runs.map((r) => r.conclusion);
  if (conclusions.some((c) => c && failing.includes(c))) return "failing";

  if (
    conclusions.every(
      (c) => c === "success" || c === "neutral" || c === "skipped",
    )
  ) {
    return "passing";
  }
  return "pending";
}

/* ---------- Reviewers ---------- */
function buildReviewers(pr: GhPull, reviews: GhReview[]): PRReviewer[] {
  // Index latest review per user
  const latestByUser = new Map<string, GhReview>();
  for (const r of reviews) {
    if (!r.user) continue;
    const existing = latestByUser.get(r.user.login);
    if (!existing) {
      latestByUser.set(r.user.login, r);
      continue;
    }
    const a = existing.submitted_at ? Date.parse(existing.submitted_at) : 0;
    const b = r.submitted_at ? Date.parse(r.submitted_at) : 0;
    if (b > a) latestByUser.set(r.user.login, r);
  }

  // Merge requested + actual reviewers
  const result = new Map<string, PRReviewer>();
  for (const u of pr.requested_reviewers) {
    result.set(u.login, {
      login: u.login,
      avatarUrl: u.avatar_url,
      approved: false,
      changesRequested: false,
    });
  }
  for (const [login, review] of latestByUser) {
    const existing = result.get(login);
    const next: PRReviewer = existing ?? {
      login,
      avatarUrl: review.user?.avatar_url ?? "",
      approved: false,
      changesRequested: false,
    };
    next.approved = review.state === "APPROVED";
    next.changesRequested = review.state === "CHANGES_REQUESTED";
    result.set(login, next);
  }
  return Array.from(result.values());
}

/* ---------- Status derivation ---------- */
function deriveStatus(
  pr: GhPull,
  reviewers: PRReviewer[],
  ci: CIStatus,
): PRStatus {
  if (pr.merged_at) return "merged";
  if (pr.state === "closed") return "closed";
  if (pr.draft) return "draft";

  const blockers =
    pr.mergeable === false ||
    pr.mergeable_state === "dirty" ||
    pr.mergeable_state === "blocked" ||
    ci === "failing" ||
    reviewers.some((r) => r.changesRequested);

  if (blockers) return "blocked";

  const approved = reviewers.some((r) => r.approved);
  if (approved && ci !== "pending") return "ready";
  return "review";
}

/* ---------- Risk ---------- */
function deriveRisk(pr: GhPull, reviewers: PRReviewer[]): RiskLevel {
  const size = (pr.additions ?? 0) + (pr.deletions ?? 0);
  if (size > 1500 || (pr.changed_files !== undefined && pr.changed_files > 30))
    return "high";
  if (size > 500 || reviewers.length === 0) return "medium";
  return "low";
}

/* ---------- Anti-patterns ---------- */
function detectAntiPatterns(
  pr: GhPull,
  ci: CIStatus,
): AntiPattern[] {
  const patterns: AntiPattern[] = [];
  if (!pr.title || pr.title.trim() === "") patterns.push("EMPTY_TITLE");
  if (!pr.body || pr.body.trim() === "") patterns.push("NO_DESCRIPTION");
  if (pr.requested_reviewers.length === 0 && !pr.draft) patterns.push("NO_REVIEWERS");
  const size = (pr.additions ?? 0) + (pr.deletions ?? 0);
  if (size > 1000) patterns.push("TOO_LARGE");
  if (ci === "none") patterns.push("NO_CI");
  if (hoursSince(pr.created_at) > 168) patterns.push("LONG_RUNNING"); // > 1 week
  if (hoursSince(pr.updated_at) > 72 && !pr.draft) patterns.push("STALE");
  return patterns;
}

/* ============================================================================
   PUBLIC: compute momentum score
   ========================================================================== */

export function computeMomentumScore(
  status: PRStatus,
  ci: CIStatus,
  approvals: number,
  reviewerCount: number,
  conflicts: boolean,
  draft: boolean,
  updatedHours: number,
  ageHours: number,
): number {
  if (status === "merged" || status === "closed") return 0;
  let score = 0;
  // CI (30 pts)
  if (ci === "passing") score += 30;
  else if (ci === "pending") score += 10;
  // Approvals (25 pts)
  const needed = Math.max(reviewerCount, 1);
  score += Math.min(25, Math.round((approvals / needed) * 25));
  // No conflicts (20 pts)
  if (!conflicts) score += 20;
  // Recent activity (15 pts)
  if (updatedHours < 24) score += 15;
  else if (updatedHours < 48) score += 10;
  else if (updatedHours < 72) score += 5;
  // Not draft (10 pts)
  if (!draft) score += 10;
  return Math.min(100, Math.max(0, score));
}

/* ============================================================================
   PUBLIC: enrich a single PR
   ========================================================================== */

export interface EnrichInput {
  pr: GhPull;
  reviews: GhReview[];
  checkRuns: GhCheckRun[];
}

export function enrichPR({ pr, reviews, checkRuns }: EnrichInput): PullRequest {
  const reviewers = buildReviewers(pr, reviews);
  const ci = ciFromChecks(checkRuns);
  const status = deriveStatus(pr, reviewers, ci);
  const ageHours = hoursSince(pr.created_at);
  const updatedHours = hoursSince(pr.updated_at);
  const additions = pr.additions ?? 0;
  const deletions = pr.deletions ?? 0;

  return {
    id: pr.id,
    number: pr.number,
    url: pr.html_url,
    title: pr.title,
    body: pr.body,
    branch: pr.head.ref,
    base: pr.base.ref,
    parentNumber: null, // filled in by buildStacks() once we have the full set
    authorLogin: pr.user?.login ?? "ghost",
    authorAvatarUrl: pr.user?.avatar_url ?? "",
    reviewers,
    approvals: reviewers.filter((r) => r.approved).length,
    status,
    draft: pr.draft,
    conflicts: pr.mergeable === false || pr.mergeable_state === "dirty",
    ci,
    additions,
    deletions,
    changedFiles: pr.changed_files ?? 0,
    comments: pr.comments + pr.review_comments,
    ageHours,
    updatedHours,
    labels: pr.labels.map((l) => ({ name: l.name, color: `#${l.color}` })),
    risk: deriveRisk(pr, reviewers),
    isLarge: additions + deletions > 1000,
    isStale: updatedHours > 48,
    isAged: ageHours > 72,
    antiPatterns: detectAntiPatterns(pr, ci),
    momentumScore: computeMomentumScore(
      status,
      ci,
      reviewers.filter((r) => r.approved).length,
      reviewers.length,
      pr.mergeable === false || pr.mergeable_state === "dirty",
      pr.draft,
      updatedHours,
      ageHours,
    ),
  };
}

/* ============================================================================
   PUBLIC: detect stack relationships across an enriched PR set
   ----------------------------------------------------------------------------
   A PR `child` is "stacked on" PR `parent` when:
     child.base === parent.branch
   This is the canonical Graphite/Stacked PR pattern.
   ========================================================================== */
export function buildStacks(prs: PullRequest[]): PullRequest[] {
  // Index by branch (head.ref) — unique per repo for open PRs
  const byHead = new Map<string, PullRequest>();
  for (const p of prs) byHead.set(p.branch, p);

  return prs.map((p) => {
    const parent = byHead.get(p.base);
    return parent && parent.number !== p.number
      ? { ...p, parentNumber: parent.number }
      : p;
  });
}

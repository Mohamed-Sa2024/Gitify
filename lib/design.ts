/**
 * Design tokens for places Tailwind can't reach — SVG fills, recharts colors,
 * inline styles in dynamic components. Mirror values in tailwind.config.js.
 */
export const TOKENS = {
  bg: "#0a0a0c",
  surface: "#111114",
  surface2: "#15151a",
  border: "#1f1f24",
  borderHi: "#2a2a31",
  text: "#e8e8ec",
  textDim: "#8a8a93",
  textMute: "#5a5a63",
  accent: "#c8ff3e",
  accentDim: "#9bcc2e",
  red: "#f87171",
  amber: "#fbbf24",
  blue: "#60a5fa",
  violet: "#a78bfa",
  green: "#34d399",
  pink: "#f472b6",
} as const;

export interface BranchTheme {
  color: string;
  bg: string;
  label: string;
}

const BRANCH_THEME_MAP: Record<string, BranchTheme> = {
  main: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", label: "main" },
  master: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", label: "master" },
  develop: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", label: "develop" },
  feature: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", label: "feature" },
  feat: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", label: "feat" },
  bugfix: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", label: "bugfix" },
  fix: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", label: "fix" },
  hotfix: { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "hotfix" },
  release: { color: "#34d399", bg: "rgba(52,211,153,0.12)", label: "release" },
  chore: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", label: "chore" },
  refactor: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", label: "refactor" },
};

const FALLBACK: BranchTheme = {
  color: "#94a3b8",
  bg: "rgba(148,163,184,0.12)",
  label: "other",
};

/**
 * Classify a branch by its first path segment.
 * "feature/auth-ui" → feature theme; "main" → main theme; "weird-branch" → fallback.
 */
export function branchType(name: string): BranchTheme {
  if (!name) return FALLBACK;
  const head = name.split("/")[0]?.toLowerCase() ?? "";
  return BRANCH_THEME_MAP[head] ?? FALLBACK;
}

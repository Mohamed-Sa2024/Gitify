export function hoursSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 3_600_000));
}

export function relativeAge(hours: number): string {
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function initials(login: string): string {
  return login
    .split(/[.\-_ ]/)
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Stable, deterministic color from a string — fallback when GitHub avatar fails.
 */
export function colorFromLogin(login: string): string {
  let hash = 0;
  for (let i = 0; i < login.length; i++) {
    hash = (hash << 5) - hash + login.charCodeAt(i);
    hash |= 0;
  }
  const palette = ["#f472b6", "#60a5fa", "#fbbf24", "#34d399", "#a78bfa", "#f87171"];
  return palette[Math.abs(hash) % palette.length] ?? palette[0]!;
}

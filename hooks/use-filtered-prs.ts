"use client";

import { useMemo } from "react";
import type { PullRequest } from "@/types/domain";
import { useFilterStore } from "@/store/filter-store";

export function useFilteredPRs(prs: PullRequest[] | undefined): PullRequest[] {
  const f = useFilterStore();

  return useMemo(() => {
    if (!prs) return [];

    const q = f.search.trim().toLowerCase();

    return prs.filter((p) => {
      if (q) {
        const hay =
          `${p.title} ${p.branch} ${p.base} ${p.authorLogin} #${p.number}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (f.bases.length && !f.bases.includes(p.base)) return false;
      if (f.authors.length && !f.authors.includes(p.authorLogin)) return false;
      if (f.statuses.length && !f.statuses.includes(p.status)) return false;
      if (
        f.labels.length &&
        !f.labels.some((l) => p.labels.some((x) => x.name === l))
      ) {
        return false;
      }
      if (f.conflictsOnly && !p.conflicts) return false;
      if (f.agedOnly && !p.isAged) return false;
      return true;
    });
  }, [prs, f]);
}

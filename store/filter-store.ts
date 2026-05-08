"use client";

import { create } from "zustand";
import type { PRStatus } from "@/types/domain";

export interface PRFilters {
  search: string;
  bases: string[];
  authors: string[];
  statuses: PRStatus[];
  labels: string[];
  conflictsOnly: boolean;
  agedOnly: boolean;
}

interface FilterState extends PRFilters {
  setSearch: (q: string) => void;
  toggleArrayFilter: <K extends "bases" | "authors" | "statuses" | "labels">(
    key: K,
    value: PRFilters[K][number],
  ) => void;
  setBoolean: (key: "conflictsOnly" | "agedOnly", value: boolean) => void;
  reset: () => void;
  /** Count of currently-applied filters (excluding search). */
  activeCount: () => number;
}

const initial: PRFilters = {
  search: "",
  bases: [],
  authors: [],
  statuses: [],
  labels: [],
  conflictsOnly: false,
  agedOnly: false,
};

export const useFilterStore = create<FilterState>((set, get) => ({
  ...initial,
  setSearch: (search) => set({ search }),
  toggleArrayFilter: (key, value) =>
    set((s) => {
      const arr = s[key] as readonly unknown[];
      const has = arr.includes(value);
      const next = has ? arr.filter((v) => v !== value) : [...arr, value];
      return { [key]: next } as Partial<FilterState>;
    }),
  setBoolean: (key, value) => set({ [key]: value } as Partial<FilterState>),
  reset: () => set({ ...initial }),
  activeCount: () => {
    const s = get();
    return (
      s.bases.length +
      s.authors.length +
      s.statuses.length +
      s.labels.length +
      (s.conflictsOnly ? 1 : 0) +
      (s.agedOnly ? 1 : 0)
    );
  },
}));

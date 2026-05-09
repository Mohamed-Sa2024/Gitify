"use client";

import { create } from "zustand";

export type ViewMode =
  | "branches"
  | "graph"
  | "standup"
  | "merge-queue"
  | "analytics"
  | "health"
  | "review-load"
  | "blast-radius"
  | "branches-mgmt";

interface UIState {
  view: ViewMode;
  setView: (v: ViewMode) => void;

  selectedPRNumber: number | null;
  selectPR: (n: number | null) => void;

  filtersOpen: boolean;
  toggleFilters: () => void;
  setFiltersOpen: (open: boolean) => void;

  activeRepoFullName: string | null;
  setActiveRepo: (full: string | null) => void;

  createPROpen: boolean;
  setCreatePROpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: "branches",
  setView: (view) => set({ view }),

  selectedPRNumber: null,
  selectPR: (selectedPRNumber) => set({ selectedPRNumber }),

  filtersOpen: false,
  toggleFilters: () => set((s) => ({ filtersOpen: !s.filtersOpen })),
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),

  activeRepoFullName: null,
  setActiveRepo: (activeRepoFullName) =>
    set({ activeRepoFullName, selectedPRNumber: null }),

  createPROpen: false,
  setCreatePROpen: (createPROpen) => set({ createPROpen }),
}));

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_RECENT_SEARCHES = 8;

type SearchHistoryState = {
  recent: string[];
  addSearch: (term: string) => void;
  removeSearch: (term: string) => void;
  clear: () => void;
};

/** Personal "recent searches" — local to this browser, same as the cart.
 * There's no server-side per-user history: search_logs (see
 * search_logs_and_trending migration) is separate and only powers the
 * anonymous, aggregated "trending searches" suggestions. */
export const useSearchHistory = create<SearchHistoryState>()(
  persist(
    (set) => ({
      recent: [],
      addSearch: (term) =>
        set((s) => {
          const clean = term.trim();
          if (clean.length < 2) return s;
          const withoutDupe = s.recent.filter((t) => t.toLowerCase() !== clean.toLowerCase());
          return { recent: [clean, ...withoutDupe].slice(0, MAX_RECENT_SEARCHES) };
        }),
      removeSearch: (term) => set((s) => ({ recent: s.recent.filter((t) => t !== term) })),
      clear: () => set({ recent: [] }),
    }),
    { name: "shop-search-history", version: 1 },
  ),
);

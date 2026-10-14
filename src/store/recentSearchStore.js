import { create } from 'zustand';

const MAX_RECENT = 8;

export const useRecentSearchStore = create((set) => ({
  recentSearches: [],
  addSearch: (term) => set((state) => {
    const trimmed = term.trim();
    if (!trimmed) return state;
    const deduped = state.recentSearches.filter(
      (entry) => entry.toLowerCase() !== trimmed.toLowerCase(),
    );
    return { recentSearches: [trimmed, ...deduped].slice(0, MAX_RECENT) };
  }),
  clearSearches: () => set({ recentSearches: [] }),
}));

export default useRecentSearchStore;

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_RECENT = 8;

export const useRecentSearchStore = create(
  persist(
    (set) => ({
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
    }),
    {
      name: 'board:recent-search-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useRecentSearchStore;

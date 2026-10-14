import { queryKeys, queueChange } from '../services/queryClient';
import { createAccountStore } from './accountStore';

// Your recent searches, newest first. Server data (GET /api/me/searches),
// cached by TanStack Query — see store/accountStore.js.
const MAX_RECENT = 8;

const SEARCHES = { invalidate: [queryKeys.searches] };

export const useRecentSearchStore = createAccountStore({
  queryKey: queryKeys.searches,
  initial: { recentSearches: [] },
  actions: ({ get, set }) => ({
    addSearch: (term) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      const deduped = get().recentSearches.filter(
        (entry) => entry.toLowerCase() !== trimmed.toLowerCase(),
      );
      set({ recentSearches: [trimmed, ...deduped].slice(0, MAX_RECENT) });
      queueChange('POST', '/me/searches', { term: trimmed }, SEARCHES);
    },
    clearSearches: () => {
      set({ recentSearches: [] });
      queueChange('DELETE', '/me/searches', undefined, SEARCHES);
    },
  }),
});

export default useRecentSearchStore;

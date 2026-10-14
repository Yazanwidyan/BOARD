import { queryKeys, queueChange } from '../services/queryClient';
import { createAccountStore } from './accountStore';

// Onboarding and pick preferences — part of the account's settings
// (GET /api/me/settings), cached by TanStack Query; see store/accountStore.js.
export const DEFAULT_PREFERENCES = {
  genres: [],
  minRating: 7.0,
  decade: 'Any',
  runtime: 'Any',
};

const patchSettings = (changes) =>
  queueChange('PATCH', '/me/settings', changes, {
    merge: 'settings',
    invalidate: [queryKeys.settings],
  });

export const useUserStore = createAccountStore({
  queryKey: queryKeys.settings,
  initial: {
    hasCompletedOnboarding: false,
    preferences: DEFAULT_PREFERENCES,
  },
  view: (settings) => ({
    hasCompletedOnboarding: settings.hasCompletedOnboarding,
    preferences: { ...DEFAULT_PREFERENCES, ...settings.preferences },
  }),
  actions: ({ get, set }) => {
    const setOnboarded = (hasCompletedOnboarding) => {
      set({ hasCompletedOnboarding });
      patchSettings({ hasCompletedOnboarding });
    };
    const savePreferences = (preferences) => {
      set({ preferences });
      patchSettings({ preferences });
    };
    return {
      completeOnboarding: () => setOnboarded(true),
      replayOnboarding: () => setOnboarded(false),
      setPreferences: (preferences) =>
        savePreferences({ ...get().preferences, ...preferences }),
      resetPreferences: () => savePreferences(DEFAULT_PREFERENCES),
    };
  },
});

export default useUserStore;

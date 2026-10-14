import { create } from 'zustand';

export const DEFAULT_PREFERENCES = {
  genres: [],
  minRating: 7.0,
  decade: 'Any',
  runtime: 'Any',
};

export const useUserStore = create((set) => ({
  hasCompletedOnboarding: false,
  hasSeeded: false,
  preferences: DEFAULT_PREFERENCES,

  completeOnboarding: () => set({ hasCompletedOnboarding: true }),
  markSeeded: () => set({ hasSeeded: true }),
  replayOnboarding: () => set({ hasCompletedOnboarding: false }),
  setPreferences: (preferences) => set((state) => ({
    preferences: { ...state.preferences, ...preferences },
  })),
  resetPreferences: () => set({ preferences: DEFAULT_PREFERENCES }),
}));

export default useUserStore;

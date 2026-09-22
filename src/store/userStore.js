import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_PREFERENCES = {
  genres: [],
  minRating: 7.0,
  decade: 'Any',
  runtime: 'Any',
};

export const useUserStore = create(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      preferences: DEFAULT_PREFERENCES,

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      replayOnboarding: () => set({ hasCompletedOnboarding: false }),
      setPreferences: (preferences) => set((state) => ({
        preferences: { ...state.preferences, ...preferences },
      })),
      resetPreferences: () => set({ preferences: DEFAULT_PREFERENCES }),
    }),
    {
      name: 'urwatch:user-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useUserStore;

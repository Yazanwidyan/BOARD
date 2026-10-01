import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useChallengeStore = create(
  persist(
    (set, get) => ({
      activeChallenge: null, // the accepted challenge object, or null
      history: [], // [{ ...challenge, status: 'completed' | 'skipped', resolvedAt }]

      acceptChallenge: (challenge) => set({ activeChallenge: challenge }),

      // "Give Me Another" during generation never touches history — only a
      // challenge that was actually accepted (then skipped or completed)
      // counts toward the Challenge Hunter/Master badges.
      skipChallenge: () => set((state) => {
        if (!state.activeChallenge) return {};
        return {
          activeChallenge: null,
          history: [
            { ...state.activeChallenge, status: 'skipped', resolvedAt: Date.now() },
            ...state.history,
          ],
        };
      }),

      // Called wherever a movie is marked watched. Completes the active
      // challenge only if this is actually its target — returns the
      // completed challenge (for a completion celebration) or null.
      checkAutoCompletion: (movieId) => {
        const { activeChallenge, history } = get();
        if (!activeChallenge || activeChallenge.targetMovieId !== movieId) {
          return null;
        }
        const completed = { ...activeChallenge, status: 'completed', resolvedAt: Date.now() };
        set({ activeChallenge: null, history: [completed, ...history] });
        return completed;
      },

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'board:challenge-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useChallengeStore;

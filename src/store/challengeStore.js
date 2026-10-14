import { queryKeys, queueChange } from '../services/queryClient';
import { createAccountStore } from './accountStore';

// Your active challenge and the ones you've finished or skipped. Server
// data (GET /api/me/challenges), cached by TanStack Query — see
// store/accountStore.js.
const CHALLENGES = { invalidate: [queryKeys.challenges] };

export const useChallengeStore = createAccountStore({
  queryKey: queryKeys.challenges,
  initial: {
    activeChallenge: null, // the accepted challenge object, or null
    history: [], // [{ ...challenge, status: 'completed' | 'skipped', resolvedAt }]
  },
  actions: ({ get, set }) => ({
    acceptChallenge: (challenge) => {
      set({ activeChallenge: challenge });
      queueChange('POST', '/me/challenges/active', { challenge }, CHALLENGES);
    },

    // "Give Me Another" during generation never touches history — only a
    // challenge that was actually accepted (then skipped or completed)
    // counts toward the Challenge Hunter/Master badges.
    skipChallenge: () => {
      const { activeChallenge, history } = get();
      if (!activeChallenge) return;
      set({
        activeChallenge: null,
        history: [{ ...activeChallenge, status: 'skipped', resolvedAt: Date.now() }, ...history],
      });
      queueChange('POST', '/me/challenges/active/skip', undefined, CHALLENGES);
    },

    // Called wherever a movie is marked watched. Completes the active
    // challenge only if this is actually its target — returns the
    // completed challenge (for a completion celebration) or null. Nothing
    // to send: the server completes it itself when the movie is marked
    // watched.
    checkAutoCompletion: (movieId) => {
      const { activeChallenge, history } = get();
      if (!activeChallenge || activeChallenge.targetMovieId !== movieId) {
        return null;
      }
      const completed = { ...activeChallenge, status: 'completed', resolvedAt: Date.now() };
      set({ activeChallenge: null, history: [completed, ...history] });
      return completed;
    },

    clearHistory: () => {
      set({ history: [] });
      queueChange('DELETE', '/me/challenges/history', undefined, CHALLENGES);
    },
  }),
});

export default useChallengeStore;

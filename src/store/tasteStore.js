import { queryKeys, queueChange } from "../services/queryClient";
import { createAccountStore } from "./accountStore";

// The taste signals beyond a tier (see utils/tasteEngine):
//
//   aspects   why you tiered something the way you did — one tap of
//             "the twist", "the visuals"… on a good tier, or "too slow",
//             "too bleak"… on a bad one. { [movieId]: [aspectKey] }
//   passes    movies you skipped (Swipe, "not this one") — weak negatives
//             that fade with time. [{ movieId, at }], newest first, capped.
//   leanings  onboarding's "this or that" answers: per Taste DNA dimension
//             (data/vibes DIMENSIONS order), -1 leans low, 1 leans high,
//             0 no preference. null until answered.
//
// Server data (GET /api/me/taste), cached by TanStack Query — see
// store/accountStore.js.
const MAX_PASSES = 300;

const TASTE = { invalidate: [queryKeys.taste] };

export const useTasteStore = createAccountStore({
  queryKey: queryKeys.taste,
  initial: { aspects: {}, passes: [], leanings: null },
  actions: ({ get, set }) => ({
    setLeanings: (leanings) => {
      set({ leanings });
      queueChange(
        "PUT",
        "/me/taste/leanings",
        { leanings: leanings ?? null },
        { merge: "leanings", ...TASTE },
      );
    },

    setAspects: (movieId, keys) => {
      const next = { ...get().aspects };
      if (keys.length > 0) next[movieId] = keys;
      else delete next[movieId];
      set({ aspects: next });
      queueChange(
        "PUT",
        `/me/taste/aspects/${movieId}`,
        { aspects: keys },
        {
          merge: `aspects:${movieId}`,
          ...TASTE,
        },
      );
    },

    recordPass: (movieId) => {
      set((state) => ({
        passes: [
          { movieId, at: Date.now() },
          ...state.passes.filter((pass) => pass.movieId !== movieId),
        ].slice(0, MAX_PASSES),
      }));
      queueChange("POST", "/me/taste/passes", { movieId }, TASTE);
    },

    clearTaste: () => {
      set({ aspects: {}, passes: [], leanings: null });
      queueChange("DELETE", "/me/taste", undefined, TASTE);
    },
  }),
});

export const recordPass = (movieId) =>
  useTasteStore.getState().recordPass(movieId);

export default useTasteStore;

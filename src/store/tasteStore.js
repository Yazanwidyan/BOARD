import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
const MAX_PASSES = 300;

export const useTasteStore = create(
  persist(
    (set) => ({
      aspects: {},
      passes: [],
      leanings: null,

      setLeanings: (leanings) => set({ leanings }),

      setAspects: (movieId, keys) =>
        set((state) => {
          const next = { ...state.aspects };
          if (keys.length > 0) next[movieId] = keys;
          else delete next[movieId];
          return { aspects: next };
        }),

      recordPass: (movieId) =>
        set((state) => ({
          passes: [
            { movieId, at: Date.now() },
            ...state.passes.filter((pass) => pass.movieId !== movieId),
          ].slice(0, MAX_PASSES),
        })),

      clearTaste: () => set({ aspects: {}, passes: [], leanings: null }),
    }),
    {
      name: "board:taste-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const recordPass = (movieId) =>
  useTasteStore.getState().recordPass(movieId);

export default useTasteStore;

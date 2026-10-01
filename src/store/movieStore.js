import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useMovieStore = create(
  persist(
    (set) => ({
      bucketList: [], // manually curated "want to watch someday" — [{ movieId, addedAt }]
      pickedMovie: null, // single movie id — approved after a pick session
      // [{ movieId, timestamp, rating: 0.5-5 in 0.5 steps | null, watchCount }]
      // One entry per movie, never duplicated — a rewatch bumps watchCount
      // and timestamp on the same entry rather than adding a second one, so
      // every existing "one entry per movie" assumption elsewhere (badges,
      // XP, collections, the Library grid's keying by movie id) keeps
      // working untouched. watchCount is absent on entries created before
      // this existed; every reader treats that as 1 via `?? 1`.
      watched: [],
      // Collection ids the user explicitly chose to track from the "See
      // All Collections" browser, before having watched anything in them —
      // a manual opt-in layered on top of the automatic "you've watched
      // something in it" unlock, same OR relationship as a watchlist pick.
      unlockedCollections: [],

      toggleUnlockedCollection: (collectionId) => set((state) => ({
        unlockedCollections: state.unlockedCollections.includes(collectionId)
          ? state.unlockedCollections.filter((id) => id !== collectionId)
          : [...state.unlockedCollections, collectionId],
      })),

      toggleBucketList: (movieId) => set((state) => {
        const isInList = state.bucketList.some((entry) => entry.movieId === movieId);
        return {
          bucketList: isInList
            ? state.bucketList.filter((entry) => entry.movieId !== movieId)
            : [...state.bucketList, { movieId, addedAt: Date.now() }],
        };
      }),

      // Only one movie can be "the pick" at a time — approving a new one
      // replaces whatever was there before.
      togglePickedMovie: (movieId) => set((state) => ({
        pickedMovie: state.pickedMovie === movieId ? null : movieId,
      })),

      // Marking something watched graduates it off the watchlist and
      // clears it as the current pick, since "want to watch" / "picked"
      // and "watched" shouldn't both hold.
      toggleWatched: (movieId) => set((state) => {
        const isWatched = state.watched.some((entry) => entry.movieId === movieId);
        if (isWatched) {
          return { watched: state.watched.filter((entry) => entry.movieId !== movieId) };
        }
        return {
          watched: [
            { movieId, timestamp: Date.now(), rating: null, watchCount: 1 },
            ...state.watched,
          ],
          bucketList: state.bucketList.filter((entry) => entry.movieId !== movieId),
          pickedMovie: state.pickedMovie === movieId ? null : state.pickedMovie,
        };
      }),

      setWatchedRating: (movieId, rating) => set((state) => ({
        watched: state.watched.map((entry) => (
          entry.movieId === movieId ? { ...entry, rating } : entry
        )),
      })),

      // Distinct from toggleWatched on purpose — a rewatch of something
      // already watched, not a re-mark. Bumps timestamp to now too, so it
      // surfaces in "Recently Watched" the same way a first watch would;
      // you just watched it again, that's genuinely recent activity.
      rewatchMovie: (movieId) => set((state) => {
        const existing = state.watched.find((entry) => entry.movieId === movieId);
        if (!existing) return {};
        const updated = {
          ...existing,
          watchCount: (existing.watchCount ?? 1) + 1,
          timestamp: Date.now(),
        };
        return {
          watched: [
            updated,
            ...state.watched.filter((entry) => entry.movieId !== movieId),
          ],
        };
      }),

      clearBucketList: () => set({ bucketList: [] }),
      clearPickedMovie: () => set({ pickedMovie: null }),
      clearWatched: () => set({ watched: [] }),
      clearUnlockedCollections: () => set({ unlockedCollections: [] }),
    }),
    {
      name: 'board:movie-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useMovieStore;

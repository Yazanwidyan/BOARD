import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useMovieStore = create(
  persist(
    (set) => ({
      bucketList: [], // manually curated "want to watch someday"
      pickedMovie: null, // single movie id — approved after a pick session
      watched: [], // [{ movieId, timestamp, rating: 0.5-5 in 0.5 steps | null }]

      toggleBucketList: (movieId) => set((state) => {
        const isInList = state.bucketList.includes(movieId);
        return {
          bucketList: isInList
            ? state.bucketList.filter((id) => id !== movieId)
            : [...state.bucketList, movieId],
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
          watched: [{ movieId, timestamp: Date.now(), rating: null }, ...state.watched],
          bucketList: state.bucketList.filter((id) => id !== movieId),
          pickedMovie: state.pickedMovie === movieId ? null : state.pickedMovie,
        };
      }),

      setWatchedRating: (movieId, rating) => set((state) => ({
        watched: state.watched.map((entry) => (
          entry.movieId === movieId ? { ...entry, rating } : entry
        )),
      })),

      clearBucketList: () => set({ bucketList: [] }),
      clearPickedMovie: () => set({ pickedMovie: null }),
      clearWatched: () => set({ watched: [] }),
    }),
    {
      name: 'urwatch:movie-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useMovieStore;

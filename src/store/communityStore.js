import { useQuery } from "@tanstack/react-query";

import { rememberMovies } from "../data/movies";
import { api } from "../services/api";
import { queryKeys } from "../services/queryClient";
import { useAuthStore } from "./authStore";

// What everyone on ReelBoard thinks — totals only, never who (GET
// /api/community/…). Plain TanStack queries, cached and saved on the device.

const useSignedIn = () => useAuthStore((state) => Boolean(state.token));

// How everyone tiered one movie:
//   { watchedCount, watchlistCount, tieredCount, tiers: { S: n, … F: n } }
export const useMovieCommunity = (movieId) =>
  useQuery({
    queryKey: queryKeys.communityMovie(movieId),
    queryFn: () => api.get(`/community/movies/${movieId}`),
    enabled: useSignedIn() && Boolean(movieId),
    staleTime: 60 * 1000,
  });

// Discover's "New releases": what's in cinemas now (TMDB's list, through
// the server), as cards — remembered so their posters and pages work.
//   [{ id, title, year, poster, … }]
export const useNewReleases = () =>
  useQuery({
    queryKey: ["movies", "lists", "now-playing"],
    queryFn: async () => {
      const { results } = await api.get("/movies/lists/now-playing");
      const cards = results.map((result) => ({ ...result, partial: true }));
      rememberMovies(cards);
      return cards;
    },
    enabled: useSignedIn(),
    staleTime: 60 * 60 * 1000,
  });

// The Discover rows: trending this week, and the community's favourites.
//   { trending: [{ movieId, count }], favorites: [{ movieId, tieredCount, lovedShare }] }
export const useTrending = () =>
  useQuery({
    queryKey: queryKeys.trending,
    queryFn: () => api.get("/community/trending?days=7&limit=30"),
    enabled: useSignedIn(),
    staleTime: 10 * 60 * 1000,
  });

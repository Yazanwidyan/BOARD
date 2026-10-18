import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  getAllKnownMovies,
  getMovieById,
  rememberMovies,
  useMoviesVersion,
} from "../data/movies";
import { api } from "../services/api";
import { searchMovies } from "../utils/movieSearch";

const DEBOUNCE_MS = 300;
const MIN_LENGTH = 2;
const STALE_MS = 10 * 60 * 1000;

// Search any movie. Three places at once:
//   - the movies the app already has, as you type (no waiting)
//   - ReelBoard's 8,000 on the server, by title, director, cast or year
//     (GET /api/movies?q=) — "nolan", "dicaprio"
//   - everything on TMDB, by title (GET /api/movies/search)
// All of it ranked together by utils/movieSearch. A result from TMDB is a
// card (poster, title, year); opening or saving it fetches the rest.
//
// Returns { results: [{ movie, matchedBy }], searching, failed }.
export const useMovieSearch = (query, limit = 20) => {
  useMoviesVersion();
  const [settled, setSettled] = useState(query.trim());
  useEffect(() => {
    const timer = setTimeout(() => setSettled(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);
  const enabled = settled.length >= MIN_LENGTH;
  const term = encodeURIComponent(settled);

  // Both remembered by services/api (the pool's come as `movies`); TMDB's
  // `results` are remembered here, as cards.
  const pool = useQuery({
    queryKey: ["search", "pool", settled],
    queryFn: () => api.get(`/movies?q=${term}&limit=40`),
    enabled,
    staleTime: STALE_MS,
  });
  const tmdb = useQuery({
    queryKey: ["search", "tmdb", settled],
    queryFn: async () => {
      const data = await api.get(`/movies/search?q=${term}`);
      rememberMovies(data.results.map((result) => ({ ...result, partial: true })));
      return data;
    },
    enabled,
    staleTime: STALE_MS,
  });

  const local = searchMovies(getAllKnownMovies(), query, limit);
  // TMDB's own matches the scorer doesn't recognise (other spellings,
  // original titles…) go after.
  const shown = new Set(local.map((result) => result.movie.id));
  const extra = (tmdb.data?.results ?? [])
    .filter((result) => !shown.has(result.id))
    .map((result) => ({ movie: getMovieById(result.id) ?? result, matchedBy: null }));

  return {
    results: [...local, ...extra].slice(0, limit),
    searching: enabled && (pool.isFetching || tmdb.isFetching),
    failed: enabled && pool.isError && tmdb.isError,
  };
};

import { useSyncExternalStore } from "react";

// The movies the app knows, in memory only. There's no catalog: the server
// has TMDB's well-known movies (about 8,000) and sends the app only what it
// needs —
//   - every movie a response mentions (your library, boards, friends,
//     feed…): services/api.js remembers each response's `movies`
//   - candidates: a few hundred movies picked for your taste and filters
//     from the whole set (GET /api/me/candidates), which Swipe, Spin,
//     Taste pick, dares and the rails choose from — that's MOVIES below
//   - anything you search for or open
// services/movieData.js loads candidates. Nothing is saved on the phone;
// every launch starts empty and loads from the server.
//
// A movie is { id, title, year, rating, runtime, genres, director, cast,
// details, description, franchise, poster, backdrop, vibe, rank }. A
// "card" (`partial: true`) is just enough for a poster in a collection or
// a search result — no plot, vibe or details; opening it fetches the rest.

// The candidates, filled in place, so the many modules importing MOVIES
// read the latest set without changes.
export const MOVIES = [];

const known = new Map();
let version = 0;
const listeners = new Set();

const changed = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

const isMovie = (movie) =>
  movie && typeof movie.id === "string" && typeof movie.title === "string";

// Adds or updates a movie. A card never replaces a full movie (it's only
// part of one); a full one replaces anything.
const remember = (movie) => {
  const current = known.get(movie.id);
  if (movie.partial && current && !current.partial) return false;
  // Two partial views of one movie (a search result, a collection card)
  // add up.
  if (movie.partial && current) movie = { ...current, ...movie };
  known.set(movie.id, movie);
  return true;
};

export const rememberMovies = (movies) => {
  if (!Array.isArray(movies)) return;
  let any = false;
  movies.forEach((movie) => {
    if (isMovie(movie) && remember(movie)) any = true;
  });
  if (any) changed();
};

export const setCandidates = (movies) => {
  movies.filter(isMovie).forEach(remember);
  MOVIES.splice(
    0,
    MOVIES.length,
    ...movies.map((movie) => known.get(movie.id)).filter(Boolean),
  );
  changed();
};

// Asking for a movie the app doesn't have yet fetches it in the background
// (services/movieData.js sets the handler); screens using
// useMoviesVersion() re-render when it arrives.
let onMissing = null;
export const setMissingMovieHandler = (handler) => {
  onMissing = handler;
};

export const getMovieById = (id) => {
  const movie = known.get(id);
  if (!movie && id && onMissing) onMissing(id);
  return movie;
};

// Every full movie the app has — candidates, your own, friends'… — for
// lookups wider than the candidates ("more by this director").
export const getKnownMovies = () =>
  [...known.values()].filter((movie) => !movie.partial);

// Everything, cards too (search looks through these).
export const getAllKnownMovies = () => [...known.values()];

// For news that isn't a movie but changes what screens show (collections).
export const moviesChanged = () => changed();

export const forgetMovies = () => {
  known.clear();
  MOVIES.splice(0, MOVIES.length);
  changed();
};

// Bumped whenever movies arrive — lets anything derived from them (e.g.
// utils/collections) recompute, and screens re-render (useMoviesVersion).
export const getCatalogVersion = () => version;

export const subscribeMovies = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Re-renders the calling component whenever movies arrive.
export const useMoviesVersion = () =>
  useSyncExternalStore(subscribeMovies, getCatalogVersion);

export default MOVIES;

import { AppState } from "react-native";
import { create } from "zustand";

import {
  MOVIES,
  forgetMovies,
  getMovieById,
  setCandidates,
  setMissingMovieHandler,
} from "../data/movies";
import { setReelClips } from "../data/reelClips";
import { useAuthStore } from "../store/authStore";
import { useUserStore } from "../store/userStore";
import { forgetCollections } from "../utils/collections";
import { NOT_MODIFIED, request, requestIfChanged } from "./api";
import { queryClient, queryKeys } from "./queryClient";

// The movies in the app (see data/movies.js), all from the server and kept
// in memory only — nothing is saved on the phone. There's no catalog: the
// server picks a few hundred candidates for you from its 8,000, and every
// response brings the movies it mentions. This module:
//   - loads candidates for your taste and your filters (Preferences), and
//     loads new ones when the filters change, when they're half a day old,
//     or when you've watched your way through too many of them
//   - loads the featured collections (to browse) and the Reels clips
//   - fetches any movie something asks for that the app doesn't have

export const CANDIDATE_COUNT = 300;
const CANDIDATES_MAX_AGE_MS = 12 * 60 * 60 * 1000;
// Fewer unwatched candidates than this left: time for new ones.
const CANDIDATES_LOW = 120;

// Featured collections and Reels clips change only when the server's
// movies do: checked once a day while the app runs.
const DAILY_MS = 24 * 60 * 60 * 1000;

const EMPTY_STATE = {
  candidatesKey: null,
  candidatesAt: 0,
  featuredEtag: null,
  featuredAt: 0,
  reelsAt: 0,
};
let state = EMPTY_STATE;
let loaded = false;

const signedIn = () => Boolean(useAuthStore.getState().token);

// ---- Candidates -------------------------------------------------------------

// The filters as the app applies them (defaults filled in).
const currentFilters = () => {
  const { preferences } = useUserStore.getState();
  return {
    genres: [...(preferences.genres ?? [])].sort(),
    decade: preferences.decade ?? "Any",
    runtime: preferences.runtime ?? "Any",
    minRating: preferences.minRating ?? null,
  };
};

const filtersKey = (filters) => JSON.stringify(filters);

const watchedIds = () =>
  new Set(
    (queryClient.getQueryData(queryKeys.library)?.watched ?? []).map((entry) => entry.movieId),
  );

const candidatesAreStale = (filters) => {
  if (MOVIES.length === 0) return true;
  if (state.candidatesKey !== filtersKey(filters)) return true;
  if (Date.now() - state.candidatesAt > CANDIDATES_MAX_AGE_MS) return true;
  const watched = watchedIds();
  return MOVIES.filter((movie) => !watched.has(movie.id)).length < CANDIDATES_LOW;
};

// For screens: whether candidates for the current filters are on their way
// (or couldn't be had), and how many movies on the server match them —
// `matchingKey` says which filters that count is for.
export const useCandidatesStatus = create(() => ({
  loading: false,
  failed: false,
  matching: null,
  matchingKey: null,
}));

export const currentFiltersKey = () => filtersKey(currentFilters());

const fetchCandidates = async (filters) => {
  useCandidatesStatus.setState({ loading: true, failed: false });
  try {
    const params = new URLSearchParams({ count: String(CANDIDATE_COUNT) });
    if (filters.genres.length) params.set("genres", filters.genres.join(","));
    if (filters.decade !== "Any") params.set("decade", filters.decade);
    if (filters.runtime !== "Any") params.set("runtime", filters.runtime);
    if (filters.minRating) params.set("minRating", String(filters.minRating));
    const { movies, matching } = await request("GET", `/me/candidates?${params}`);
    setCandidates(movies);
    state = { ...state, candidatesKey: filtersKey(filters), candidatesAt: Date.now() };
    useCandidatesStatus.setState({ matching, matchingKey: filtersKey(filters) });
  } catch (error) {
    useCandidatesStatus.setState({ failed: true });
    throw error;
  } finally {
    useCandidatesStatus.setState({ loading: false });
  }
};

let loadingCandidates = null;

// New candidates if the ones in the app are stale (or `force`) — always for
// the filters as they are when it's called, even if they changed while an
// earlier load was on its way. Throws if the server can't be reached.
export const loadCandidates = async ({ force = false } = {}) => {
  if (!signedIn()) return;
  while (loadingCandidates) await loadingCandidates.catch(() => {});
  const filters = currentFilters();
  if (!force && !candidatesAreStale(filters)) return;
  loadingCandidates = fetchCandidates(filters).finally(() => {
    loadingCandidates = null;
  });
  return loadingCandidates;
};

// ---- Collections and Reels ---------------------------------------------------

const loadFeaturedCollections = async () => {
  if (Date.now() - state.featuredAt < DAILY_MS && state.featuredEtag) return;
  const result = await requestIfChanged("/collections", state.featuredEtag);
  // The movies and collections themselves were remembered by services/api.
  if (result !== NOT_MODIFIED) state = { ...state, featuredEtag: result.etag };
  state = { ...state, featuredAt: Date.now() };
};

const loadReels = async () => {
  if (Date.now() - state.reelsAt < DAILY_MS) return;
  const { clips, clipSeconds } = await request("GET", "/movies/reels");
  setReelClips(clips, clipSeconds);
  state = { ...state, reelsAt: Date.now() };
};

// Everything at once — candidates first, as Swipe and the rails need them.
export const loadMovieData = async ({ force = false } = {}) => {
  await Promise.all([
    loadCandidates({ force }),
    loadFeaturedCollections().catch(() => {}),
    loadReels().catch(() => {}),
  ]);
  loaded = true;
};

// ---- Movies the app doesn't have ----------------------------------------------

const BATCH_SIZE = 50;
const RETRY_AFTER_MS = 10 * 60 * 1000;
const asked = new Map(); // id → when it was last asked for
let wanted = new Set();
let fetchTimer = null;

const fetchWanted = async () => {
  fetchTimer = null;
  const ids = [...wanted];
  wanted = new Set();
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    // Remembered by services/api as they arrive.
    await request("GET", `/movies/batch?ids=${batch.join(",")}`).catch(() => {
      batch.forEach((id) => asked.delete(id));
    });
  }
};

const wantMovie = (id) => {
  if (!signedIn() || !/^\d{1,10}$/.test(String(id))) return;
  const last = asked.get(id);
  if (last && Date.now() - last < RETRY_AFTER_MS) return;
  asked.set(id, Date.now());
  wanted.add(String(id));
  fetchTimer ??= setTimeout(fetchWanted, 50);
};

// Fetches these movies now if the app doesn't have them (or has only cards
// of them, with `full`) — e.g. onboarding's films.
export const fetchMovies = async (ids, { full = false } = {}) => {
  const missing = [...new Set(ids)].filter((id) => {
    const movie = getMovieById(id);
    return !movie || (full && movie.partial);
  });
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    await request("GET", `/movies/batch?ids=${missing.slice(i, i + BATCH_SIZE).join(",")}`);
  }
};

// ---- Before sign-in -----------------------------------------------------------

// The sign-in screen's poster wall: these movies from the server (no
// account needed).
export const loadWallMovies = async (ids) => {
  const missing = ids.filter((id) => {
    const movie = getMovieById(id);
    return !movie || movie.partial;
  });
  if (missing.length === 0) return;
  await request("GET", `/movies?ids=${missing.join(",")}&limit=${missing.length}`);
};

// ---- Start and stop -----------------------------------------------------------

let started = false;

// Once, at start-up: fetch what's asked for, and keep candidates in step
// with the filters.
export const startMovieData = () => {
  if (started) return;
  started = true;
  setMissingMovieHandler(wantMovie);

  // New filters (Preferences): new candidates, a moment after the last
  // change.
  let lastKey = null;
  let filtersTimer = null;
  queryClient.getQueryCache().subscribe(() => {
    if (!signedIn() || !loaded) return;
    const key = filtersKey(currentFilters());
    if (lastKey === null) {
      lastKey = key;
      return;
    }
    if (key === lastKey) return;
    lastKey = key;
    clearTimeout(filtersTimer);
    filtersTimer = setTimeout(() => loadCandidates().catch(() => {}), 600);
  });

  AppState.addEventListener("change", (status) => {
    if (status === "active" && signedIn() && loaded) loadMovieData().catch(() => {});
  });
};

// Signing out: none of it stays (candidates are picked for the account).
export const forgetMovieData = () => {
  forgetMovies();
  forgetCollections();
  useCandidatesStatus.setState({ loading: false, failed: false, matching: null, matchingKey: null });
  setReelClips([], null);
  asked.clear();
  state = EMPTY_STATE;
  loaded = false;
};

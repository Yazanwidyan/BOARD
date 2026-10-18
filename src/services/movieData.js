import { AppState } from "react-native";
import { create } from "zustand";

import {
  FILTERED_MOVIES,
  MOVIES,
  forgetMovies,
  getMovieById,
  setCandidates,
  setFilteredCandidates,
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
//   - loads candidates for your taste (MOVIES — Taste pick, dares, the
//     rails…), and a second set with your Swipe setup filters too
//     (FILTERED_MOVIES — Swipe, Spin, Movie Night). New ones when they're
//     half a day old, when you've watched your way through too many of
//     them, or (the filtered set) when the filters change. The filters
//     never narrow the rest of the app.
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
  candidatesAt: 0,
  generalMatching: null,
  filteredKey: null,
  filteredAt: 0,
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

const NO_FILTERS = { genres: [], decade: "Any", runtime: "Any", minRating: null };
const hasFilters = (filters) => filtersKey(filters) !== filtersKey(NO_FILTERS);

const runningLow = (movies) => {
  const watched = watchedIds();
  return movies.filter((movie) => !watched.has(movie.id)).length < CANDIDATES_LOW;
};

const generalIsStale = () =>
  MOVIES.length === 0 ||
  Date.now() - state.candidatesAt > CANDIDATES_MAX_AGE_MS ||
  runningLow(MOVIES);

const filteredIsStale = (filters) =>
  state.filteredKey !== filtersKey(filters) ||
  Date.now() - state.filteredAt > CANDIDATES_MAX_AGE_MS ||
  runningLow(FILTERED_MOVIES);

// For screens (Swipe setup): whether candidates for the current filters are
// on their way (or couldn't be had), and how many movies on the server
// match them — `matchingKey` says which filters that count is for.
export const useCandidatesStatus = create(() => ({
  loading: false,
  failed: false,
  matching: null,
  matchingKey: null,
}));

export const currentFiltersKey = () => filtersKey(currentFilters());

const fetchCandidateSet = async (filters) => {
  const params = new URLSearchParams({ count: String(CANDIDATE_COUNT) });
  if (filters.genres.length) params.set("genres", filters.genres.join(","));
  if (filters.decade !== "Any") params.set("decade", filters.decade);
  if (filters.runtime !== "Any") params.set("runtime", filters.runtime);
  if (filters.minRating) params.set("minRating", String(filters.minRating));
  return request("GET", `/me/candidates?${params}`);
};

// Your taste, no filters.
const fetchGeneral = async () => {
  const { movies, matching } = await fetchCandidateSet(NO_FILTERS);
  setCandidates(movies);
  state = { ...state, candidatesAt: Date.now(), generalMatching: matching };
};

// Your taste and the Swipe setup filters.
const fetchFiltered = async (filters) => {
  useCandidatesStatus.setState({ loading: true, failed: false });
  try {
    const { movies, matching } = await fetchCandidateSet(filters);
    setFilteredCandidates(movies);
    state = { ...state, filteredKey: filtersKey(filters), filteredAt: Date.now() };
    useCandidatesStatus.setState({ matching, matchingKey: filtersKey(filters) });
  } catch (error) {
    useCandidatesStatus.setState({ failed: true });
    throw error;
  } finally {
    useCandidatesStatus.setState({ loading: false });
  }
};

let loadingCandidates = null;

// New candidates where the ones in the app are stale (or `force`) — the
// filtered set always for the filters as they are when it's called, even if
// they changed while an earlier load was on its way. With no filters set,
// the filtered set is just the general one. Throws if the server can't be
// reached.
export const loadCandidates = async ({ force = false } = {}) => {
  if (!signedIn()) return;
  while (loadingCandidates) await loadingCandidates.catch(() => {});
  const filters = currentFilters();
  const loads = [];
  if (force || generalIsStale()) loads.push(fetchGeneral());
  if (hasFilters(filters)) {
    if (force || filteredIsStale(filters)) loads.push(fetchFiltered(filters));
  } else if (state.filteredKey !== filtersKey(filters) || force || loads.length) {
    // No filters: Swipe uses the general set (once it's in).
    loadingCandidates = Promise.all(loads).then(() => {
      setFilteredCandidates(MOVIES);
      state = { ...state, filteredKey: filtersKey(filters), filteredAt: state.candidatesAt };
      useCandidatesStatus.setState({
        matching: state.generalMatching ?? null,
        matchingKey: filtersKey(filters),
      });
    });
    await loadingCandidates.finally(() => {
      loadingCandidates = null;
    });
    return;
  }
  if (loads.length === 0) return;
  loadingCandidates = Promise.all(loads).finally(() => {
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

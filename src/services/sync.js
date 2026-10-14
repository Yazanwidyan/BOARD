import { AppState } from "react-native";

import { changeLanguage, t } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { useBoardStore } from "../store/boardStore";
import { useChallengeStore } from "../store/challengeStore";
import { useLanguageStore } from "../store/languageStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { useRecentSearchStore } from "../store/recentSearchStore";
import { useSessionStore } from "../store/sessionStore";
import { useTasteStore } from "../store/tasteStore";
import { useThemeStore } from "../store/themeStore";
import { useTipsStore } from "../store/tipsStore";
import { showToast } from "../store/toastStore";
import { DEFAULT_PREFERENCES, useUserStore } from "../store/userStore";
import { getLevel, getUserXP } from "../utils/xp";
import { request } from "./api";
import { loadCatalog } from "./catalog";

// The ReelBoard server is the source of truth for everything the user
// owns: library, tiers, boards, profile, settings, taste, challenges.
//
// The Zustand stores are an in-memory view of the signed-in account —
// nothing in them is saved on the device. After signing in they're filled
// from GET /api/me; from then on every change a screen makes to a store is
// sent straight to the API (screens keep calling the store actions they
// always have, so they stay instant). If the server rejects a change or
// can't be reached, the account is reloaded from the server so the app
// never shows something the database doesn't have.

// [{ method, path, body?, key? }] waiting to be sent, in order. `key`
// marks "set the latest value" calls (profile, settings, a board's order…):
// a newer change to the same key merges into the waiting call instead of
// queueing another.
let queue = [];
let sending = null;
let flushTimer = null;
// True while server data is written into the stores, so it isn't echoed back.
let applyingRemote = false;
// Bumped on every local change — a reload that finishes after one is stale.
let version = 0;
let lastReportedLevel = null;
let started = false;

const FLUSH_DELAY_MS = 400;

const signedIn = () => Boolean(useAuthStore.getState().token);

const enqueue = (method, path, body, key) => {
  if (applyingRemote || !signedIn()) return;
  version += 1;
  const waiting = key && queue.find((call) => call.key === key);
  if (waiting) {
    if (waiting.method === method && waiting.body && body) {
      waiting.body = { ...waiting.body, ...body };
    } else {
      Object.assign(waiting, { method, path, body });
    }
  } else {
    queue.push({ method, path, body, key });
  }
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
};

// Sends waiting changes in order; returns the error that stopped it, if any.
const sendQueued = async () => {
  while (queue.length > 0 && signedIn()) {
    const call = queue.shift();
    try {
      await request(call.method, call.path, call.body);
    } catch (error) {
      queue = [];
      return error;
    }
  }
  return null;
};

// Sends waiting changes. On any failure the rest are dropped and the
// account is reloaded from the server, undoing what didn't save. (The
// reload runs after sending has finished — it waits on flush itself.)
export const flush = () => {
  if (sending) return sending;
  sending = (async () => {
    let error;
    try {
      error = await sendQueued();
    } finally {
      sending = null;
    }
    // 401: the session is over — api.js has already signed out.
    if (!error || error.status === 401) return;
    showToast(
      error.status === 0
        ? t("You're offline — that change wasn't saved")
        : t("Couldn't save that change: {error}", { error: error.message }),
    );
    await reload().catch(() => {});
  })();
  return sending;
};

// ---- Store changes → API calls ---------------------------------------------

const byMovie = (entries) => new Map(entries.map((entry) => [entry.movieId, entry]));

const watchMovieStore = () =>
  useMovieStore.subscribe((state, prev) => {
    const newlyWatched = new Set();

    if (state.watched !== prev.watched) {
      const before = byMovie(prev.watched);
      const after = byMovie(state.watched);
      if (state.watched.length === 0 && prev.watched.length > 1) {
        enqueue("DELETE", "/me/watched");
      } else {
        after.forEach((entry, movieId) => {
          const old = before.get(movieId);
          if (!old) {
            newlyWatched.add(movieId);
            enqueue("POST", "/me/watched", {
              movieId,
              tier: entry.tier ?? null,
              watchedAt: Math.round(entry.timestamp),
            });
          } else if ((entry.watchCount ?? 1) > (old.watchCount ?? 1)) {
            enqueue("POST", `/me/watched/${movieId}/rewatch`);
          } else {
            const changes = {};
            if ((entry.tier ?? null) !== (old.tier ?? null)) changes.tier = entry.tier ?? null;
            if (entry.timestamp !== old.timestamp) changes.watchedAt = Math.round(entry.timestamp);
            if (Object.keys(changes).length > 0) {
              enqueue("PATCH", `/me/watched/${movieId}`, changes, `watched:${movieId}`);
            }
          }
        });
        before.forEach((entry, movieId) => {
          if (!after.has(movieId)) enqueue("DELETE", `/me/watched/${movieId}`);
        });
      }
      reportLevel();
    }

    if (state.bucketList !== prev.bucketList) {
      const before = byMovie(prev.bucketList);
      const after = byMovie(state.bucketList);
      if (state.bucketList.length === 0 && prev.bucketList.length > 1) {
        enqueue("DELETE", "/me/watchlist");
      } else {
        after.forEach((entry, movieId) => {
          if (!before.has(movieId)) enqueue("POST", "/me/watchlist", { movieId });
        });
        before.forEach((entry, movieId) => {
          // Marking it watched already takes it off the server's watchlist.
          if (!after.has(movieId) && !newlyWatched.has(movieId)) {
            enqueue("DELETE", `/me/watchlist/${movieId}`);
          }
        });
      }
    }

    if (state.pickedMovie !== prev.pickedMovie || state.pickMood !== prev.pickMood) {
      if (state.pickedMovie) {
        const mood =
          state.pickMood?.movieId === state.pickedMovie ? state.pickMood.mood : null;
        enqueue("PUT", "/me/pick", { movieId: state.pickedMovie, mood }, "pick");
      } else if (!newlyWatched.has(prev.pickedMovie)) {
        // (Marking the pick watched clears it on the server too.)
        enqueue("DELETE", "/me/pick", undefined, "pick");
      }
    }

    if (state.unlockedCollections !== prev.unlockedCollections) {
      const before = new Set(prev.unlockedCollections);
      const after = new Set(state.unlockedCollections);
      after.forEach((id) => {
        if (!before.has(id)) {
          enqueue("PUT", `/me/unlocked-collections/${encodeURIComponent(id)}`, undefined, `unlock:${id}`);
        }
      });
      before.forEach((id) => {
        if (!after.has(id)) {
          enqueue("DELETE", `/me/unlocked-collections/${encodeURIComponent(id)}`, undefined, `unlock:${id}`);
        }
      });
    }
  });

const watchBoardStore = () =>
  useBoardStore.subscribe((state, prev) => {
    if (state.boards === prev.boards) return;
    const before = new Map(prev.boards.map((board) => [board.id, board]));
    const after = new Map(state.boards.map((board) => [board.id, board]));
    // Oldest first, so boards are created on the server in the same order.
    [...after.values()].reverse().forEach((board) => {
      const old = before.get(board.id);
      if (!old) {
        // The app's board id is kept by the server, so later edits find it.
        enqueue("POST", "/boards", { id: board.id, name: board.name, movieIds: board.movieIds });
        return;
      }
      if (board.name !== old.name) {
        enqueue("PATCH", `/boards/${board.id}`, { name: board.name }, `board-name:${board.id}`);
      }
      if (board.movieIds !== old.movieIds) {
        enqueue("PUT", `/boards/${board.id}/movies`, { movieIds: board.movieIds }, `board-movies:${board.id}`);
      }
    });
    before.forEach((board, id) => {
      if (!after.has(id)) enqueue("DELETE", `/boards/${id}`);
    });
  });

const watchProfileStore = () =>
  useProfileStore.subscribe((state, prev) => {
    const changes = {};
    if (state.displayName !== prev.displayName && state.displayName.trim()) {
      changes.displayName = state.displayName.trim().slice(0, 50);
    }
    if (state.bio !== prev.bio) changes.bio = state.bio.trim();
    if (state.avatarUri !== prev.avatarUri) changes.avatarUri = state.avatarUri;
    if (Object.keys(changes).length > 0) enqueue("PATCH", "/me/profile", changes, "profile");
    if (state.topTen !== prev.topTen) {
      enqueue("PUT", "/me/top-ten", { movieIds: state.topTen ?? [] }, "top-ten");
    }
    if (state.pinnedCollections !== prev.pinnedCollections) {
      enqueue(
        "PUT",
        "/me/pinned-collections",
        { collectionIds: state.pinnedCollections ?? [] },
        "pinned-collections",
      );
    }
  });

const patchSettings = (changes) => enqueue("PATCH", "/me/settings", changes, "settings");

const watchSettingsStores = () => {
  useUserStore.subscribe((state, prev) => {
    const changes = {};
    if (state.preferences !== prev.preferences) changes.preferences = state.preferences;
    if (state.hasCompletedOnboarding !== prev.hasCompletedOnboarding) {
      changes.hasCompletedOnboarding = state.hasCompletedOnboarding;
    }
    if (Object.keys(changes).length > 0) patchSettings(changes);
  });
  useLanguageStore.subscribe((state, prev) => {
    if (state.language !== prev.language) patchSettings({ language: state.language });
  });
  useThemeStore.subscribe((state, prev) => {
    if (state.mode !== prev.mode) patchSettings({ theme: state.mode });
  });
  useTipsStore.subscribe((state, prev) => {
    // Always the whole map, replacing the server's (so "show tips again" works).
    if (state.seen !== prev.seen) patchSettings({ resetTips: true, tipsSeen: state.seen });
  });
  useRecentSearchStore.subscribe((state, prev) => {
    if (state.recentSearches === prev.recentSearches) return;
    if (state.recentSearches.length === 0) {
      enqueue("DELETE", "/me/searches", undefined, "searches-clear");
    } else if (state.recentSearches[0] !== prev.recentSearches[0]) {
      enqueue("POST", "/me/searches", { term: state.recentSearches[0] });
    }
  });
};

const watchTasteStore = () =>
  useTasteStore.subscribe((state, prev) => {
    const cleared =
      state.passes.length === 0 &&
      Object.keys(state.aspects).length === 0 &&
      state.leanings == null &&
      (prev.passes.length > 0 || Object.keys(prev.aspects).length > 0 || prev.leanings != null);
    if (cleared) {
      enqueue("DELETE", "/me/taste");
      return;
    }
    if (state.leanings !== prev.leanings) {
      enqueue("PUT", "/me/taste/leanings", { leanings: state.leanings ?? null }, "leanings");
    }
    if (state.aspects !== prev.aspects) {
      const ids = new Set([...Object.keys(state.aspects), ...Object.keys(prev.aspects)]);
      ids.forEach((movieId) => {
        const next = state.aspects[movieId] ?? [];
        if (JSON.stringify(next) !== JSON.stringify(prev.aspects[movieId] ?? [])) {
          enqueue("PUT", `/me/taste/aspects/${movieId}`, { aspects: next }, `aspects:${movieId}`);
        }
      });
    }
    const pass = state.passes[0];
    if (pass && (pass.movieId !== prev.passes[0]?.movieId || pass.at !== prev.passes[0]?.at)) {
      enqueue("POST", "/me/taste/passes", { movieId: pass.movieId });
    }
  });

const watchChallengeStore = () =>
  useChallengeStore.subscribe((state, prev) => {
    if (state.activeChallenge !== prev.activeChallenge) {
      if (state.activeChallenge && state.activeChallenge.id !== prev.activeChallenge?.id) {
        enqueue("POST", "/me/challenges/active", { challenge: state.activeChallenge });
      } else if (!state.activeChallenge && prev.activeChallenge) {
        const resolved = state.history[0];
        // A completed one needs nothing: the server completes it itself
        // when its target movie is marked watched.
        if (resolved?.id === prev.activeChallenge.id && resolved.status === "skipped") {
          enqueue("POST", "/me/challenges/active/skip");
        }
      }
    }
    if (state.history.length === 0 && prev.history.length > 0) {
      enqueue("DELETE", "/me/challenges/history");
    }
  });

// XP and level are worked out by the app (utils/xp.js) from the watch
// history; the server keeps the latest so friends see the right level.
const reportLevel = () => {
  const xp = getUserXP(useMovieStore.getState().watched);
  const { level } = getLevel(xp);
  if (level === lastReportedLevel) return;
  lastReportedLevel = level;
  enqueue("PATCH", "/me/profile", { xp: Math.round(xp), level }, "profile");
};

// Badges and finished collections are worked out by the app too — the
// achievement dialog reports them here so they reach friends' feeds.
export const reportAchievements = (rows) => {
  rows.forEach((row) => {
    if (row.badge?.label) {
      enqueue("POST", "/activity", { type: "badge", badge: row.badge.label });
    } else if (row.collection) {
      enqueue("POST", "/activity", {
        type: "set",
        set: row.collection.title,
        count: row.collection.movies.length,
      });
    }
  });
};

// ---- Server → stores -------------------------------------------------------

const DATA_STORES = [
  useMovieStore,
  useBoardStore,
  useProfileStore,
  useUserStore,
  useTasteStore,
  useChallengeStore,
  useRecentSearchStore,
  useTipsStore,
  useSessionStore,
];

const silently = (fn) => {
  applyingRemote = true;
  try {
    fn();
  } finally {
    applyingRemote = false;
  }
};

// Writes GET /api/me into the stores. `full` also applies language and
// theme — on sign-in only, since switching the language remounts every
// screen.
const applyServerState = (state, { full = false } = {}) => {
  const { library, profile, settings } = state;
  silently(() => {
    useMovieStore.setState({
      bucketList: library.bucketList,
      watched: library.watched,
      pickedMovie: library.pickedMovie,
      pickMood: library.pickMood,
      unlockedCollections: library.unlockedCollections,
    });
    useBoardStore.setState({
      boards: state.boards.map(({ ownerId, ...board }) => board),
    });
    useProfileStore.setState({
      displayName: profile.displayName,
      bio: profile.bio,
      email: profile.email,
      avatarUri: profile.avatarUri,
      topTen: profile.topTen,
      pinnedCollections: profile.pinnedCollections,
    });
    useUserStore.setState({
      preferences: { ...DEFAULT_PREFERENCES, ...settings.preferences },
      hasCompletedOnboarding: settings.hasCompletedOnboarding,
    });
    useTasteStore.setState(state.taste);
    useChallengeStore.setState(state.challenges);
    useRecentSearchStore.setState({ recentSearches: state.recentSearches });
    useTipsStore.setState({ seen: settings.tipsSeen });
    if (full) {
      useThemeStore.setState({ mode: settings.theme });
      if (settings.language !== useLanguageStore.getState().language) {
        changeLanguage(settings.language);
      }
    }
  });
  useAuthStore.getState().setUser(profile);
  lastReportedLevel = profile.level;
  // A level worked out by a newer app version than the one that last
  // reported it gets corrected here.
  reportLevel();
};

// Loads the signed-in account — and the movie catalog it refers to — into
// the app. Drives the loading screen via authStore.status: "loading" →
// "ready", or "error" (with a Retry).
export const loadAccount = async () => {
  if (!signedIn()) return;
  const auth = useAuthStore.getState();
  auth.setStatus("loading");
  try {
    // The catalog goes in first: XP, collections and badges read it.
    const [state] = await Promise.all([request("GET", "/me"), loadCatalog()]);
    applyServerState(state, { full: true });
    useAuthStore.getState().setStatus("ready");
  } catch (error) {
    if (error.status !== 401) useAuthStore.getState().setStatus("error", error.message);
  }
};

// Re-reads the account (coming back to the app, or after a failed save) —
// skipped if there are changes still on their way to the server.
export const reload = async () => {
  if (!signedIn()) return;
  await flush();
  if (queue.length > 0) return;
  const before = version;
  const state = await request("GET", "/me");
  if (before !== version || queue.length > 0) return;
  applyServerState(state);
};

// ---- Accounts --------------------------------------------------------------

export const signIn = async ({ email, password }) => {
  const { token, user } = await request("POST", "/auth/login", { email, password });
  useAuthStore.getState().setSession(token, user);
  await loadAccount();
};

// A new account starts empty; onboarding runs next and saves to it.
export const register = async ({ displayName, email, password }) => {
  const { token, user } = await request("POST", "/auth/register", {
    displayName,
    email,
    password,
  });
  useAuthStore.getState().setSession(token, user);
  await loadAccount();
};

// Nothing of the account stays on the device after signing out.
const clearStores = () => {
  queue = [];
  lastReportedLevel = null;
  silently(() => {
    DATA_STORES.forEach((store) => store.setState(store.getInitialState(), true));
  });
};

export const signOut = () => {
  useAuthStore.getState().clearSession();
};

export const deleteAccount = async (password) => {
  await request("DELETE", "/me", { password });
  signOut();
};

// ---- Start-up --------------------------------------------------------------

// Call once, after the session token has loaded from storage.
export const startSync = () => {
  if (started) return;
  started = true;
  watchMovieStore();
  watchBoardStore();
  watchProfileStore();
  watchSettingsStores();
  watchTasteStore();
  watchChallengeStore();
  // Session over (signed out, account deleted, or the server rejected the
  // token): wipe the account's data from memory.
  useAuthStore.subscribe((state, prev) => {
    if (prev.token && !state.token) clearStores();
  });
  AppState.addEventListener("change", (status) => {
    if (status === "active" && useAuthStore.getState().status === "ready") {
      reload().catch(() => {});
    }
  });
  loadAccount();
};

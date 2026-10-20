import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

import { changeLanguage } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { useLanguageStore } from "../store/languageStore";
import { resetShownRanks } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { useThemeStore } from "../store/themeStore";
import { request } from "./api";
import { ONBOARDING_MOVIE_IDS } from "../utils/onboardingTaste";
import {
  fetchMovies,
  forgetMovieData,
  loadMovieData,
  startMovieData,
} from "./movieData";
import {
  clearAccountCache,
  getChangeCount,
  hasPendingChanges,
  queryClient,
  queryKeys,
  queueChange,
  refetchAfterQueue,
  setAccountData,
} from "./queryClient";
import { unregisterPushToken } from "./notifications";
import { signOutOfProviders } from "./socialAuth";

// The signed-in account's life cycle. The data itself — and how changes
// reach the server — is TanStack Query's (services/queryClient.js and the
// stores built on store/accountStore.js); this loads it on sign-in, keeps
// it fresh, and forgets it on sign-out.
//
// authStore.status drives the loading screen: "loading" → "ready", or
// "error" (with a Retry). Nothing is saved on the device: every launch
// loads the account from the server.

let started = false;
// True while server data is written into the language/theme stores, so it
// isn't echoed back.
let applyingRemote = false;

const signedIn = () => Boolean(useAuthStore.getState().token);

// Writes a GET /api/me response into the cache. `full` also applies the
// account's language and theme — on sign-in and launch only, since
// switching the language remounts every screen.
const applyServerState = (state, { full = false } = {}) => {
  setAccountData(state);
  resetShownRanks(state.profile.ranks);
  if (full) {
    applyingRemote = true;
    try {
      useThemeStore.getState().setMode(state.settings.theme);
      if (state.settings.language !== useLanguageStore.getState().language) {
        changeLanguage(state.settings.language);
      }
    } finally {
      applyingRemote = false;
    }
  }
};

// Re-reads the whole account in one request. Skipped while changes are on
// their way (the server is behind until they land — the queue refetches
// once it's empty), and dropped if one was made while it loaded.
const refreshAccount = async ({ full = false } = {}) => {
  if (!signedIn()) return;
  if (hasPendingChanges()) {
    refetchAfterQueue([queryKeys.account]);
    return;
  }
  const before = getChangeCount();
  const state = await request("GET", "/me");
  if (getChangeCount() !== before || hasPendingChanges() || !signedIn()) return;
  applyServerState(state, { full });
};

// Loads the signed-in account — with its movies, and candidates to choose
// from (services/movieData) — and shows the loading screen until it's in.
export const loadAccount = async () => {
  if (!signedIn()) return;
  useAuthStore.getState().setStatus("loading");
  try {
    // Brings the account's own movies and collections too (services/api
    // remembers them), and the filters candidates are picked with.
    const state = await request("GET", "/me");
    applyServerState(state, { full: true });
    await Promise.all([
      loadMovieData(),
      // A new account starts with onboarding, which asks about these films.
      state.settings.hasCompletedOnboarding
        ? null
        : fetchMovies(ONBOARDING_MOVIE_IDS, { full: true }),
    ]);
    useAuthStore.getState().setStatus("ready");
  } catch (error) {
    if (error.status !== 401)
      useAuthStore.getState().setStatus("error", error.message);
  }
};

// ---- Accounts --------------------------------------------------------------

export const signIn = async ({ email, password }) => {
  const { token, user } = await request("POST", "/auth/login", {
    email,
    password,
  });
  useAuthStore.getState().setSession(token, user);
  await loadAccount();
};

// Google or Apple: `credentials` is what services/socialAuth got back from
// the provider's sign-in sheet. Signs in to the matching account, or
// creates one (which then starts with onboarding).
export const signInWith = async (provider, credentials) => {
  const { token, user } = await request(
    "POST",
    `/auth/${provider}`,
    credentials,
  );
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

// Signing out: the account's data (all in memory) is dropped, along with
// any change still on its way.
const forgetAccount = () => {
  clearAccountCache();
  forgetMovieData();
  resetShownRanks();
  useSessionStore.getState().endSession();
};

// Earlier versions saved the account, its waiting changes and its movies
// on the phone, for offline use. Nothing is kept any more: clear them.
const OLD_SAVED_KEYS = ["board:query-cache", "board:catalog", "board:movie-data"];
const forgetOldSavedData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const old = keys.filter(
      (key) => OLD_SAVED_KEYS.includes(key) || key.startsWith("board:movie-data:"),
    );
    if (old.length) await AsyncStorage.multiRemove(old);
  } catch {
    // Nothing to clear.
  }
};

const endSession = () => {
  signOutOfProviders();
  useAuthStore.getState().clearSession();
};

// This phone stops getting the account's push notifications first — that
// needs the session, so it's done before the session ends.
export const signOut = async () => {
  await unregisterPushToken().catch(() => {});
  endSession();
};

// `confirmation`: { password } — or { confirm: "DELETE" } for an account
// made with Google / Apple, which has no password.
export const deleteAccount = async (confirmation) => {
  await request("DELETE", "/me", confirmation);
  // The account's push tokens went with it.
  endSession();
};

// New ranks are worked out by the app the moment they're earned — the
// achievement dialog reports them here so they reach friends' feeds.
export const reportAchievements = (rows) => {
  rows.forEach((row) => {
    if (row.rank) {
      queueChange("POST", "/activity", {
        type: "rank",
        rank: row.rank.title.slice(0, 60),
        track: row.rank.track.title.slice(0, 80),
      });
    }
  });
};

// ---- Start-up --------------------------------------------------------------

// Language and theme are kept on the device too (so the sign-in screen
// shows right), and saved to the account when they change.
const watchDeviceSettings = () => {
  const patchSettings = (changes) => {
    if (applyingRemote || !signedIn()) return;
    queryClient.setQueryData(
      queryKeys.settings,
      (settings) => settings && { ...settings, ...changes },
    );
    queueChange("PATCH", "/me/settings", changes, {
      merge: "settings",
      invalidate: [queryKeys.settings],
    });
  };
  useLanguageStore.subscribe((state, prev) => {
    if (state.language !== prev.language)
      patchSettings({ language: state.language });
  });
  useThemeStore.subscribe((state, prev) => {
    if (state.mode !== prev.mode) patchSettings({ theme: state.mode });
  });
};

// Call once, after the saved session token has loaded.
export const startSync = async () => {
  if (started) return;
  started = true;
  forgetOldSavedData();
  watchDeviceSettings();
  startMovieData();
  // Session over (signed out, account deleted, or the server rejected the
  // token): wipe the account's data.
  useAuthStore.subscribe((state, prev) => {
    if (prev.token && !state.token) forgetAccount();
  });
  // Coming back to the app: one request refreshes the whole account (and
  // services/movieData checks its candidates).
  AppState.addEventListener("change", (status) => {
    if (status === "active" && useAuthStore.getState().status === "ready") {
      refreshAccount().catch(() => {});
    }
  });
  // Every launch loads the account from the server (the loading screen
  // shows until it's in, with Retry if the server can't be reached).
  if (signedIn()) await loadAccount();
};

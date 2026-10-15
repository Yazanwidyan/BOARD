import { AppState } from "react-native";

import { changeLanguage } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { useLanguageStore } from "../store/languageStore";
import { resetShownLevel } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { useThemeStore } from "../store/themeStore";
import { request } from "./api";
import { loadCatalog, restoreCatalog } from "./catalog";
import {
  clearAccountCache,
  getChangeCount,
  hasAccountData,
  hasPendingChanges,
  persister,
  queryClient,
  queryKeys,
  queueChange,
  refetchAfterQueue,
  resumeQueue,
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
// "error" (with a Retry). With the account saved on the device from last
// time, the app is "ready" at once and refreshes in the background.

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
  resetShownLevel(state.profile.level);
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

// Loads the signed-in account — and the movie catalog it refers to — and
// shows the loading screen until it's in.
export const loadAccount = async () => {
  if (!signedIn()) return;
  useAuthStore.getState().setStatus("loading");
  try {
    // The catalog goes in first: XP, collections and badges read it.
    const [state] = await Promise.all([request("GET", "/me"), loadCatalog()]);
    applyServerState(state, { full: true });
    useAuthStore.getState().setStatus("ready");
  } catch (error) {
    if (error.status !== 401)
      useAuthStore.getState().setStatus("error", error.message);
  }
};

// The account (and catalog) as last saved on the device, if they're
// complete: open on them now, and check the server in the background.
const openSavedAccount = async () => {
  const hasCatalog = await restoreCatalog();
  if (!hasCatalog || !hasAccountData()) return false;
  resetShownLevel(
    queryClient.getQueryData(queryKeys.profile)?.level ?? null,
  );
  useAuthStore.getState().setStatus("ready");
  resumeQueue();
  Promise.all([refreshAccount({ full: true }), loadCatalog()]).catch(() => {
    // Offline: carry on with what's saved; the queue waits for the network.
  });
  return true;
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

// Nothing of the account stays on the device after signing out — neither
// its cached data nor changes still waiting to be sent.
const forgetAccount = () => {
  clearAccountCache();
  resetShownLevel();
  useSessionStore.getState().endSession();
  persister.removeClient();
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

// Badges and finished collections are worked out by the app — the
// achievement dialog reports them here so they reach friends' feeds.
export const reportAchievements = (rows) => {
  rows.forEach((row) => {
    if (row.badge?.label) {
      queueChange("POST", "/activity", {
        type: "badge",
        badge: row.badge.label,
      });
    } else if (row.collection) {
      queueChange("POST", "/activity", {
        type: "set",
        set: row.collection.title,
        count: row.collection.movies.length,
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

// Call once, after the session token and the saved query cache have loaded.
export const startSync = async () => {
  if (started) return;
  started = true;
  watchDeviceSettings();
  // Session over (signed out, account deleted, or the server rejected the
  // token): wipe the account's data.
  useAuthStore.subscribe((state, prev) => {
    if (prev.token && !state.token) forgetAccount();
  });
  // Coming back to the app: one request refreshes the whole account.
  AppState.addEventListener("change", (status) => {
    if (status === "active" && useAuthStore.getState().status === "ready") {
      refreshAccount().catch(() => {});
      loadCatalog().catch(() => {});
    }
  });
  if (!signedIn()) {
    // A queue left by an account that's no longer signed in goes nowhere.
    clearAccountCache();
    return;
  }
  if (!(await openSavedAccount())) {
    resumeQueue();
    await loadAccount();
  }
};

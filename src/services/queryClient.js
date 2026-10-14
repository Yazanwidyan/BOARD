import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  focusManager,
  MutationObserver,
  QueryClient,
} from "@tanstack/react-query";
import { AppState } from "react-native";

import { t } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { showToast } from "../store/toastStore";
import { ApiError, request } from "./api";

// TanStack Query is the app's data layer. Everything the account owns —
// library, boards, profile, settings, taste, challenges, recent searches —
// lives in its query cache, which is saved on the device, so the app opens
// straight onto the last-known data and works offline.
//
// Reading: each part of the account is its own query (queryKeys below),
// fetched from its own endpoint. GET /api/me fills them all in one request
// on sign-in and whenever the app comes back to the front (services/sync).
//
// Changing: a store action (store/accountStore.js) writes the change into
// the cache straight away — screens stay instant — and queues the matching
// API call with queueChange(). Queued calls run one at a time, in order
// (one mutation scope), each with its own Idempotency-Key so a re-send is
// harmless. Offline, they wait — saved on the device with the cache, so a
// restart doesn't lose them — and go out when the server is reachable
// again. Once the queue is empty, the queries it touched are refetched, so
// the cache ends up exactly what the server has. A change the server
// rejects shows a toast, and the refetch undoes it.

export const queryKeys = {
  account: ["me"],
  library: ["me", "library"],
  boards: ["me", "boards"],
  profile: ["me", "profile"],
  settings: ["me", "settings"],
  taste: ["me", "taste"],
  challenges: ["me", "challenges"],
  searches: ["me", "searches"],
  catalog: ["catalog"],
  friends: ["friends"],
  friendRequests: ["friends", "requests"],
  activity: ["activity"],
};

const SYNC_KEY = ["sync"];
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_MS = 30 * DAY_MS;
const MERGE_DELAY_MS = 400;

const isClientError = (error) =>
  error instanceof ApiError && error.status >= 400 && error.status < 500;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Never dropped from memory while the app runs, or they'd drop out of
      // the saved copy too. (Infinity rather than MAX_AGE_MS: a timer longer
      // than ~24.8 days overflows and fires at once.)
      gcTime: Infinity,
      staleTime: 30 * 1000,
      // A 4xx won't change on a retry; offline, queries pause instead.
      retry: (failureCount, error) => !isClientError(error) && failureCount < 3,
    },
  },
});

// The app is "focused" while it's in the foreground.
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener("change", (status) =>
    setFocused(status === "active"),
  );
  return () => subscription.remove();
});

// ---- Saved on the device ---------------------------------------------------

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "board:query-cache",
});

export const persistOptions = {
  persister,
  maxAge: MAX_AGE_MS,
  // Bump when the shape of cached data changes, to drop old saved copies.
  buster: "1",
  dehydrateOptions: {
    // The catalog is saved on its own (services/catalog.js) — it's big and
    // rarely changes, so it isn't rewritten with every small change.
    shouldDehydrateQuery: (query) =>
      query.state.status === "success" && query.meta?.persist !== false,
    // Every change still waiting, including one mid-request: if the app is
    // closed before the reply, it's sent again on the next launch (the
    // Idempotency-Key makes that safe).
    shouldDehydrateMutation: (mutation) =>
      mutation.state.status === "pending" &&
      mutation.options.mutationKey?.[0] === SYNC_KEY[0],
  },
};

// ---- Account queries ---------------------------------------------------------

const withoutOwner = ({ ownerId, ...board }) => board;

// The signed-in user (authStore) follows the profile.
const withUser = (profile) => {
  useAuthStore.getState().setUser(profile);
  return profile;
};

// What each account query fetches, in the shape its store keeps.
const ACCOUNT_QUERIES = [
  [queryKeys.library, "/me/library", (data) => data],
  [
    queryKeys.boards,
    "/boards",
    (data) => ({ boards: data.boards.map(withoutOwner) }),
  ],
  [queryKeys.profile, "/me/profile", (data) => withUser(data.profile)],
  [queryKeys.settings, "/me/settings", (data) => data.settings],
  [queryKeys.taste, "/me/taste", (data) => data],
  [queryKeys.challenges, "/me/challenges", (data) => data],
  [queryKeys.searches, "/me/searches", (data) => data],
];

// Fills every account query from a GET /api/me response.
export const setAccountData = (state) => {
  queryClient.setQueryData(queryKeys.library, state.library);
  queryClient.setQueryData(queryKeys.boards, {
    boards: state.boards.map(withoutOwner),
  });
  queryClient.setQueryData(queryKeys.profile, withUser(state.profile));
  queryClient.setQueryData(queryKeys.settings, state.settings);
  queryClient.setQueryData(queryKeys.taste, state.taste);
  queryClient.setQueryData(queryKeys.challenges, state.challenges);
  queryClient.setQueryData(queryKeys.searches, {
    recentSearches: state.recentSearches,
  });
};

export const hasAccountData = () =>
  ACCOUNT_QUERIES.every(
    ([queryKey]) => queryClient.getQueryData(queryKey) !== undefined,
  );

ACCOUNT_QUERIES.forEach(([queryKey, path, shape]) => {
  queryClient.setQueryDefaults(queryKey, {
    queryFn: async () => {
      // While changes are on their way, the server is behind the cache —
      // keep what's here, and fetch for real once the queue is done.
      const cached = queryClient.getQueryData(queryKey);
      if (cached !== undefined && hasPendingChanges()) {
        refetchAfterQueue([queryKey]);
        return cached;
      }
      return shape(await request("GET", path));
    },
    // Refreshed all at once by GET /api/me when the app comes to the front
    // (services/sync), and after changes; no need to refetch per screen.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
});

// ---- Queued changes ------------------------------------------------------------

const newKey = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

// Query keys to refetch once the queue is empty, by their JSON.
const touched = new Map();
const touch = (queryKeyList) =>
  queryKeyList.forEach((queryKey) =>
    touched.set(JSON.stringify(queryKey), queryKey),
  );
let refetchTimer = null;

const scheduleRefetch = () => {
  clearTimeout(refetchTimer);
  // After the settling mutation has left the "pending" count.
  refetchTimer = setTimeout(() => {
    if (hasPendingChanges() || touched.size === 0) return;
    const keys = [...touched.values()];
    touched.clear();
    keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  }, 0);
};

// Refetches these queries as soon as every waiting change has been sent
// (right away if none are waiting).
export const refetchAfterQueue = (queryKeyList) => {
  touch(queryKeyList);
  scheduleRefetch();
};

// A change queued by an account that's no longer signed in (it signed out
// with changes waiting, maybe someone else signed in): never sent.
class OtherAccountError extends Error {}

const currentAccount = () => useAuthStore.getState().user?.id ?? null;

queryClient.setMutationDefaults(SYNC_KEY, {
  mutationFn: async ({ method, path, body, key, account }) => {
    if (account !== currentAccount()) throw new OtherAccountError();
    return request(method, path, body, { idempotencyKey: key });
  },
  // One queue: each change waits for the one before it.
  scope: { id: "account" },
  // Unreachable: keep trying (paused while offline). Server errors: a few
  // more tries. Anything the server rejected outright stays rejected.
  retry: (failureCount, error) =>
    error instanceof ApiError &&
    (error.status === 0 || (error.status >= 500 && failureCount < 5)),
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30 * 1000),
  onError: (error) => {
    if (error instanceof OtherAccountError) return;
    // 401: the session is over — api.js has already signed out.
    if (error instanceof ApiError && error.status === 401) return;
    showToast(
      t("Couldn't save that change: {error}", { error: error.message }),
    );
    // Refetch the whole account, undoing the change wherever it showed.
    touch([queryKeys.account]);
  },
  onSettled: (data, error, { invalidate }) => {
    if (error instanceof OtherAccountError) return;
    touch(invalidate);
    scheduleRefetch();
  },
});

// Changes made in quick succession to the same thing (typing a bio,
// dragging a board's order, ticking through settings) are merged into one
// call while it waits to be queued: { [merge]: { change, timer } }.
const merging = new Map();

export const hasPendingChanges = () =>
  merging.size > 0 || queryClient.isMutating({ mutationKey: SYNC_KEY }) > 0;

// Bumped on every change, so a GET /api/me that was already on its way when
// the change was made knows it's out of date (services/sync).
let changeCount = 0;
export const getChangeCount = () => changeCount;

const enqueue = ({ method, path, body, invalidate }) => {
  new MutationObserver(queryClient, { mutationKey: SYNC_KEY })
    .mutate({
      method,
      path,
      body,
      invalidate,
      key: newKey(),
      account: currentAccount(),
    })
    // Failures are handled in onError above.
    .catch(() => {});
};

// Queues an API call for a change already made in the cache.
//   invalidate  query keys whose data the call changes (refetched after)
//   merge       a key for "latest value wins" calls — a newer change with
//               the same key merges its body into the waiting one
export const queueChange = (
  method,
  path,
  body,
  { invalidate = [], merge } = {},
) => {
  if (!useAuthStore.getState().token) return;
  changeCount += 1;
  if (!merge) {
    // Whatever's merging was changed first, so it goes first.
    flushMerged();
    enqueue({ method, path, body, invalidate });
    return;
  }
  const waiting = merging.get(merge);
  let change = { method, path, body, invalidate };
  if (waiting) {
    clearTimeout(waiting.timer);
    if (waiting.change.method === method && waiting.change.body && body) {
      change = { ...change, body: { ...waiting.change.body, ...body } };
    }
    change.invalidate = [
      ...new Set([...waiting.change.invalidate, ...invalidate]),
    ];
  }
  const timer = setTimeout(() => {
    merging.delete(merge);
    enqueue(change);
  }, MERGE_DELAY_MS);
  merging.set(merge, { change, timer });
};

// Queues the merged changes right away: before a change that isn't merged
// (so the order they were made in holds), and before the app goes to the
// background (so they're saved with the queue).
export const flushMerged = () => {
  merging.forEach(({ change, timer }) => {
    clearTimeout(timer);
    enqueue(change);
  });
  merging.clear();
};

AppState.addEventListener("change", (status) => {
  if (status !== "active") flushMerged();
});

// Picks up the saved queue after a restart: paused changes and any that
// were mid-request when the app closed. Scope keeps them in order.
export const resumeQueue = () => {
  queryClient
    .getMutationCache()
    .getAll()
    .filter((mutation) => mutation.state.status === "pending")
    .forEach((mutation) => mutation.continue().catch(() => {}));
};

// Signing out: forget the account and its waiting changes. The catalog
// isn't the account's, so it stays.
export const clearAccountCache = () => {
  merging.forEach(({ timer }) => clearTimeout(timer));
  merging.clear();
  touched.clear();
  queryClient.getMutationCache().clear();
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== queryKeys.catalog[0],
  });
};

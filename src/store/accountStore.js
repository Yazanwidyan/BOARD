import { useQuery } from "@tanstack/react-query";

import { queryClient } from "../services/queryClient";
import { useAuthStore } from "./authStore";

// A store over one account query in the TanStack Query cache (see
// services/queryClient.js). It keeps the shape the screens were written
// against — so they didn't have to change:
//
//   const watched = useMovieStore((state) => state.watched);  // in a component
//   useMovieStore.getState().toggleWatched(movieId);          // anywhere
//
// The hook is a useQuery on the store's key, so the data is fetched,
// cached, saved on the device and refetched by TanStack Query; the
// selector picks out what the component needs, and the component only
// re-renders when that changes.
//
//   queryKey  the account query this store reads and writes
//   initial   the state before the account has loaded
//   view      cached data → store state (when their shapes differ)
//   actions   ({ get, set }) => ({ ...actions }). `set(changes)` writes
//             into the cache — an object, or a function of the current
//             data — and actions queue the API call with queueChange().
export const createAccountStore = ({
  queryKey,
  initial,
  view = (data) => data,
  actions,
}) => {
  let boundActions = {};
  let lastData;
  let lastState;

  // One state object per version of the data, so selectors get stable
  // references and getState() is cheap.
  const stateOf = (data) => {
    if (!lastState || data !== lastData) {
      lastData = data;
      lastState = {
        ...initial,
        ...(data === undefined ? {} : view(data)),
        ...boundActions,
      };
    }
    return lastState;
  };

  const getState = () => stateOf(queryClient.getQueryData(queryKey));

  const set = (changes) => {
    // A refetch already on its way would land on top of this change with
    // older data — drop it (the queue refetches once the change is saved).
    queryClient.cancelQueries({ queryKey, exact: true });
    queryClient.setQueryData(queryKey, (data = {}) => ({
      ...data,
      ...(typeof changes === "function" ? changes(data) : changes),
    }));
  };

  boundActions = actions({ get: getState, set });

  const useStore = (selector = (state) => state) => {
    const signedIn = useAuthStore((state) => Boolean(state.token));
    // Wrapped, so a selector that returns undefined still counts as data.
    const { data } = useQuery({
      queryKey,
      enabled: signedIn,
      select: (cached) => ({ value: selector(stateOf(cached)) }),
    });
    return data ? data.value : selector(stateOf(undefined));
  };

  useStore.getState = getState;
  return useStore;
};

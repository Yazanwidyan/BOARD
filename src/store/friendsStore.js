import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { api } from "../services/api";
import { queryKeys } from "../services/queryClient";
import { useRefetchOnFocus } from "../utils/useRefetchOnFocus";
import { useActivitySeenStore } from "./activitySeenStore";
import { useAuthStore } from "./authStore";

// Friends, requests and the activity feed — other people's data, so plain
// TanStack queries: cached (and saved on the device) for an instant screen,
// refetched in the background when a screen opens or comes back into view.
// Friends come in the same shape the mock ones had —
// { id, name, handle, color, level, watched: [{ movieId, tier }] } — so
// utils/friends.js works on them unchanged.
const EMPTY = [];

const useSignedIn = () => useAuthStore((state) => Boolean(state.token));

export const useFriends = () => {
  const queryClient = useQueryClient();
  const enabled = useSignedIn();
  const friendsQuery = useQuery({
    queryKey: queryKeys.friends,
    queryFn: async () => (await api.get("/friends")).friends,
    enabled,
  });
  const requestsQuery = useQuery({
    queryKey: queryKeys.friendRequests,
    queryFn: () => api.get("/friends/requests"),
    enabled,
  });
  const activityQuery = useQuery({
    queryKey: queryKeys.activity,
    queryFn: async () => (await api.get("/activity?limit=50")).activity,
    enabled,
  });
  const queries = [friendsQuery, requestsQuery, activityQuery];

  const refresh = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.friends }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activity }),
      ]),
    [queryClient],
  );
  useRefetchOnFocus(refresh);

  // Every change to who your friends are also changes the feed.
  const onSuccess = () => refresh();

  // Resolves to "friends" when they'd already asked you (so it's accepted
  // straight away), "outgoing" when it's a new request.
  const send = useMutation({
    mutationFn: async (handle) =>
      (await api.post("/friends/requests", { handle })).relationship,
    onSuccess,
  });
  const accept = useMutation({
    mutationFn: (userId) => api.post(`/friends/requests/${userId}/accept`),
    onSuccess,
  });
  // Decline a request to you, or cancel one you sent.
  const drop = useMutation({
    mutationFn: (userId) => api.delete(`/friends/requests/${userId}`),
    onSuccess,
  });
  const remove = useMutation({
    mutationFn: (userId) => api.delete(`/friends/${userId}`),
    onSuccess,
  });

  return {
    friends: friendsQuery.data ?? EMPTY,
    incoming: requestsQuery.data?.incoming ?? EMPTY,
    outgoing: requestsQuery.data?.outgoing ?? EMPTY,
    activity: activityQuery.data ?? EMPTY,
    loaded: queries.every((query) => query.data !== undefined),
    loading: queries.some((query) => query.isFetching),
    error: queries.find((query) => query.error)?.error?.message ?? null,
    refresh,
    sendRequest: send.mutateAsync,
    acceptRequest: accept.mutateAsync,
    dropRequest: drop.mutateAsync,
    removeFriend: remove.mutateAsync,
  };
};

// What the bell counts: friend requests waiting on you, plus friends'
// activity since you last opened Activity.
export const useNotificationCount = () => {
  const userId = useAuthStore((state) => state.user?.id);
  const seenAt = useActivitySeenStore((state) => state.seenAt[userId] ?? 0);
  const { incoming, activity } = useFriends();
  return incoming.length + activity.filter((event) => event.timestamp > seenAt).length;
};

export default useFriends;

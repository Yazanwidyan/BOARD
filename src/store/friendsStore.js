import { create } from "zustand";

import { api } from "../services/api";
import { useAuthStore } from "./authStore";

// Friends, requests and the activity feed, from the server.
// Not persisted — screens refresh it when they open.
// Friends come in the same shape the mock ones had —
// { id, name, handle, color, level, watched: [{ movieId, tier }] } — so
// utils/friends.js works on them unchanged.
const EMPTY = {
  friends: [],
  incoming: [],
  outgoing: [],
  activity: [],
  loaded: false,
  error: null,
};

export const useFriendsStore = create((set, get) => ({
  ...EMPTY,
  loading: false,

  refresh: async () => {
    if (!useAuthStore.getState().token) {
      set({ ...EMPTY, loading: false });
      return;
    }
    set({ loading: true });
    try {
      const [friends, requests, feed] = await Promise.all([
        api.get("/friends"),
        api.get("/friends/requests"),
        api.get("/activity?limit=50"),
      ]);
      set({
        friends: friends.friends,
        incoming: requests.incoming,
        outgoing: requests.outgoing,
        activity: feed.activity,
        loaded: true,
        loading: false,
        error: null,
      });
    } catch (error) {
      set({ loading: false, error: error.message });
    }
  },

  // Returns "friends" when they'd already asked you (so it's accepted
  // straight away), "outgoing" when it's a new request.
  sendRequest: async (handle) => {
    const { relationship } = await api.post("/friends/requests", { handle });
    await get().refresh();
    return relationship;
  },

  acceptRequest: async (userId) => {
    await api.post(`/friends/requests/${userId}/accept`);
    await get().refresh();
  },

  // Decline a request to you, or cancel one you sent.
  dropRequest: async (userId) => {
    await api.delete(`/friends/requests/${userId}`);
    await get().refresh();
  },

  removeFriend: async (userId) => {
    await api.delete(`/friends/${userId}`);
    await get().refresh();
  },
}));

// Forget everything when the session ends.
useAuthStore.subscribe((state, prev) => {
  if (prev.token && !state.token) useFriendsStore.setState({ ...EMPTY, loading: false });
});

export const getFriend = (friendId) =>
  useFriendsStore.getState().friends.find((friend) => friend.id === friendId) ?? null;

export default useFriendsStore;

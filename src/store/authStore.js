import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// The signed-in ReelBoard account. A session is required: the account's
// data lives on the server, cached on the device by TanStack Query (see
// services/queryClient.js); this keeps the session, so the app stays
// signed in.
//
//   user:   the server's profile — { id, email, displayName, handle, … }
//   status: loading the account into the app after sign-in / launch —
//           "idle" | "loading" | "ready" | "error" (not saved)
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      status: "idle",
      statusError: null,

      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      setStatus: (status, statusError = null) => set({ status, statusError }),
      clearSession: () =>
        set({ token: null, user: null, status: "idle", statusError: null }),
    }),
    {
      name: "board:auth-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ token, user }) => ({ token, user }),
    },
  ),
);

export default useAuthStore;

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// When you last looked at Activity, per account on this phone — so the
// bell can count what's new since. { seenAt: { [userId]: timestamp } }.
export const useActivitySeenStore = create(
  persist(
    (set) => ({
      seenAt: {},
      markSeen: (userId, at = Date.now()) =>
        set((state) => ({ seenAt: { ...state.seenAt, [userId]: at } })),
    }),
    {
      name: "board:activity-seen-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useActivitySeenStore;

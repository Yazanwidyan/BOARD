import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// First-visit tips: which screens' tip cards you've already dismissed.
// Settings → "Show tips again" clears it.
export const useTipsStore = create(
  persist(
    (set) => ({
      seen: {},
      markSeen: (id) =>
        set((state) => ({ seen: { ...state.seen, [id]: true } })),
      resetTips: () => set({ seen: {} }),
    }),
    {
      name: "board:tips-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useTipsStore;

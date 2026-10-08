import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// The app's appearance: follow the phone ("system"), or always "light" /
// "dark". Read through useColors(); changed in Settings → Appearance.
export const THEME_MODES = ["system", "light", "dark"];

export const useThemeStore = create(
  persist(
    (set) => ({
      mode: "system",
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "board:theme-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useThemeStore;

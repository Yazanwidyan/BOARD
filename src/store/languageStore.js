import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// The app's language: "en" or "ar". Changed in Settings → Language; see
// src/i18n for translating and for the RTL switch (which restarts the app).
export const LANGUAGES = ["en", "ar"];

export const useLanguageStore = create(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "board:language-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useLanguageStore;

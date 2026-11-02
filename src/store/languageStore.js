import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// The app's language: "en" or "ar". Changed in Settings → Language; see
// src/i18n for translating and for the RTL switch (which restarts the app).
// On a phone set to Arabic, the app opens in Arabic the first time
// (`chosen` stays false until a language is set, so the phone's is only
// used then).
export const LANGUAGES = ["en", "ar"];

const phoneLanguage = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale?.toLowerCase().startsWith("ar") ? "ar" : "en";
  } catch {
    return "en";
  }
};

export const useLanguageStore = create(
  persist(
    (set) => ({
      language: "en",
      chosen: false,
      setLanguage: (language) => set({ language, chosen: true }),
    }),
    {
      name: "board:language-store",
      storage: createJSONStorage(() => AsyncStorage),
      // First launch: the phone's language, when it's one the app speaks.
      onRehydrateStorage: () => (state) => {
        if (state && !state.chosen && phoneLanguage() === "ar") state.setLanguage("ar");
      },
    },
  ),
);

export default useLanguageStore;

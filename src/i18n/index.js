import { I18nManager } from "react-native";

import { useLanguageStore } from "../store/languageStore";
import ar from "./ar";

// Translations are keyed by the English text itself, so the English UI
// needs no dictionary and a missing Arabic entry just falls back to
// English. Placeholders look like {count} and are filled from `params`.
//
//   const t = useT();
//   t("Mark as watched")
//   t("{count} movies", { count: 12 })
const DICTIONARIES = { ar };

const fill = (text, params) =>
  params
    ? text.replace(/\{(\w+)\}/g, (match, key) =>
        params[key] === undefined ? match : String(params[key]),
      )
    : text;

export const translate = (language, text, params) =>
  fill((language !== "en" && DICTIONARIES[language]?.[text]) || text, params);

// Exact lookup with no placeholders — used by the app's Text component to
// translate plain strings that come from data (labels, genres, names).
export const translateExact = (text) => {
  const language = useLanguageStore.getState().language;
  if (language === "en") return text;
  return DICTIONARIES[language]?.[text] ?? text;
};

// For components: re-renders when the language changes.
export const useT = () => {
  const language = useLanguageStore((state) => state.language);
  return (text, params) => translate(language, text, params);
};

// For code outside components (stores, utils, toasts).
export const t = (text, params) =>
  translate(useLanguageStore.getState().language, text, params);

export const isRTLLanguage = (language) => language === "ar";

// Arabic reads right-to-left. The app mirrors its own layout (App.js and
// each modal set `direction` from this), rather than asking the system to
// flip — which Expo Go overrides and which needs a restart. So switching
// language is instant everywhere.
export const useIsRTL = () =>
  useLanguageStore((state) => isRTLLanguage(state.language));
export const isRTL = () => isRTLLanguage(useLanguageStore.getState().language);
export const useLayoutDirection = () => (useIsRTL() ? "rtl" : "ltr");

// Switch language: the app redraws in place (App.js keys its tree on it).
export const changeLanguage = (language) => {
  useLanguageStore.getState().setLanguage(language);
};

// On launch: keep the system's own RTL off — the app handles direction
// itself, and a system flip on top would mirror everything twice.
export const syncLayoutDirection = () => {
  I18nManager.allowRTL(false);
  if (I18nManager.isRTL) I18nManager.forceRTL(false);
};

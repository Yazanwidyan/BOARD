import { useProfileStore } from "../store/profileStore";

// ReelBoard Pro, on this side: who's Pro comes from the server (the
// profile's `pro`: { active, since, until, source }; friends' `pro` is
// true/false), and Pro unlocks deeper taste stats and profile style — a
// PRO badge and an accent colour friends see too. The accents' keys are the
// server's (lib/pro.js); their colours are here.
export const PRO_ACCENTS = [
  { key: "slate", label: "Slate", color: "#ABABAB" },
  { key: "green", label: "Green", color: "#00E054" },
  { key: "orange", label: "Orange", color: "#FF8000" },
  { key: "blue", label: "Blue", color: "#40BCF4" },
  { key: "rose", label: "Rose", color: "#FF6B8B" },
  { key: "gold", label: "Gold", color: "#E5B94E" },
];

export const accentColor = (key) => PRO_ACCENTS.find((accent) => accent.key === key)?.color ?? null;

export const useIsPro = () => useProfileStore((state) => Boolean(state.pro?.active));

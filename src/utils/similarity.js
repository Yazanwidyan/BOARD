import { DIMENSIONS, THEMES, getVibe } from "../data/vibes";
import { t } from "../i18n";

// What two films share, explained — for Decide's "More like…": one row per
// part of the likeness the server measured (backend lib/similar.js), each
// with how strong it is (0–1, for a bar) and a sentence saying what it is.
//
//   explainSimilarity(target, other, item) → [{ key, label, value, text }]
//   `item`: one of GET /api/movies/:id/like's `similar` ({ signals, shared }).

const PARTS = [
  { key: "feel", label: "Feel" },
  { key: "story", label: "Story" },
  { key: "genres", label: "Genres" },
  { key: "themes", label: "Themes" },
  { key: "cast", label: "Cast" },
  { key: "era", label: "Era" },
  { key: "tmdb", label: "Fans" },
];
// Descriptions rarely share much, so a story score this high already
// reads as a full bar.
const STORY_FULL = 0.3;
// A Taste DNA value this far to one side counts as "both are…".
const LEANS_HIGH = 4;
const LEANS_LOW = 2;

const themeLabel = (key) => (THEMES[key] ? t(THEMES[key]) : key);

// "Both feel dark, fast and epic" — the Taste DNA sides both films lean.
const feelText = (target, other) => {
  const a = getVibe(target.id).dims;
  const b = getVibe(other.id).dims;
  const shared = DIMENSIONS.flatMap((dimension, index) => {
    if (a[index] >= LEANS_HIGH && b[index] >= LEANS_HIGH) return [t(dimension.high)];
    if (a[index] <= LEANS_LOW && b[index] <= LEANS_LOW) return [t(dimension.low)];
    return [];
  });
  return shared.length > 0
    ? t("Both feel {words}", { words: shared.slice(0, 3).join(", ") })
    : t("A similar overall feel");
};

const textFor = (key, target, other, item) => {
  const shared = item.shared ?? {};
  switch (key) {
    case "feel":
      return feelText(target, other);
    case "story":
      return shared.story?.length
        ? t("Both stories mention {words}", { words: shared.story.map((word) => `“${word}”`).join(", ") })
        : t("Their stories overlap a little");
    case "genres":
      return t("Both are {genres}", { genres: (shared.genres ?? []).map((genre) => t(genre)).join(" · ") });
    case "themes":
      return t("Shared themes: {themes}", { themes: (shared.themes ?? []).map(themeLabel).join(", ") });
    case "cast":
      return t("{name} is in both", { name: shared.cast?.[0] ?? "" });
    case "era": {
      const apart = Math.abs((target.year ?? 0) - (other.year ?? 0));
      return apart === 0
        ? t("Both from {year}", { year: other.year })
        : t("Made {count} years apart", { count: apart });
    }
    case "tmdb":
      return t("TMDB recommends it to fans of {title}", { title: target.title });
    default:
      return "";
  }
};

export const explainSimilarity = (target, other, item) =>
  PARTS.map(({ key, label }) => {
    const raw = item.signals?.[key] ?? 0;
    const value = key === "story" ? Math.min(1, raw / STORY_FULL) : raw;
    return { key, label: t(label), value, text: value > 0 ? textFor(key, target, other, item) : null };
  }).filter((part) => part.value > 0.05 && part.text);

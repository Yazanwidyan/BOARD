import { DIMENSIONS, getVibe } from "../data/vibes";
import { t } from "../i18n";

// What two films share, explained — for Decide's "More like…": one row per
// part of the likeness the server measured (backend lib/similar.js: fans,
// topics, feel, genres, story, cast, era), each with how strong it is (0–1,
// for a bar) and a sentence saying what it is.
//
//   explainSimilarity(target, other, item) → [{ key, label, value, text }]
//   `item`: one of GET /api/movies/:id/like's `similar` ({ signals, shared }).

const PARTS = [
  { key: "fans", label: "Fans" },
  { key: "topics", label: "About" },
  { key: "feel", label: "Feel" },
  { key: "genres", label: "Genres" },
  { key: "story", label: "Story" },
  { key: "cast", label: "Cast" },
  { key: "era", label: "Era" },
];
// A Taste DNA value this far to one side counts as "both are…".
const LEANS_HIGH = 4;
const LEANS_LOW = 2;

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
    case "topics":
      return shared.topics?.length
        ? t("Both about: {topics}", { topics: shared.topics.join(", ") })
        : t("About similar things");
    case "cast":
      return t("{name} is in both", { name: shared.cast?.[0] ?? "" });
    case "era": {
      const apart = Math.abs((target.year ?? 0) - (other.year ?? 0));
      return apart === 0
        ? t("Both from {year}", { year: other.year })
        : t("Made {count} years apart", { count: apart });
    }
    case "fans":
      return t("People who liked {title} went on to like it", { title: target.title });
    default:
      return "";
  }
};

export const explainSimilarity = (target, other, item) =>
  PARTS.map(({ key, label }) => {
    const value = item.signals?.[key] ?? 0;
    return { key, label: t(label), value, text: value > 0 ? textFor(key, target, other, item) : null };
  }).filter((part) => part.value > 0.05 && part.text);

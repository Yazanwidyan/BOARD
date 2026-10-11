import { MOVIES } from "../data/movies";
import { DIMENSIONS, getVibe } from "../data/vibes";
import { useMovieStore } from "../store/movieStore";
import { matchesGenres } from "./movieFilters";
import { buildMyTasteModel } from "./tasteEngine";

// Home's "What are we watching?" asks for a feeling instead of a tool.
// A mood is a feeling, not a genre: each one targets the Taste DNA
// dimensions it's about (see data/vibes.js — "mind-bending" is a high
// `mind`, "easy watch" is light, low-weight and easy). `genres` only
// filters where a feeling really needs it (scary means horror or thriller);
// `maxRuntime` caps length.
export const MOODS = [
  { key: "funny", emoji: "😂", label: "Funny", target: { dark: 1, heavy: 1 } },
  {
    key: "scary",
    emoji: "😱",
    label: "Scary",
    target: { dark: 5 },
    genres: ["Horror", "Thriller"],
  },
  {
    key: "mind-bending",
    emoji: "🤯",
    label: "Mind-bending",
    target: { mind: 5 },
  },
  {
    key: "emotional",
    emoji: "💔",
    label: "Emotional",
    target: { heavy: 5 },
  },
  { key: "epic", emoji: "🚀", label: "Epic", target: { scale: 5, pace: 4 } },
  {
    key: "easy",
    emoji: "🍿",
    label: "Easy watch",
    target: { mind: 1, heavy: 1, dark: 1 },
    maxRuntime: 120,
  },
];

export const getMood = (key) => MOODS.find((mood) => mood.key === key) ?? null;

// How many of the best matches to choose randomly among — high enough to
// vary between taps, low enough that every pick fits the mood.
const POOL_SIZE = 20;
const DIM_INDEX = Object.fromEntries(
  DIMENSIONS.map((dimension, index) => [dimension.key, index]),
);

// How well a movie fits a mood: closeness on the mood's dimensions (0 is a
// perfect fit, more negative is further), plus a little for quality, plus
// a little for fitting your own taste — so two people's "Funny" differ.
const moodScore = (movie, mood, fingerprint) => {
  const { dims } = getVibe(movie.id);
  const targets = Object.entries(mood.target);
  const miss =
    targets.reduce(
      (sum, [key, value]) => sum + Math.abs(dims[DIM_INDEX[key]] - value),
      0,
    ) / targets.length;
  let score = -miss + 0.4 * (movie.rating - 8);
  if (fingerprint) {
    const distance = Math.sqrt(
      fingerprint.reduce((sum, value, index) => sum + (value - dims[index]) ** 2, 0),
    );
    score -= distance * 0.12;
  }
  return score;
};

// A random well-fitting, unwatched movie for the mood. `excludeIds` lets a
// reroll skip the current pick. Falls back to watched movies only if the
// mood has nothing unwatched left, and returns null if nothing matches.
export const pickMovieForMood = (moodKey, excludeIds = []) => {
  const mood = getMood(moodKey);
  if (!mood) return null;
  const { watched } = useMovieStore.getState();
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const { fingerprint } = buildMyTasteModel(watched);
  const matches = MOVIES.filter(
    (movie) =>
      (!mood.genres || matchesGenres(movie, mood.genres)) &&
      (!mood.maxRuntime || movie.runtime <= mood.maxRuntime) &&
      !excludeIds.includes(movie.id),
  )
    .map((movie) => ({ movie, score: moodScore(movie, mood, fingerprint) }))
    .sort((a, b) => b.score - a.score)
    .map(({ movie }) => movie);
  const unwatched = matches.filter((movie) => !watchedIds.has(movie.id));
  const pool = (unwatched.length > 0 ? unwatched : matches).slice(0, POOL_SIZE);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
};

import { MOVIES } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { matchesGenres } from "./movieFilters";

// Home's "What are we watching?" asks for a feeling instead of a tool.
// Each mood is a set of the catalog's real genres (plus an optional
// runtime cap), so a pick is always derived from actual movie data.
export const MOODS = [
  { key: "funny", emoji: "😂", label: "Funny", genres: ["Comedy"] },
  { key: "scary", emoji: "😱", label: "Scary", genres: ["Horror", "Thriller"] },
  {
    key: "mind-bending",
    emoji: "🤯",
    label: "Mind-bending",
    genres: ["Sci-Fi", "Mystery"],
  },
  {
    key: "emotional",
    emoji: "💔",
    label: "Emotional",
    genres: ["Drama", "Romance"],
  },
  {
    key: "epic",
    emoji: "🚀",
    label: "Epic",
    genres: ["Adventure", "Action", "Fantasy"],
  },
  {
    key: "easy",
    emoji: "🍿",
    label: "Easy watch",
    genres: ["Animation", "Comedy"],
    maxRuntime: 120,
  },
];

export const getMood = (key) => MOODS.find((mood) => mood.key === key) ?? null;

// How many of the best-rated matches to choose randomly among — high
// enough to vary between taps, low enough that every pick is a good one.
const POOL_SIZE = 25;

// A random well-rated, unwatched movie for the mood. `excludeIds` lets a
// reroll skip the current pick. Falls back to watched movies only if the
// mood has nothing unwatched left, and returns null if nothing matches.
export const pickMovieForMood = (moodKey, excludeIds = []) => {
  const mood = getMood(moodKey);
  if (!mood) return null;
  const watchedIds = new Set(
    useMovieStore.getState().watched.map((entry) => entry.movieId),
  );
  const matches = MOVIES.filter(
    (movie) =>
      matchesGenres(movie, mood.genres) &&
      (!mood.maxRuntime || movie.runtime <= mood.maxRuntime) &&
      !excludeIds.includes(movie.id),
  ).sort((a, b) => b.rating - a.rating);
  const unwatched = matches.filter((movie) => !watchedIds.has(movie.id));
  const pool = (unwatched.length > 0 ? unwatched : matches).slice(0, POOL_SIZE);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
};

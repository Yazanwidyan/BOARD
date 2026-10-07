import { getMovieById } from "../data/movies";
import { isRated } from "./tiers";
import { getCollectionProgress, getCollectionSections } from "./collections";

// XP is a picture of what kind of movie watcher you are — earned only from
// what you've actually watched, weighted toward range (new genres, new
// decades) and depth (knowing a director, finishing a collection). It
// never decays, doesn't care when you watched, and nothing rewards simply
// opening the app. Badges and challenges are recognition / fun ways to
// choose — they don't add XP of their own (a challenge's movie still
// counts as a normal watch).
//
// Everything is derived from the watched list each time — nothing stored —
// and each bonus counts once per genre / decade / director / collection,
// so the total doesn't depend on the order movies were watched in.
export const WATCH_XP = 100;
export const NEW_GENRE_XP = 50;
export const NEW_DECADE_XP = 50;
// Awarded once per director, when you've seen 3 of their films.
export const DIRECTOR_DEPTH_XP = 75;
export const DIRECTOR_DEPTH_FILMS = 3;
export const COLLECTION_XP = 200;
// Only finishing a real body of work counts: a franchise, a director's or
// an actor's films, with at least this many in the catalog. Genre/decade
// "Best of" lists fill up as a side effect of watching anyway, and 2-film
// sets are too small to be an achievement — counting them double-paid
// for watching itself.
const XP_COLLECTION_TYPES = ["franchise", "director", "actor"];
const XP_COLLECTION_MIN_SIZE = 3;

const XP_COLLECTIONS = () =>
  getCollectionSections()
    .filter((section) => XP_COLLECTION_TYPES.includes(section.type))
    .flatMap((section) => section.collections)
    .filter((collection) => collection.movies.length >= XP_COLLECTION_MIN_SIZE);

export const getCompletedXPCollections = (watchedIds) =>
  XP_COLLECTIONS().filter(
    (collection) =>
      getCollectionProgress(collection, watchedIds).progress === 1,
  );
export const RATE_XP = 10;

export const decadeOf = (year) => `${Math.floor(year / 10) * 10}s`;

// Each XP source, counted from the watched list. Rewatches add nothing —
// they're part of your history, not more range.
export const getXPBreakdown = (watched) => {
  const movies = watched
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean);
  const genres = new Set(movies.flatMap((movie) => movie.genres));
  const decades = new Set(movies.map((movie) => decadeOf(movie.year)));
  const directorCounts = new Map();
  movies.forEach((movie) =>
    directorCounts.set(
      movie.director,
      (directorCounts.get(movie.director) ?? 0) + 1,
    ),
  );
  const deepDirectors = [...directorCounts.entries()]
    .filter(([, count]) => count >= DIRECTOR_DEPTH_FILMS)
    .map(([director]) => director);
  const watchedIds = new Set(watched.map((entry) => entry.movieId));

  // XP per source, plus the sets behind the bonuses (so feedback can say
  // *which* genre / decade / director was new).
  const xp = {
    watched: movies.length * WATCH_XP,
    genres: genres.size * NEW_GENRE_XP,
    decades: decades.size * NEW_DECADE_XP,
    directors: deepDirectors.length * DIRECTOR_DEPTH_XP,
    collections: getCompletedXPCollections(watchedIds).length * COLLECTION_XP,
    rated: watched.filter(isRated).length * RATE_XP,
  };
  return {
    xp,
    total: Object.values(xp).reduce((sum, value) => sum + value, 0),
    genres: [...genres],
    decades: [...decades],
    deepDirectors,
  };
};

export const getUserXP = (watched) => getXPBreakdown(watched).total;

export const getCompletedChallengesCount = (history) =>
  history.filter((entry) => entry.status === "completed").length;

// Challenge difficulty bands — still used to size a challenge (Easy /
// Medium / Hard), even though challenges no longer add XP themselves.
export const DIFFICULTY = {
  EASY: { label: "Easy", min: 100, max: 250 },
  MEDIUM: { label: "Medium", min: 300, max: 600 },
  HARD: { label: "Hard", min: 700, max: 1200 },
  EXTREME: { label: "Extreme", min: 1500, max: 2000 },
};

// XP required to clear a given level — grows steadily so higher levels take
// meaningfully longer, without needing a lookup table.
const levelRequirement = (level) => 800 + (level - 1) * 90;

const LEVEL_NAMES = [
  { through: 5, name: "Opening Credits" },
  { through: 12, name: "Movie Fan" },
  { through: 20, name: "Film Buff" },
  { through: 30, name: "Cinephile" },
  { through: 45, name: "Film Expert" },
  { through: Infinity, name: "Cinema Legend" },
];

export const getLevelName = (level) =>
  LEVEL_NAMES.find(({ through }) => level <= through).name;

// Walks up from level 1, spending XP on each level's requirement, until
// there's not enough left for the next one — that's the current level, and
// what's left over is progress into it.
export const getLevel = (xp) => {
  let level = 1;
  let remaining = xp;
  let required = levelRequirement(level);
  while (remaining >= required) {
    remaining -= required;
    level += 1;
    required = levelRequirement(level);
  }
  return {
    level,
    name: getLevelName(level),
    currentXP: remaining,
    requiredXP: required,
    progress: remaining / required,
  };
};

export default getUserXP;

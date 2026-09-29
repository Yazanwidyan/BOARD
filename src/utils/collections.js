import { MOVIES } from "../data/movies";

// A collection needs at least this many real entries to be worth surfacing
// as an objective — a franchise with one stray title in the catalog would
// be a hollow "complete it" claim, so it's filtered out entirely rather
// than shown as a fake-feeling collection.
const MIN_COLLECTION_SIZE = 2;

// Genre/decade groups can be huge (e.g. "Drama" spans over half the
// catalog) — too big to be a meaningful objective and too big for the path
// screen to render as nodes. Past this size they're curated down to the
// top-ranked entries and the title says so, rather than silently claiming
// to represent the whole genre/decade.
const CURATED_SIZE = 15;

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const groupBy = (movies, keyFn) => {
  const map = new Map();
  movies.forEach((movie) => {
    const key = keyFn(movie);
    if (key == null) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(movie);
  });
  return map;
};

const buildFranchiseCollections = () =>
  [...groupBy(MOVIES, (movie) => movie.franchise).entries()]
    .filter(([, movies]) => movies.length >= MIN_COLLECTION_SIZE)
    .map(([franchise, movies]) => ({
      id: `franchise-${slugify(franchise)}`,
      type: "franchise",
      title: franchise,
      movies: [...movies].sort((a, b) => a.year - b.year),
    }));

const decadeLabel = (year) => `${Math.floor(year / 10) * 10}s`;

// Sorts by rank (best first) and, if there are more than CURATED_SIZE
// entries, trims to the top ones — returning both the trimmed list and
// whether curation actually happened, so the title can say so only when true.
const rankTopN = (movies) => {
  const sorted = [...movies].sort((a, b) => a.rank - b.rank);
  const curated = sorted.length > CURATED_SIZE;
  return { movies: curated ? sorted.slice(0, CURATED_SIZE) : sorted, curated };
};

const buildDecadeCollections = () =>
  [...groupBy(MOVIES, (movie) => decadeLabel(movie.year)).entries()]
    .filter(([, movies]) => movies.length >= MIN_COLLECTION_SIZE)
    .map(([decade, rawMovies]) => {
      const { movies, curated } = rankTopN(rawMovies);
      return {
        id: `decade-${slugify(decade)}`,
        type: "decade",
        title: curated ? `Best of the ${decade}` : decade,
        movies,
      };
    });

const buildGenreCollections = () => {
  const map = new Map();
  MOVIES.forEach((movie) => {
    movie.genres.forEach((genre) => {
      if (!map.has(genre)) map.set(genre, []);
      map.get(genre).push(movie);
    });
  });
  return [...map.entries()]
    .filter(([, movies]) => movies.length >= MIN_COLLECTION_SIZE)
    .map(([genre, rawMovies]) => {
      const { movies, curated } = rankTopN(rawMovies);
      return {
        id: `genre-${slugify(genre)}`,
        type: "genre",
        title: curated ? `Best of ${genre}` : genre,
        movies,
      };
    });
};

// Computed once at module load — the catalog itself doesn't change at
// runtime, only which of its movies are watched does.
const FRANCHISE_COLLECTIONS = buildFranchiseCollections();
const DECADE_COLLECTIONS = buildDecadeCollections();
const GENRE_COLLECTIONS = buildGenreCollections();
const ALL_COLLECTIONS = [
  ...FRANCHISE_COLLECTIONS,
  ...DECADE_COLLECTIONS,
  ...GENRE_COLLECTIONS,
];

export const getCollectionSections = () => [
  { type: "franchise", title: "Franchises", collections: FRANCHISE_COLLECTIONS },
  { type: "decade", title: "Decades", collections: DECADE_COLLECTIONS },
  { type: "genre", title: "Genres", collections: GENRE_COLLECTIONS },
].filter((section) => section.collections.length > 0);

export const getCollectionById = (id) =>
  ALL_COLLECTIONS.find((collection) => collection.id === id);

// `watchedIds` is a Set of movie ids, built once by the caller from the
// real watched list, so progress is always derived live rather than stored.
export const getCollectionProgress = (collection, watchedIds) => {
  const watchedCount = collection.movies.filter((movie) =>
    watchedIds.has(movie.id),
  ).length;
  const total = collection.movies.length;
  return {
    watchedCount,
    total,
    progress: total === 0 ? 0 : watchedCount / total,
  };
};

// How many collections are fully watched — feeds both the Collections
// badge ladder and the league score's completion bonus.
export const getCompletedCollectionsCount = (watchedIds) =>
  ALL_COLLECTIONS.filter(
    (collection) => getCollectionProgress(collection, watchedIds).progress === 1,
  ).length;

// The collection that's furthest along without being finished — the one
// real "what should I continue" answer, not a suggestion, since there's
// nothing to feature if nothing's actually in progress.
export const getCurrentCollection = (watchedIds) => {
  let current = null;
  let bestProgress = 0;
  ALL_COLLECTIONS.forEach((collection) => {
    const { progress } = getCollectionProgress(collection, watchedIds);
    if (progress > 0 && progress < 1 && progress > bestProgress) {
      current = collection;
      bestProgress = progress;
    }
  });
  return current;
};

export default getCollectionSections;

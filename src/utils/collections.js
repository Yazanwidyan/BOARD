import { getMovieById } from "../data/movies";

// Collections — a franchise, a director's films, an actor's films, the best
// of a decade or a genre. They're worked out on the server from its 8,000
// movies (the backend's lib/collections.js, which also counts them for XP),
// and the app gets the ones it needs as definitions —
//   { id, type, title, movieIds }
// — with your library (the ones you've started or unlocked), from
// GET /api/collections (the best-known ones, to browse), and with any movie
// you open (the ones it's in). services/api.js remembers every response's
// `collections` (in memory only).
//
// Counts and progress come from `movieIds`, so they're exact. `movies` is
// the films the app has so far; any it doesn't have are fetched (see
// data/movies.js), and screens showing them re-render when they arrive.

const SECTIONS = [
  { type: "franchise", title: "Franchises" },
  { type: "director", title: "Directors" },
  { type: "actor", title: "Actors" },
  { type: "decade", title: "Decades" },
  { type: "genre", title: "Genres" },
];

const registry = new Map();
let version = 0;

const toCollection = (definition) => ({
  id: definition.id,
  type: definition.type,
  title: definition.title,
  movieIds: definition.movieIds,
  get movies() {
    return this.movieIds.map(getMovieById).filter(Boolean);
  },
});

const isDefinition = (item) =>
  item &&
  typeof item.id === "string" &&
  typeof item.type === "string" &&
  Array.isArray(item.movieIds);

// True if anything new arrived.
export const rememberCollections = (definitions) => {
  if (!Array.isArray(definitions)) return false;
  let any = false;
  definitions.filter(isDefinition).forEach((definition) => {
    const current = registry.get(definition.id);
    if (
      current &&
      current.title === definition.title &&
      current.movieIds.join() === definition.movieIds.join()
    ) {
      return;
    }
    registry.set(definition.id, toCollection(definition));
    any = true;
  });
  if (any) version += 1;
  return any;
};

export const forgetCollections = () => {
  registry.clear();
  version += 1;
};

// Which collections each movie is in — rebuilt when collections arrive.
let index = null;
const collectionsByMovie = () => {
  if (index?.version !== version) {
    const byMovie = new Map();
    registry.forEach((collection) =>
      collection.movieIds.forEach((id) => {
        if (!byMovie.has(id)) byMovie.set(id, []);
        byMovie.get(id).push(collection);
      }),
    );
    index = { version, byMovie };
  }
  return index.byMovie;
};

const allCollections = () => [...registry.values()];

export const getCollectionSections = () =>
  SECTIONS.map((section) => ({
    ...section,
    collections: allCollections().filter(
      (collection) => collection.type === section.type,
    ),
  })).filter((section) => section.collections.length > 0);

export const getCollectionById = (id) => registry.get(id);

// Library's Collections tab: a collection is "unlocked" (visible there) once
// you've watched something in it, or chosen to track it from the "See All
// Collections" browser (movieStore's unlockedCollections).
export const getUnlockedCollectionSections = (watchedIds, unlockedCollectionIds) =>
  getCollectionSections()
    .map((section) => ({
      ...section,
      collections: section.collections.filter(
        (collection) =>
          getCollectionProgress(collection, watchedIds).progress > 0 ||
          unlockedCollectionIds.includes(collection.id),
      ),
    }))
    .filter((section) => section.collections.length > 0);

// A single movie can belong to several collections at once (a franchise, a
// director, a decade, a genre) — used by Movie Details' "Your Progress" and
// by the challenge generator to find what a given watch would complete.
export const getCollectionsForMovie = (movieId) =>
  collectionsByMovie().get(movieId) ?? [];

// Which of movieId's collections just became complete BY this watch —
// every other movie in it was already in `watchedIdsBeforeAdd`.
export const getCollectionsCompletedBy = (movieId, watchedIdsBeforeAdd) =>
  getCollectionsForMovie(movieId).filter((collection) =>
    collection.movieIds.every(
      (id) => id === movieId || watchedIdsBeforeAdd.has(id),
    ),
  );

// `watchedIds` is a Set of movie ids, built once by the caller from the
// real watched list, so progress is always derived live rather than stored.
export const getCollectionProgress = (collection, watchedIds) => {
  const watchedCount = collection.movieIds.filter((id) =>
    watchedIds.has(id),
  ).length;
  const total = collection.movieIds.length;
  return {
    watchedCount,
    total,
    progress: total === 0 ? 0 : watchedCount / total,
  };
};

// How many collections are fully watched — feeds both the Collections
// badge ladder and the league score's completion bonus.
export const getCompletedCollectionsCount = (watchedIds) =>
  allCollections().filter(
    (collection) => getCollectionProgress(collection, watchedIds).progress === 1,
  ).length;

// The collection that's furthest along without being finished.
export const getCurrentCollection = (watchedIds) => {
  let current = null;
  let bestProgress = 0;
  allCollections().forEach((collection) => {
    const { progress } = getCollectionProgress(collection, watchedIds);
    if (progress > 0 && progress < 1 && progress > bestProgress) {
      current = collection;
      bestProgress = progress;
    }
  });
  return current;
};

// Every collection that's been started but not finished, best progress
// first — Home shows 2-4 of these under "Continue a Collection".
export const getInProgressCollections = (watchedIds, limit = 4) =>
  allCollections()
    .map((collection) => ({ collection, ...getCollectionProgress(collection, watchedIds) }))
    .filter(({ progress }) => progress > 0 && progress < 1)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, limit)
    .map(({ collection }) => collection);

// When a finished collection was finished: the latest watch date among its
// movies. Null if it isn't complete or no dates are known.
export const getCollectionCompletedAt = (collection, watched) => {
  const byId = new Map(watched.map((entry) => [entry.movieId, entry]));
  if (!collection.movieIds.every((id) => byId.has(id))) return null;
  const latest = Math.max(
    ...collection.movieIds.map((id) => byId.get(id).timestamp ?? 0),
  );
  return latest > 0 ? latest : null;
};

// Untracked collections worth suggesting: none of their movies watched yet,
// ranked by how much they overlap the genres the user watches most. Genre
// and decade collections are left out — they're broad, and genres are
// already the basis of the ranking.
const SUGGESTION_TOP_GENRES = 3;

export const getSuggestedCollections = (watched, unlockedCollectionIds, limit = 3) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const genreCounts = new Map();
  watched
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean)
    .forEach((movie) =>
      movie.genres.forEach((genre) =>
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1),
      ),
    );
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SUGGESTION_TOP_GENRES)
    .map(([genre]) => genre);
  if (topGenres.length === 0) return [];

  return allCollections()
    .filter(
      (collection) =>
        ["franchise", "director", "actor"].includes(collection.type) &&
        !unlockedCollectionIds.includes(collection.id) &&
        getCollectionProgress(collection, watchedIds).watchedCount === 0,
    )
    .map((collection) => {
      // From the films the app has (at least the first few of each).
      const movies = collection.movies;
      if (movies.length === 0) return null;
      const matching = movies.filter((movie) =>
        movie.genres.some((genre) => topGenres.includes(genre)),
      );
      const genre = topGenres.find((g) =>
        matching.some((movie) => movie.genres.includes(g)),
      );
      return { collection, score: matching.length / movies.length, genre };
    })
    .filter((item) => item && item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.collection.movieIds.length - a.collection.movieIds.length,
    )
    .slice(0, limit);
};

export default getCollectionSections;

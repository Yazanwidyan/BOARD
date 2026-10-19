import { getMovieById } from "../data/movies";

// Collections, from the server (the backend's lib/collections.js, which
// also counts them for XP) as definitions — { id, type, title, movieIds } —
// with your library (the ones you've started or unlocked), from
// GET /api/collections (every saga, to browse), and with any movie you open
// (the ones it's in). services/api.js remembers every response's
// `collections` (in memory only). Two kinds:
//
//   sagas   THE collections (type "saga"): hand-made — "Potterhead",
//           "Assembled", "King of the World" — with a `kind` (franchise,
//           studio, theme, director, actor), a `subtitle`, `ranks`
//           ([{ title, at }], `at` a film count: you climb them as you
//           watch) and `art` ({ backdrop } or { photo }). Library, Home,
//           badges, trophies, dares and XP count only these.
//   lists   a director's or an actor's films, a franchise, a decade, a
//           genre — for browsing ("More from Christopher Nolan"), never
//           achievements.
//
// Counts and progress come from `movieIds`, so they're exact. `movies` is
// the films the app has so far; any it doesn't have are fetched (see
// data/movies.js), and screens showing them re-render when they arrive.

// Library's sections: the sagas by kind (`type` is the kind).
const SECTIONS = [
  { type: "franchise", title: "Sagas" },
  { type: "studio", title: "Studios" },
  { type: "theme", title: "Themes" },
  { type: "director", title: "Directors" },
  { type: "actor", title: "Actors" },
];

export const isSaga = (collection) => collection?.type === "saga";

const registry = new Map();
let version = 0;

const toCollection = (definition) => ({
  id: definition.id,
  type: definition.type,
  kind: definition.kind ?? null,
  title: definition.title,
  subtitle: definition.subtitle ?? null,
  ranks: definition.ranks ?? [],
  art: definition.art ?? null,
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
      current.movieIds.join() === definition.movieIds.join() &&
      JSON.stringify(current.ranks) === JSON.stringify(definition.ranks ?? [])
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

// The sagas: everything below that counts (progress, completion, ranks,
// suggestions) is about these.
const allSagas = () => [...registry.values()].filter(isSaga);
export const getSagas = allSagas;

export const getCollectionSections = () =>
  SECTIONS.map((section) => ({
    ...section,
    collections: allSagas().filter(
      (collection) => collection.kind === section.type,
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

// Which of movieId's sagas just became complete BY this watch — every
// other movie in it was already in `watchedIdsBeforeAdd`.
export const getCollectionsCompletedBy = (movieId, watchedIdsBeforeAdd) =>
  getCollectionsForMovie(movieId).filter(
    (collection) =>
      isSaga(collection) &&
      !watchedIdsBeforeAdd.has(movieId) &&
      collection.movieIds.every(
        (id) => id === movieId || watchedIdsBeforeAdd.has(id),
      ),
  );

// Where you are in a saga: the rank you've reached (null before the first),
// the next one (null at the top), and the counts.
export const getSagaRank = (collection, watchedIds) => {
  const { watchedCount, total } = getCollectionProgress(collection, watchedIds);
  const ranks = collection.ranks ?? [];
  const reached = ranks.filter((rank) => watchedCount >= rank.at);
  return {
    current: reached[reached.length - 1] ?? null,
    next: ranks.find((rank) => watchedCount < rank.at) ?? null,
    reached,
    watchedCount,
    total,
  };
};

// The saga ranks watching movieId reaches, given what was watched before:
// [{ collection, rank, final }] — `final` is the top rank (the whole saga).
export const getRanksReachedBy = (movieId, watchedIdsBeforeAdd) => {
  if (watchedIdsBeforeAdd.has(movieId)) return [];
  return getCollectionsForMovie(movieId)
    .filter(isSaga)
    .flatMap((collection) => {
      const before = collection.movieIds.filter((id) =>
        watchedIdsBeforeAdd.has(id),
      ).length;
      return (collection.ranks ?? [])
        .filter((rank) => before < rank.at && before + 1 >= rank.at)
        .map((rank) => ({
          collection,
          rank,
          final: rank.at >= collection.movieIds.length,
        }));
    });
};

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

// How many sagas are fully watched — feeds both the Collections badge
// ladder and the league score's completion bonus.
export const getCompletedCollectionsCount = (watchedIds) =>
  allSagas().filter(
    (collection) => getCollectionProgress(collection, watchedIds).progress === 1,
  ).length;

// The saga that's furthest along without being finished.
export const getCurrentCollection = (watchedIds) => {
  let current = null;
  let bestProgress = 0;
  allSagas().forEach((collection) => {
    const { progress } = getCollectionProgress(collection, watchedIds);
    if (progress > 0 && progress < 1 && progress > bestProgress) {
      current = collection;
      bestProgress = progress;
    }
  });
  return current;
};

// Every saga that's been started but not finished, best progress first —
// Home shows 2-4 of these under "Continue a Collection".
export const getInProgressCollections = (watchedIds, limit = 4) =>
  allSagas()
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

// Untracked sagas worth suggesting: none of their movies watched yet,
// ranked by how much they overlap the genres the user watches most.
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

  return allSagas()
    .filter(
      (collection) =>
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

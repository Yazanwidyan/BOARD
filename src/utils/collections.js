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

const buildDirectorCollections = () =>
  [...groupBy(MOVIES, (movie) => movie.director).entries()]
    .filter(([, movies]) => movies.length >= MIN_COLLECTION_SIZE)
    .map(([director, movies]) => ({
      id: `director-${slugify(director)}`,
      type: "director",
      title: director,
      movies: [...movies].sort((a, b) => a.year - b.year),
    }));

// An actor needs a few more films than a director to be a collection —
// top-billed casts overlap a lot, and a two-film "collection" for every
// co-star would bury the meaningful ones.
const MIN_ACTOR_COLLECTION_SIZE = 3;

// One collection per actor with at least MIN_ACTOR_COLLECTION_SIZE catalog
// movies in their top-billed cast (movie.cast, from data/cast.js). Empty
// until cast data has been generated — the Actors section just doesn't
// appear until then.
const buildActorCollections = () => {
  const map = new Map();
  MOVIES.forEach((movie) => {
    (movie.cast ?? []).forEach((actor) => {
      if (!map.has(actor)) map.set(actor, []);
      map.get(actor).push(movie);
    });
  });
  return [...map.entries()]
    .filter(([, movies]) => movies.length >= MIN_ACTOR_COLLECTION_SIZE)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([actor, movies]) => ({
      id: `actor-${slugify(actor)}`,
      type: "actor",
      title: actor,
      movies: [...movies].sort((a, b) => a.year - b.year),
    }));
};

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
const DIRECTOR_COLLECTIONS = buildDirectorCollections();
const ACTOR_COLLECTIONS = buildActorCollections();
const DECADE_COLLECTIONS = buildDecadeCollections();
const GENRE_COLLECTIONS = buildGenreCollections();
const ALL_COLLECTIONS = [
  ...FRANCHISE_COLLECTIONS,
  ...DIRECTOR_COLLECTIONS,
  ...ACTOR_COLLECTIONS,
  ...DECADE_COLLECTIONS,
  ...GENRE_COLLECTIONS,
];

export const getCollectionSections = () => [
  { type: "franchise", title: "Franchises", collections: FRANCHISE_COLLECTIONS },
  { type: "director", title: "Directors", collections: DIRECTOR_COLLECTIONS },
  { type: "actor", title: "Actors", collections: ACTOR_COLLECTIONS },
  { type: "decade", title: "Decades", collections: DECADE_COLLECTIONS },
  { type: "genre", title: "Genres", collections: GENRE_COLLECTIONS },
].filter((section) => section.collections.length > 0);

export const getCollectionById = (id) =>
  ALL_COLLECTIONS.find((collection) => collection.id === id);

// Library's Collections tab shows this instead of the full catalog — a
// collection is "unlocked" (visible there) once you've actually watched
// something in it, OR once you've explicitly chosen to track it from the
// "See All Collections" browser (movieStore's unlockedCollections). The
// full catalog itself never changes or hides anything — getCollectionSections()
// still returns everything, for the browser and for the challenge generator's
// "Start Something New" (which specifically needs untouched collections to
// suggest).
export const getUnlockedCollectionSections = (watchedIds, unlockedCollectionIds) =>
  getCollectionSections()
    .map((section) => ({
      ...section,
      collections: section.collections.filter((collection) => (
        getCollectionProgress(collection, watchedIds).progress > 0
        || unlockedCollectionIds.includes(collection.id)
      )),
    }))
    .filter((section) => section.collections.length > 0);

// A single movie can belong to several collections at once (a franchise, a
// director, a decade, a genre) — used by Movie Details' "Your Progress" and
// by the challenge generator to find what a given watch would complete.
export const getCollectionsForMovie = (movieId) =>
  ALL_COLLECTIONS.filter((collection) =>
    collection.movies.some((movie) => movie.id === movieId),
  );

// Which of movieId's collections just became complete BY this watch —
// every other movie in the collection was already in `watchedIdsBeforeAdd`
// (the watched set from right before this movie was added). Lets a "mark
// as watched" call site show a real "Collection Complete" celebration the
// moment it happens, instead of that only being visible the next time
// someone happens to open the Collections tab.
export const getCollectionsCompletedBy = (movieId, watchedIdsBeforeAdd) =>
  getCollectionsForMovie(movieId).filter((collection) =>
    collection.movies.every(
      (movie) => movie.id === movieId || watchedIdsBeforeAdd.has(movie.id),
    ),
  );

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

// Every collection that's been started but not finished, best progress
// first — Home shows 2-4 of these under "Continue a Collection".
export const getInProgressCollections = (watchedIds, limit = 4) =>
  ALL_COLLECTIONS
    .map((collection) => ({ collection, ...getCollectionProgress(collection, watchedIds) }))
    .filter(({ progress }) => progress > 0 && progress < 1)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, limit)
    .map(({ collection }) => collection);

// When a finished collection was finished: the latest watch date among its
// movies (watched entries carry a timestamp). Null if it isn't complete or
// no dates are known.
export const getCollectionCompletedAt = (collection, watched) => {
  const byId = new Map(watched.map((entry) => [entry.movieId, entry]));
  if (!collection.movies.every((movie) => byId.has(movie.id))) return null;
  const latest = Math.max(
    ...collection.movies.map((movie) => byId.get(movie.id).timestamp ?? 0),
  );
  return latest > 0 ? latest : null;
};

// Untracked collections worth suggesting: none of their movies watched yet
// (anything with progress is already tracked automatically), ranked by how
// much they overlap the genres the user actually watches most. Genre and
// decade collections are left out — they're broad, and genres are already
// the basis of the ranking.
const SUGGESTION_TOP_GENRES = 3;

export const getSuggestedCollections = (watched, unlockedCollectionIds, limit = 3) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const genreCounts = new Map();
  MOVIES.filter((movie) => watchedIds.has(movie.id)).forEach((movie) =>
    movie.genres.forEach((genre) =>
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1),
    ),
  );
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SUGGESTION_TOP_GENRES)
    .map(([genre]) => genre);
  if (topGenres.length === 0) return [];

  return ALL_COLLECTIONS
    .filter(
      (collection) =>
        ["franchise", "director", "actor"].includes(collection.type) &&
        !unlockedCollectionIds.includes(collection.id) &&
        getCollectionProgress(collection, watchedIds).watchedCount === 0,
    )
    .map((collection) => {
      const matching = collection.movies.filter((movie) =>
        movie.genres.some((genre) => topGenres.includes(genre)),
      );
      const genre = topGenres.find((g) =>
        matching.some((movie) => movie.genres.includes(g)),
      );
      return { collection, score: matching.length / collection.movies.length, genre };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.collection.movies.length - a.collection.movies.length)
    .slice(0, limit);
};

export default getCollectionSections;

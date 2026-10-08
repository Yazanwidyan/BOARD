import { MOVIES, getMovieById } from "../data/movies";
import { DIFFICULTY } from "./xp";
import {
  getCollectionProgress,
  getCollectionsForMovie,
  getCurrentCollection,
  getCollectionSections,
} from "./collections";
import { bucketListIds } from "./movieFilters";
import { shuffle } from "./shuffle";
import { t } from "../i18n";

// Every generator below takes the same real-state bundle and returns a
// candidate challenge object or `null` if it doesn't apply right now — the
// same "derive, don't fabricate" rule as badges/collections/league. There's
// no actor data in the catalog, so Double Feature / Follow the Actor from
// the spec aren't implemented; Revisit isn't either, since this app has no
// rewatch concept (marking watched is a one-time, not-undo-able event).

const randomXP = (difficultyKey) => {
  const { min, max } = DIFFICULTY[difficultyKey];
  return Math.round((min + Math.random() * (max - min)) / 10) * 10;
};

const makeChallenge = ({
  id,
  type,
  title,
  description,
  targetMovieId,
  difficulty,
}) => ({
  id: `${id}-${Date.now()}`,
  type,
  title,
  description,
  targetMovieId,
  difficulty,
  difficultyLabel: DIFFICULTY[difficulty].label,
  xpReward: randomXP(difficulty),
});

const DAY_MS = 24 * 60 * 60 * 1000;

// ---- Watchlist ----

const forgottenOne = ({ bucketList }) => {
  if (bucketList.length === 0) return null;
  const oldest = [...bucketList].sort((a, b) => a.addedAt - b.addedAt)[0];
  if (Date.now() - oldest.addedAt < 14 * DAY_MS) return null;
  const movie = getMovieById(oldest.movieId);
  if (!movie) return null;
  return makeChallenge({
    id: "forgotten-one",
    type: "watchlist",
    title: "The Forgotten One",
    description: t(
      "{title} has been sitting on your watchlist a while. Time to finally watch it.",
      { title: movie.title },
    ),
    targetMovieId: movie.id,
    difficulty: "EASY",
  });
};

const clearTheQueue = ({ bucketList }) => {
  if (bucketList.length < 5) return null;
  const oldest = [...bucketList].sort((a, b) => a.addedAt - b.addedAt)[0];
  const movie = getMovieById(oldest.movieId);
  if (!movie) return null;
  return makeChallenge({
    id: "clear-the-queue",
    type: "watchlist",
    title: "Clear the Queue",
    description: t(
      "Your watchlist has {bucketListCount} movies waiting. Start by watching {title}.",
      { bucketListCount: bucketList.length, title: movie.title },
    ),
    targetMovieId: movie.id,
    difficulty: "EASY",
  });
};

const randomPick = ({ bucketList }) => {
  if (bucketList.length === 0) return null;
  const entry = bucketList[Math.floor(Math.random() * bucketList.length)];
  const movie = getMovieById(entry.movieId);
  if (!movie) return null;
  return makeChallenge({
    id: "random-pick",
    type: "watchlist",
    title: "Random Pick",
    description: t("No overthinking it — watch {title} from your watchlist.", {
      title: movie.title,
    }),
    targetMovieId: movie.id,
    difficulty: "EASY",
  });
};

// ---- Genre ----

const genreCounts = (watched) => {
  const counts = new Map();
  watched.forEach((entry) => {
    const movie = getMovieById(entry.movieId);
    if (!movie) return;
    movie.genres.forEach((genre) =>
      counts.set(genre, (counts.get(genre) ?? 0) + 1),
    );
  });
  return counts;
};

const breakThePattern = ({ watched, bucketList }) => {
  const recent = watched.slice(0, 5);
  if (recent.length < 5) return null;
  const recentMovies = recent
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean);
  const counts = new Map();
  recentMovies.forEach((movie) =>
    movie.genres.forEach((genre) =>
      counts.set(genre, (counts.get(genre) ?? 0) + 1),
    ),
  );
  const [dominantGenre, dominantCount] =
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!dominantGenre || dominantCount < 4) return null;

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const pool = (
    bucketList.length > 0
      ? bucketList.map((e) => getMovieById(e.movieId))
      : MOVIES
  )
    .filter(Boolean)
    .filter(
      (movie) =>
        !movie.genres.includes(dominantGenre) && !watchedIds.has(movie.id),
    );
  if (pool.length === 0) return null;
  const movie = shuffle(pool)[0];

  return makeChallenge({
    id: "break-the-pattern",
    type: "genre",
    title: "Break the Pattern",
    description: t(
      "Your last 5 movies lean heavily {dominantGenre}. Change things up with {title}.",
      { dominantGenre: dominantGenre, title: movie.title },
    ),
    targetMovieId: movie.id,
    difficulty: "MEDIUM",
  });
};

const genreExplorer = ({ watched, bucketList }) => {
  const counts = genreCounts(watched);
  const allGenres = [...new Set(MOVIES.flatMap((movie) => movie.genres))];
  const unexplored = allGenres.filter(
    (genre) => (counts.get(genre) ?? 0) === 0,
  );
  if (unexplored.length === 0) return null;
  const genre = unexplored[Math.floor(Math.random() * unexplored.length)];

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const pool = MOVIES.filter(
    (movie) => movie.genres.includes(genre) && !watchedIds.has(movie.id),
  ).sort((a, b) => b.rating - a.rating);
  if (pool.length === 0) return null;
  const inWatchlist = bucketListIds(bucketList);
  const movie = pool.find((m) => inWatchlist.includes(m.id)) ?? pool[0];

  return makeChallenge({
    id: "genre-explorer",
    type: "genre",
    title: "Genre Explorer",
    description: t(
      "You haven't watched any {genre} yet. {title} is a great place to start.",
      { genre: genre, title: movie.title },
    ),
    targetMovieId: movie.id,
    difficulty: "MEDIUM",
  });
};

const outsideComfortZone = ({ watched, bucketList }) => {
  const counts = genreCounts(watched);
  if (counts.size < 3) return null;
  const sorted = [...counts.entries()].sort((a, b) => a[1] - b[1]);
  const [leastGenre] = sorted[0];
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const pool = MOVIES.filter(
    (movie) => movie.genres.includes(leastGenre) && !watchedIds.has(movie.id),
  ).sort((a, b) => b.rating - a.rating);
  if (pool.length === 0) return null;
  const inWatchlist = bucketListIds(bucketList);
  const movie = pool.find((m) => inWatchlist.includes(m.id)) ?? pool[0];

  return makeChallenge({
    id: "outside-comfort-zone",
    type: "genre",
    title: "Outside Your Comfort Zone",
    description: t(
      "{leastGenre} barely shows up in your history. Give {title} a shot.",
      { leastGenre: leastGenre, title: movie.title },
    ),
    targetMovieId: movie.id,
    difficulty: "MEDIUM",
  });
};

// ---- Director ----

const directorChallenge = ({ watched }) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const directorCollections =
    getCollectionSections().find((section) => section.type === "director")
      ?.collections ?? [];

  const inProgress = directorCollections
    .map((collection) => ({
      collection,
      ...getCollectionProgress(collection, watchedIds),
    }))
    .filter(({ progress }) => progress > 0 && progress < 1)
    .sort((a, b) => b.progress - a.progress);
  if (inProgress.length === 0) return null;

  const { collection, watchedCount, total } = inProgress[0];
  const nextMovie = collection.movies.find(
    (movie) => !watchedIds.has(movie.id),
  );
  if (!nextMovie) return null;

  const remaining = total - watchedCount;
  if (remaining === 1) {
    return makeChallenge({
      id: "complete-the-director",
      type: "director",
      title: "Complete the Director",
      description: t(
        "One movie left to complete your {title} collection: {title2}.",
        { title: collection.title, title2: nextMovie.title },
      ),
      targetMovieId: nextMovie.id,
      difficulty: "HARD",
    });
  }

  return makeChallenge({
    id: "director-dive",
    type: "director",
    title: "Director Dive",
    description: t(
      "You're {watchedCount}/{total} through {title}. Keep going with {title2}.",
      {
        watchedCount: watchedCount,
        total: total,
        title: collection.title,
        title2: nextMovie.title,
      },
    ),
    targetMovieId: nextMovie.id,
    difficulty: "MEDIUM",
  });
};

// ---- Collections ----

const completeTheCollection = ({ watched }) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const current = getCurrentCollection(watchedIds);
  if (!current) return null;
  const { watchedCount, total } = getCollectionProgress(current, watchedIds);
  if (total - watchedCount !== 1) return null;
  const nextMovie = current.movies.find((movie) => !watchedIds.has(movie.id));
  if (!nextMovie) return null;

  return makeChallenge({
    id: "complete-the-collection",
    type: "collection",
    title: "Complete the Collection",
    description: t(
      "{title} is the last movie standing between you and finishing {title2}.",
      { title: nextMovie.title, title2: current.title },
    ),
    targetMovieId: nextMovie.id,
    difficulty: "HARD",
  });
};

const startSomethingNew = ({ watched }) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const notStarted = getCollectionSections()
    .flatMap((section) => section.collections)
    .filter(
      (collection) =>
        getCollectionProgress(collection, watchedIds).progress === 0,
    );
  if (notStarted.length === 0) return null;
  const collection = notStarted[Math.floor(Math.random() * notStarted.length)];
  const movie = [...collection.movies].sort((a, b) => a.rank - b.rank)[0];

  return makeChallenge({
    id: "start-something-new",
    type: "collection",
    title: "Start Something New",
    description: t(
      "Kick off a new collection — watch {title} to begin {title2}.",
      { title: movie.title, title2: collection.title },
    ),
    targetMovieId: movie.id,
    difficulty: "EASY",
  });
};

// ---- Rating ----

const hiddenGem = ({ watched }) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const pool = MOVIES.filter(
    (movie) => movie.rating >= 8.5 && !watchedIds.has(movie.id),
  );
  if (pool.length === 0) return null;
  const movie = shuffle(pool)[0];

  return makeChallenge({
    id: "hidden-gem",
    type: "rating",
    title: "Hidden Gem",
    description: t("{title} is rated {value} and you haven't seen it yet.", {
      title: movie.title,
      value: movie.rating.toFixed(1),
    }),
    targetMovieId: movie.id,
    difficulty: "MEDIUM",
  });
};

// ---- Random ----

const rollTheDice = ({ watched, bucketList }) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const pool =
    bucketList.length > 0
      ? bucketList.map((entry) => getMovieById(entry.movieId)).filter(Boolean)
      : MOVIES.filter((movie) => !watchedIds.has(movie.id));
  if (pool.length === 0) return null;
  const movie = shuffle(pool)[0];

  return makeChallenge({
    id: "roll-the-dice",
    type: "random",
    title: "Roll the Dice",
    description: t("{title}. That's the roll — no swaps.", {
      title: movie.title,
    }),
    targetMovieId: movie.id,
    difficulty: "EASY",
  });
};

const surpriseMe = ({ watched }) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const pool = MOVIES.filter((movie) => !watchedIds.has(movie.id));
  if (pool.length === 0) return null;
  const movie = shuffle(pool)[0];

  return makeChallenge({
    id: "surprise-me",
    type: "random",
    title: "Surprise Me",
    description: t("ReelBoard picked {title} for you tonight.", {
      title: movie.title,
    }),
    targetMovieId: movie.id,
    difficulty: "EASY",
  });
};

const GENERATORS = [
  forgottenOne,
  clearTheQueue,
  randomPick,
  breakThePattern,
  genreExplorer,
  outsideComfortZone,
  directorChallenge,
  completeTheCollection,
  startSomethingNew,
  hiddenGem,
  rollTheDice,
  surpriseMe,
];

// Collects every eligible candidate from real state and picks one — always
// returns something as long as the catalog has an unwatched movie left,
// since the random generators apply almost universally.
export const generateChallenge = ({ watched, bucketList }) => {
  const state = { watched, bucketList };
  const candidates = GENERATORS.map((generator) => generator(state)).filter(
    Boolean,
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

// A "hand" of `count` different challenges for the generator screen to
// lay out side by side: every eligible candidate is collected, duplicates
// (same movie) dropped, then one is drawn per difficulty first — so the
// hand spans Easy / Medium / Hard when real state allows it — and any
// remaining slots are filled at random. Sorted easiest first.
const DIFFICULTY_ORDER = ["EASY", "MEDIUM", "HARD", "EXTREME"];

export const generateChallengeOptions = (
  { watched, bucketList },
  count = 3,
) => {
  const state = { watched, bucketList };
  const seenMovies = new Set();
  const candidates = shuffle(
    GENERATORS.map((generator) => generator(state)).filter(Boolean),
  ).filter((candidate) => {
    if (seenMovies.has(candidate.targetMovieId)) return false;
    seenMovies.add(candidate.targetMovieId);
    return true;
  });

  const hand = [];
  DIFFICULTY_ORDER.forEach((difficulty) => {
    if (hand.length >= count) return;
    const match = candidates.find(
      (candidate) =>
        candidate.difficulty === difficulty && !hand.includes(candidate),
    );
    if (match) hand.push(match);
  });
  candidates.forEach((candidate) => {
    if (hand.length < count && !hand.includes(candidate)) hand.push(candidate);
  });

  return hand.sort(
    (a, b) =>
      DIFFICULTY_ORDER.indexOf(a.difficulty) -
      DIFFICULTY_ORDER.indexOf(b.difficulty),
  );
};

export default generateChallenge;

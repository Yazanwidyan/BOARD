import { MOVIES, getMovieById } from "../data/movies";
import { t } from "../i18n";
import {
  getCollectionProgress,
  getCollectionsForMovie,
  getRanksReachedBy,
  getSagaRank,
  isSaga,
} from "./collections";
import { byWeightedRating } from "./movieFilters";
import { getMovieMatch, getTastePicks, isColdStart } from "./tasteEngine";
import { RANK_XP } from "./xp";

// What Home's Tonight's Pick banner says about a movie, and which movie it
// suggests when there's no pick yet.

const SUGGESTION_COUNT = 12;
const FALLBACK_POOL = 20;
// How much a saga step lifts a suggestion (taste scores run about 0–20).
const RANK_BOOST = 3;
const PROGRESS_BOOST = 1.5;
const SAVED_BOOST = 1;

// Where this movie gets you in a saga, the most rewarding first:
//   rank      watching it reaches a rank (`final`: it finishes the saga)
//   progress  it's the next step in a saga you've started
//   start     it would start one
// null when it's in no saga, or already watched.
export const getSagaStep = (movieId, watchedIds) => {
  if (watchedIds.has(movieId)) return null;
  const reached = getRanksReachedBy(movieId, watchedIds);
  if (reached.length > 0) {
    const best = reached.find((item) => item.final) ?? reached[reached.length - 1];
    return {
      type: "rank",
      collection: best.collection,
      rank: best.rank,
      final: best.final,
      xp: reached.length * RANK_XP,
      ...getCollectionProgress(best.collection, watchedIds),
    };
  }
  const sagas = getCollectionsForMovie(movieId)
    .filter(isSaga)
    .map((collection) => ({ collection, ...getSagaRank(collection, watchedIds) }));
  const started = sagas
    .filter(({ watchedCount }) => watchedCount > 0)
    .sort((a, b) => b.watchedCount / b.total - a.watchedCount / a.total)[0];
  if (started) return { type: "progress", ...started };
  return sagas[0] ? { type: "start", ...sagas[0] } : null;
};

// The saga step as one line.
export const describeSagaStep = (step) => {
  if (!step) return null;
  const saga = step.collection.title;
  if (step.type === "rank") {
    return step.final
      ? t("Finishes {saga} · +{xp} XP", { saga, xp: step.xp })
      : t("Makes you {rank} in {saga} · +{xp} XP", {
          rank: step.rank.title,
          saga,
          xp: step.xp,
        });
  }
  if (step.type === "progress") {
    return step.next
      ? t("{count} of {total} in {saga} · {left} more to {rank}", {
          count: step.watchedCount,
          total: step.total,
          saga,
          left: step.next.at - step.watchedCount,
          rank: step.next.title,
        })
      : t("{count} of {total} in {saga}", { count: step.watchedCount, total: step.total, saga });
  }
  return t("Starts {saga} · {total} films", { saga, total: step.total });
};

// When it would end if it started now ("10:47 pm"), or null.
export const getEndTime = (movie, now = Date.now()) =>
  movie?.runtime
    ? new Date(now + movie.runtime * 60 * 1000).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

// Everything the banner shows about one movie: its taste match (null
// with too little history), the best reason it fits, and its saga step.
export const getPickInsight = (movie, watched) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const match = getMovieMatch(watched, movie);
  return {
    match: match?.match ?? null,
    reason: match?.reasons[0] ?? null,
    saga: getSagaStep(movie.id, watchedIds),
  };
};

// Suggestions for tonight, best first: { movie, match, reason, saga,
// savedAt }. Your taste decides — your watchlist and the movies that move a
// saga along get a lift. With too little history to go on: your watchlist,
// oldest save first, then well-rated movies you haven't seen.
export const getTonightSuggestions = (watched, bucketList) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const saved = bucketList.filter((entry) => !watchedIds.has(entry.movieId));
  const savedAt = new Map(saved.map((entry) => [entry.movieId, entry.addedAt ?? null]));

  if (isColdStart(watched)) {
    const fromWatchlist = [...saved]
      .sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0))
      .map((entry) => getMovieById(entry.movieId))
      .filter(Boolean);
    const movies =
      fromWatchlist.length > 0
        ? fromWatchlist
        : MOVIES.filter((movie) => !watchedIds.has(movie.id))
            .sort(byWeightedRating)
            .slice(0, FALLBACK_POOL);
    return movies.map((movie) => ({
      movie,
      match: null,
      reason: null,
      saga: getSagaStep(movie.id, watchedIds),
      savedAt: savedAt.get(movie.id) ?? null,
    }));
  }

  // The same order every time (no shuffle): ⇄ steps through it. Scored
  // like a movie's page (no watchlist bonus), so the match reads the same
  // in both places; saving it lifts it here instead.
  const options = { random: () => 0 };
  const savedMovies = saved.map((entry) => getMovieById(entry.movieId)).filter(Boolean);
  const picks = new Map();
  [
    ...getTastePicks(watched, { ...options, from: savedMovies, count: savedMovies.length }),
    ...getTastePicks(watched, { ...options, count: SUGGESTION_COUNT * 2 }),
  ].forEach((pick) => {
    if (!picks.has(pick.movie.id)) picks.set(pick.movie.id, pick);
  });

  return [...picks.values()]
    .map((pick) => {
      const saga = getSagaStep(pick.movie.id, watchedIds);
      const boost =
        (saga?.type === "rank" ? RANK_BOOST : saga?.type === "progress" ? PROGRESS_BOOST : 0) +
        (savedAt.has(pick.movie.id) ? SAVED_BOOST : 0);
      return {
        movie: pick.movie,
        match: pick.match,
        reason: pick.reasons[0] ?? null,
        saga,
        savedAt: savedAt.get(pick.movie.id) ?? null,
        order: pick.score + boost,
      };
    })
    .sort((a, b) => b.order - a.order)
    .slice(0, SUGGESTION_COUNT);
};

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
import { makeRankForecast } from "./ranks";

// What Home's Tonight's Pick banner says about a movie, and which movies it
// suggests — a mix, like a hand of dares: each suggestion is there for one
// reason (its `angle`), and they take turns, so ⇄ moves through the best
// fit for your taste, a film that earns you a rank tonight, the next step in
// a saga, something from your watchlist and a film that moves a rank along.

const SUGGESTION_COUNT = 15;
const FALLBACK_POOL = 20;
// How many of your best taste picks to weigh, and how many of the best
// films that would help a rank.
const TASTE_POOL = 60;
const RANK_POOL = 30;

// Why a film is suggested, in the order they take turns. `fits` says
// whether a candidate qualifies.
export const ANGLES = [
  { key: "taste", label: "Made for you", fits: (item) => item.match != null },
  { key: "rank", label: "Earns a rank tonight", fits: (item) => item.forecast.gained.length > 0 },
  {
    key: "saga",
    label: "Next in a collection",
    fits: (item) => item.saga?.type === "rank" || item.saga?.type === "progress",
  },
  { key: "saved", label: "On your watchlist", fits: (item) => item.saved },
  { key: "craft", label: "Moves a rank along", fits: (item) => item.forecast.advanced.length > 0 },
];

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
      ? t("Finishes {saga}", { saga })
      : t("Makes you {rank} in {saga}", { rank: step.rank.title, saga });
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
// with too little history), the best reason it fits, its saga step, and
// what it does for your ranks (`forecast`). `dares`: dares finished.
export const getPickInsight = (movie, watched, dares = 0) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const match = getMovieMatch(watched, movie);
  return {
    match: match?.match ?? null,
    reason: match?.reasons[0] ?? null,
    saga: getSagaStep(movie.id, watchedIds),
    forecast: makeRankForecast(watched, dares)(movie),
  };
};

// Takes turns through the angles, each time the best candidate (by taste)
// that fits and isn't in yet — so the list is a mix, not just the top of
// one kind. Angles with nothing left are skipped.
const takeTurns = (candidates, count) => {
  const chosen = [];
  const used = new Set();
  let added = true;
  while (chosen.length < count && added) {
    added = false;
    ANGLES.forEach((angle) => {
      if (chosen.length >= count) return;
      const item = candidates.find((candidate) => !used.has(candidate.movie.id) && angle.fits(candidate));
      if (!item) return;
      used.add(item.movie.id);
      chosen.push({ ...item, angle: { key: angle.key, label: angle.label } });
      added = true;
    });
  }
  return chosen;
};

// Your latest passes count as "not this one" for a while: their genres and
// directors drop (getTastePicks' `rejected`) — "fewer like that".
const RECENT_PASSES = 5;
const RECENT_PASS_DAYS = 3;

// Suggestions for tonight: { movie, match, reason, saga, forecast, saved,
// savedAt, angle }, in turns (see ANGLES). With too little
// history for taste: your watchlist, oldest save first, then well-rated
// films you haven't seen — each still saying what it does for your ranks.
// `passes` (tasteStore): films you said "Not for me" to never come back,
// and the latest few bring fewer like them.
export const getTonightSuggestions = (watched, bucketList, dares = 0, passes = []) => {
  const passedIds = new Set(passes.map((pass) => pass.movieId));
  const since = Date.now() - RECENT_PASS_DAYS * 86400000;
  const rejected = passes
    .filter((pass) => (pass.at ?? 0) >= since)
    .slice(0, RECENT_PASSES)
    .map((pass) => pass.movieId);
  // Watched or passed: either way, not suggested.
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const goneIds = new Set([...watchedIds, ...passedIds]);
  const saved = bucketList.filter((entry) => !goneIds.has(entry.movieId));
  const savedAt = new Map(saved.map((entry) => [entry.movieId, entry.addedAt ?? null]));
  const forecastFor = makeRankForecast(watched, dares);
  const describe = (movie, extra) => {
    const forecast = forecastFor(movie);
    return {
      movie,
      saga: getSagaStep(movie.id, watchedIds),
      forecast,
      saved: savedAt.has(movie.id),
      savedAt: savedAt.get(movie.id) ?? null,
      ...extra,
    };
  };

  if (isColdStart(watched)) {
    const fromWatchlist = [...saved]
      .sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0))
      .map((entry) => getMovieById(entry.movieId))
      .filter(Boolean);
    const movies =
      fromWatchlist.length > 0
        ? fromWatchlist
        : MOVIES.filter((movie) => !goneIds.has(movie.id))
            .sort(byWeightedRating)
            .slice(0, FALLBACK_POOL);
    return movies.map((movie) =>
      describe(movie, {
        match: null,
        reason: null,
        angle: savedAt.has(movie.id)
          ? { key: "saved", label: "On your watchlist" }
          : { key: "popular", label: "Loved by everyone" },
      }),
    );
  }

  // The same order every time (no shuffle): ⇄ steps through it. Scored
  // like a movie's page (no watchlist bonus), so the match reads the same
  // in both places. Besides your best picks: your watchlist, and the best
  // of the films that would help a rank (a decade you haven't seen, a
  // classic, an epic, a third film by a director…).
  const options = { random: () => 0, rejected };
  const savedMovies = saved.map((entry) => getMovieById(entry.movieId)).filter(Boolean);
  const rankFriendly = MOVIES.filter((movie) => {
    if (goneIds.has(movie.id)) return false;
    const forecast = forecastFor(movie);
    return forecast.advanced.length > 0 || forecast.gained.some((rank) => rank.track.kind === "craft");
  });
  const picks = new Map();
  [
    ...getTastePicks(watched, { ...options, count: TASTE_POOL }),
    ...getTastePicks(watched, { ...options, from: savedMovies, count: savedMovies.length }),
    ...getTastePicks(watched, { ...options, from: rankFriendly, count: RANK_POOL }),
  ].forEach((pick) => {
    if (!picks.has(pick.movie.id)) picks.set(pick.movie.id, pick);
  });

  const candidates = [...picks.values()]
    .filter((pick) => !passedIds.has(pick.movie.id))
    .sort((a, b) => b.score - a.score)
    .map((pick) => describe(pick.movie, { match: pick.match, reason: pick.reasons[0] ?? null }));
  return takeTurns(candidates, SUGGESTION_COUNT);
};

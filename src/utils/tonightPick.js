import { MOVIES, getMovieById } from "../data/movies";
import { t } from "../i18n";
import {
  getCollectionProgress,
  getCollectionsForMovie,
  getInProgressCollections,
  isSaga,
} from "./collections";
import { byWeightedRating } from "./movieFilters";
import { describeLeft } from "./paths";
import { getTastePicks, isColdStart } from "./tasteEngine";

// Which movies Home suggests for tonight — a mix, each suggestion there for
// one reason (its `angle`), taking turns: the best fit for your taste, the
// next film in a collection you've started, and something from your
// watchlist. And what a movie's page says about it in a collection.

const SUGGESTION_COUNT = 15;
const FALLBACK_POOL = 20;
// How many of your best taste picks to weigh, and how many collections
// under way to draw the next films from.
const TASTE_POOL = 60;
const COLLECTIONS_POOL = 6;

// Why a film is suggested, in the order they take turns. `fits` says
// whether a candidate qualifies.
const ANGLES = [
  { key: "taste", label: "Made for you", fits: (item) => item.match != null },
  {
    key: "saga",
    label: "Next in a collection",
    fits: (item) => item.saga?.type === "finish" || item.saga?.type === "progress",
  },
  { key: "saved", label: "On your watchlist", fits: (item) => item.saved },
];

// Where this movie gets you in a saga, the most rewarding first:
//   finish    it's the last one you haven't seen
//   progress  it's the next step in a saga you've started
//   start     it would start one
// { type, collection, watchedCount, total }, or null when it's in no saga
// or already watched.
export const getSagaStep = (movieId, watchedIds) => {
  if (watchedIds.has(movieId)) return null;
  const sagas = getCollectionsForMovie(movieId)
    .filter(isSaga)
    .map((collection) => ({ collection, ...getCollectionProgress(collection, watchedIds) }))
    .sort((a, b) => a.total - a.watchedCount - (b.total - b.watchedCount));
  const started = sagas.find(({ watchedCount }) => watchedCount > 0);
  if (started) {
    return { type: started.watchedCount + 1 === started.total ? "finish" : "progress", ...started };
  }
  return sagas[0] ? { type: "start", ...sagas[0] } : null;
};

// The saga step as one line, by what the saga is about ("Completes the
// Harry Potter set", "2 more Harry Potter films to complete the set",
// "Starts the Harry Potter set · 8 films").
export const describeSagaStep = (step) => {
  if (!step) return null;
  const subject = step.collection.subject ?? step.collection.title;
  if (step.type === "start") return t("Starts the {subject} set · {total} films", { subject, total: step.total });
  return describeLeft(subject, step.total - step.watchedCount, { long: true });
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

// Suggestions for tonight: { movie, match, reason (the best), reasons (all),
// saga, saved, savedAt, angle }, in turns (see ANGLES). With too little history for taste: your
// watchlist, oldest save first, then well-rated films you haven't seen.
// `passes` (tasteStore): films you said "Not for me" to never come back,
// and the latest few bring fewer like them. `count`: how many (more, to
// filter down by mood).
export const getTonightSuggestions = (watched, bucketList, passes = [], count = SUGGESTION_COUNT) => {
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
  const describe = (movie, extra) => ({
    movie,
    saga: getSagaStep(movie.id, watchedIds),
    saved: savedAt.has(movie.id),
    savedAt: savedAt.get(movie.id) ?? null,
    ...extra,
  });

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

  // The same order every time (no shuffle). Besides your best picks: your
  // watchlist, and the films left in the collections you've started.
  const options = { random: () => 0, rejected };
  const savedMovies = saved.map((entry) => getMovieById(entry.movieId)).filter(Boolean);
  const collectionMovies = getInProgressCollections(watchedIds, COLLECTIONS_POOL)
    .flatMap((collection) => collection.movieIds)
    .filter((id) => !goneIds.has(id))
    .map(getMovieById)
    .filter(Boolean);
  const picks = new Map();
  [
    ...getTastePicks(watched, { ...options, count: TASTE_POOL }),
    ...getTastePicks(watched, { ...options, from: savedMovies, count: savedMovies.length }),
    ...getTastePicks(watched, { ...options, from: collectionMovies, count: collectionMovies.length }),
  ].forEach((pick) => {
    if (!picks.has(pick.movie.id)) picks.set(pick.movie.id, pick);
  });

  const candidates = [...picks.values()]
    .filter((pick) => !passedIds.has(pick.movie.id))
    .sort((a, b) => b.score - a.score)
    .map((pick) => describe(pick.movie, { match: pick.match, reason: pick.reasons[0] ?? null, reasons: pick.reasons }));
  return takeTurns(candidates, count);
};

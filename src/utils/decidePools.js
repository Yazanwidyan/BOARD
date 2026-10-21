import { FILTERED_MOVIES, MOVIES, getMovieById } from "../data/movies";
import { applyPreferenceFilters, weightedRating } from "./movieFilters";
import { shuffle } from "./shuffle";
import { getTastePicks, isColdStart } from "./tasteEngine";

// Where Decide's Swipe and Wildcard draw from — the same six sources for
// both: Swipe deals a set to narrow down, Wildcard deals one.
//
//   taste      your best taste matches (unwatched, unsaved)
//   anything   any good film you haven't seen
//   outside    the good films that fit you least
//   watchlist  what you've saved
//   board      one of your boards
//   filters    your genre / decade / runtime filters (the Swipe setup's)
//
// Every pool is unwatched films as { movie, match, outside }: `match` your
// taste match (null with too little history), `outside` whether it's among
// the good films that fit you least.
export const SOURCES = [
  { key: "taste", label: "My taste", hint: "Your best matches" },
  { key: "anything", label: "Anything", hint: "Any good film you haven't seen" },
  { key: "outside", label: "Outside my taste", hint: "Good films that aren't your usual" },
  { key: "watchlist", label: "Watchlist", hint: "What you've saved" },
  { key: "board", label: "A board", hint: "One of your boards" },
  { key: "filters", label: "Filters", hint: "By genre, decade and runtime" },
];

// Sources that need your taste to mean anything.
export const TASTE_SOURCES = ["taste", "outside"];

// Good films only, for anything / outside: random, never bad.
const MIN_WEIGHTED = 7;
// "Outside my taste": the films that fit you least — this share of the
// good ones by taste score, never fewer than OUTSIDE_MIN. Relative, since a
// match never reads under 52% (utils/tasteEngine's toMatch).
const OUTSIDE_SHARE = 0.3;
const OUTSIDE_MIN = 10;
// How many of your best matches "My taste" weighs; the Wildcard deals one
// of the best TASTE_TOP.
const TASTE_POOL = 30;
const TASTE_TOP = 10;

// Best fit first, each with its match (no shuffle).
const score = (watched, movies) =>
  getTastePicks(watched, { from: movies, count: movies.length, random: () => 0 });

// What every source shares, worked out once: the unwatched films, the good
// ones scored, and which of those fit you least.
const getBase = (watched) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const unwatched = (movies) => movies.filter((movie) => movie && !watchedIds.has(movie.id));
  const coldStart = isColdStart(watched);
  const good = unwatched(MOVIES).filter((movie) => weightedRating(movie) >= MIN_WEIGHTED);
  const goodScored = coldStart
    ? good.map((movie) => ({ movie, match: null }))
    : score(watched, good).map((pick) => ({ movie: pick.movie, match: pick.match }));
  const outsideCount = coldStart
    ? 0
    : Math.min(goodScored.length, Math.max(OUTSIDE_MIN, Math.ceil(goodScored.length * OUTSIDE_SHARE)));
  const outsideIds = new Set(
    goodScored.slice(goodScored.length - outsideCount).map((item) => item.movie.id),
  );
  const mark = (items) => items.map((item) => ({ ...item, outside: outsideIds.has(item.movie.id) }));
  // A hand-picked list (watchlist, board, filters), with matches.
  const ofMovies = (movies) =>
    mark(
      coldStart
        ? movies.map((movie) => ({ movie, match: null }))
        : score(watched, movies).map((pick) => ({ movie: pick.movie, match: pick.match })),
    );
  return { watched, unwatched, coldStart, goodScored, outsideIds, mark, ofMovies };
};

const poolFrom = (base, source, { bucketList, board, preferences }) => {
  const { watched, unwatched, coldStart, goodScored, outsideIds, mark, ofMovies } = base;
  switch (source) {
    case "taste": {
      if (coldStart) return mark(goodScored);
      const savedIds = new Set(bucketList.map((entry) => entry.movieId));
      // A little shuffle in the scoring, so each deal is fresh.
      const picks = getTastePicks(watched, {
        from: unwatched(MOVIES).filter((movie) => !savedIds.has(movie.id)),
        count: TASTE_POOL,
      });
      return mark(picks.map((pick) => ({ movie: pick.movie, match: pick.match })));
    }
    case "anything":
      return mark(goodScored);
    case "outside":
      return mark(goodScored.filter((item) => outsideIds.has(item.movie.id)));
    case "watchlist":
      return ofMovies(unwatched(bucketList.map((entry) => getMovieById(entry.movieId))));
    case "board":
      return board ? ofMovies(unwatched(board.movieIds.map(getMovieById))) : [];
    case "filters": {
      const candidates = FILTERED_MOVIES.length > 0 ? FILTERED_MOVIES : MOVIES;
      return ofMovies(applyPreferenceFilters(unwatched(candidates), preferences));
    }
    default:
      return [];
  }
};

// The pool for one source. `context`: { watched, bucketList, board,
// preferences }.
export const getSourcePool = (source, context) => poolFrom(getBase(context.watched), source, context);

// Every source at a glance, for the chooser: { [source]: { count, movies }
// } — `movies` a few to show — plus `boards`: [{ board, count, movies }]
// for each board with anything unwatched on it.
const PREVIEW = 3;
export const getSourceSummaries = ({ watched, bucketList, boards, preferences }) => {
  const base = getBase(watched);
  const summarize = (pool) => ({
    count: pool.length,
    movies: pool.slice(0, PREVIEW).map((item) => item.movie),
  });
  const summaries = {};
  ["taste", "anything", "outside", "watchlist", "filters"].forEach((source) => {
    summaries[source] = summarize(poolFrom(base, source, { bucketList, preferences }));
  });
  summaries.boards = boards
    .map((board) => ({ board, ...summarize(poolFrom(base, "board", { board })) }))
    .filter((item) => item.count > 0);
  summaries.board = {
    count: summaries.boards.length,
    movies: summaries.boards.flatMap((item) => item.movies).slice(0, PREVIEW),
  };
  summaries.coldStart = base.coldStart;
  return summaries;
};

// Swipe's set: your best matches in order for "My taste", a random set for
// the rest.
export const dealSet = (pool, source, count) =>
  (source === "taste" ? pool : shuffle(pool)).slice(0, count).map((item) => item.movie);

// Wildcard's one: from your best few for "My taste", from anywhere in the
// pool for the rest — never the one you just had, if there's another.
export const dealOne = (pool, source, notId) => {
  const from = source === "taste" ? pool.slice(0, TASTE_TOP) : pool;
  const choices = from.length > 1 ? from.filter((item) => item.movie.id !== notId) : from;
  return choices[Math.floor(Math.random() * choices.length)] ?? null;
};

import { MOVIES, getMovieById } from "../data/movies";
import { getTier } from "./tiers";
import { t } from "../i18n";

// ReelBoard's "AI pick" — a small, local taste engine (no network, no
// model). Every unwatched movie gets a score from what you've actually
// watched and how you tiered it, and every signal that moved the score
// leaves a plain-English reason, so a pick always explains itself.
//
// Signals:
// - genre love      genres weighted by your tiers (S counts far more than
//                   C; D / F pull a genre down)
// - director love   directors whose films you've tiered well
// - cast love       actors from movies you've tiered well
// - era fit         decades you favour
// - quality         IMDb rating, as a gentle tiebreaker
// - watchlist       you saved it yourself
// - "not this one"  genres / directors of picks you turned down this
//                   session count against similar movies
// - a pinch of randomness, so "pick again" varies but still fits

// How much each tier says about your taste. Watched-but-untiered still
// counts a little — you chose to watch it.
const TIER_WEIGHT = { S: 3, A: 2, B: 1, C: 0, D: -1.5, F: -2.5 };
const UNTIERED_WEIGHT = 0.5;

const WEIGHTS = {
  genre: 1,
  director: 0.9,
  cast: 0.5,
  decade: 0.4,
  quality: 0.8,
  watchlist: 1.1,
  rejected: 1.2,
  jitter: 0.7,
};

const decadeOf = (year) => `${Math.floor(year / 10) * 10}s`;
const cleanName = (name) => name.replace(/&apos;/g, "'");

const add = (map, key, value, movie) => {
  const current = map.get(key) ?? { sum: 0, count: 0, loved: [] };
  current.sum += value;
  current.count += 1;
  if (value >= TIER_WEIGHT.A) current.loved.push(movie);
  map.set(key, current);
};

// Your taste, learnt from the watched list.
export const buildTasteModel = (watched) => {
  const genres = new Map();
  const directors = new Map();
  const cast = new Map();
  const decades = new Map();
  const tierOf = new Map();
  let tieredCount = 0;

  watched.forEach((entry) => {
    const movie = getMovieById(entry.movieId);
    if (!movie) return;
    const tier = getTier(entry);
    if (tier) tieredCount += 1;
    tierOf.set(movie.id, tier);
    const weight = tier ? TIER_WEIGHT[tier] : UNTIERED_WEIGHT;
    movie.genres.forEach((genre) => add(genres, genre, weight, movie));
    add(directors, movie.director, weight, movie);
    (movie.cast ?? []).forEach((actor) => add(cast, actor, weight, movie));
    add(decades, decadeOf(movie.year), weight, movie);
  });

  // Average-ish affinity that still rewards depth: sum / √count.
  const affinity = (map, key) => {
    const value = map.get(key);
    return value ? value.sum / Math.sqrt(value.count) : 0;
  };

  return {
    genres,
    directors,
    cast,
    decades,
    tierOf,
    tieredCount,
    watchedCount: watched.length,
    affinity,
  };
};

// Score one candidate, keeping each signal's contribution and its reason.
const scoreMovie = (movie, model, context) => {
  const { affinity, tierOf } = model;
  const signals = [];
  const push = (key, value, reason) => {
    if (value !== 0) signals.push({ key, value, reason });
  };

  // Genre: its best-loved genre carries it, the rest help a little.
  const genreScores = movie.genres
    .map((genre) => ({ genre, score: affinity(model.genres, genre) }))
    .sort((a, b) => b.score - a.score);
  if (genreScores.length) {
    const [best, ...rest] = genreScores;
    const value =
      WEIGHTS.genre *
      (best.score + rest.reduce((sum, item) => sum + item.score, 0) * 0.3);
    const lovedCount = model.genres.get(best.genre)?.loved.length ?? 0;
    push(
      "genre",
      value,
      best.score > 0.8
        ? lovedCount >= 2
          ? t("{genre} gets your best tiers.", { genre: t(best.genre) })
          : t("You watch a lot of {genre}.", { genre: t(best.genre) })
        : null,
    );
  }

  // Director.
  const directorScore = affinity(model.directors, movie.director);
  if (directorScore) {
    const loved = model.directors.get(movie.director)?.loved ?? [];
    let reason = null;
    if (loved.length >= 2) {
      reason = t(
        "You tiered {first} and {second} {tier} — this is {director} too.",
        {
          first: loved[0].title,
          second: loved[1].title,
          tier: tierOf.get(loved[0].id),
          director: movie.director,
        },
      );
    } else if (loved.length === 1) {
      reason = t("You tiered {title} {tier} — same director.", {
        title: loved[0].title,
        tier: tierOf.get(loved[0].id),
      });
    }
    push("director", WEIGHTS.director * directorScore, reason);
  }

  // Cast: the best-loved actor in it.
  const actorScores = (movie.cast ?? [])
    .map((actor) => ({ actor, score: affinity(model.cast, actor) }))
    .sort((a, b) => b.score - a.score);
  if (actorScores.length && actorScores[0].score) {
    const { actor, score } = actorScores[0];
    const loved = model.cast.get(actor)?.loved ?? [];
    push(
      "cast",
      WEIGHTS.cast * score,
      loved.length
        ? t("{actor} is in it — you tiered {title} {tier}.", {
            actor: cleanName(actor),
            title: loved[0].title,
            tier: tierOf.get(loved[0].id),
          })
        : null,
    );
  }

  // Era.
  const decade = decadeOf(movie.year);
  const decadeScore = affinity(model.decades, decade);
  if (decadeScore) {
    push(
      "decade",
      WEIGHTS.decade * decadeScore,
      decadeScore > 1.2
        ? t("From the {decade}, an era you love.", { decade })
        : null,
    );
  }

  // Quality.
  push(
    "quality",
    WEIGHTS.quality * (movie.rating - 7.5),
    movie.rating >= 8.3
      ? t("IMDb {rating} — one of the greats.", {
          rating: movie.rating.toFixed(1),
        })
      : null,
  );

  // Your own watchlist.
  if (context.watchlistIds.has(movie.id)) {
    push("watchlist", WEIGHTS.watchlist, "You saved it to your watchlist.");
  }

  // Turned-down picks this session: steer away from more of the same.
  const rejectedMatches =
    movie.genres.filter((genre) => context.rejectedGenres.has(genre)).length +
    (context.rejectedDirectors.has(movie.director) ? 1 : 0);
  if (rejectedMatches) {
    push("rejected", -WEIGHTS.rejected * rejectedMatches, null);
  }

  push("jitter", WEIGHTS.jitter * context.random(), null);

  const score = signals.reduce((sum, signal) => sum + signal.value, 0);
  return { movie, score, signals };
};

// 0–100 "match" from a raw score — squashed so it reads like a percentage
// (most decent picks land in the 70s–90s, never a flat 100).
const toMatch = (score) =>
  Math.round(52 + 46 * (1 - Math.exp(-Math.max(0, score) / 7)));

// The best unwatched picks, best first.
// options: { watchlist: [movieId], rejected: [movieId], count, random }
export const getTastePicks = (watched, options = {}) => {
  const {
    watchlist = [],
    rejected = [],
    count = 5,
    random = Math.random,
  } = options;
  const model = buildTasteModel(watched);
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const rejectedIds = new Set(rejected);
  const rejectedMovies = rejected.map(getMovieById).filter(Boolean);
  const context = {
    watchlistIds: new Set(watchlist),
    rejectedGenres: new Set(rejectedMovies.flatMap((movie) => movie.genres)),
    rejectedDirectors: new Set(rejectedMovies.map((movie) => movie.director)),
    random,
  };

  return MOVIES.filter(
    (movie) => !watchedIds.has(movie.id) && !rejectedIds.has(movie.id),
  )
    .map((movie) => scoreMovie(movie, model, context))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((pick) => {
      const reasons = pick.signals
        .filter((signal) => signal.reason && signal.value > 0)
        .sort((a, b) => b.value - a.value)
        .map((signal) => signal.reason)
        .slice(0, 3);
      return {
        ...pick,
        match: toMatch(pick.score),
        reasons:
          reasons.length > 0
            ? reasons
            : ["Highly rated, and you haven't seen it yet."],
      };
    });
};

// What the "thinking" screen says it's doing — real numbers from your data.
export const getThinkingSteps = (watched, watchlist) => {
  const model = buildTasteModel(watched);
  const topDirector = [...model.directors.entries()]
    .filter(([, value]) => value.loved.length > 0)
    .sort((a, b) => b[1].sum - a[1].sum)[0]?.[0];
  const topGenre = [...model.genres.entries()].sort(
    (a, b) => b[1].sum - a[1].sum,
  )[0]?.[0];
  return [
    model.tieredCount > 0
      ? t("Reading your {count} tiers…", { count: model.tieredCount })
      : t("Looking at your {count} watched movies…", {
          count: model.watchedCount,
        }),
    topGenre
      ? t("Weighing how much you love {genre}…", { genre: t(topGenre) })
      : t("Learning your genres…"),
    topDirector
      ? t("Matching directors like {director}…", { director: topDirector })
      : t("Matching directors…"),
    watchlist.length > 0
      ? t("Checking your {count} saved movies…", { count: watchlist.length })
      : t("Scanning the whole catalog…"),
    t("Scoring {count} movies you haven't seen…", {
      count: MOVIES.length - model.watchedCount,
    }),
    t("Narrowing it down to one…"),
  ];
};

// True when there's too little history for a personal pick.
export const isColdStart = (watched) =>
  buildTasteModel(watched).watchedCount < 3;

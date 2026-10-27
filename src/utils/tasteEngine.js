import { MOVIES, getMovieById } from "../data/movies";
import { DIMENSIONS, THEMES, getVibe } from "../data/vibes";
import { useTasteStore } from "../store/tasteStore";
import { getAspect } from "./aspects";
import { weightedRating } from "./movieFilters";
import { getTier } from "./tiers";
import { t } from "../i18n";

// ReelBoard's "Taste pick" — a small, local taste engine (no network, no
// model). Every unwatched movie gets a score from what you've actually
// watched and how you tiered it, and every signal that moved the score
// leaves a plain-English reason, so a pick always explains itself.
//
// Taste is mostly what a movie *feels* like, not its genre — each movie
// has a Taste DNA (data/vibes.js: how dark, fast, mind-bending, heavy,
// epic and fantastical it is, plus its themes). Your taste is a
// fingerprint in that space, learnt from your tiers.
//
// Signals:
// - vibe            how close it feels to what you tier well (your
//                   fingerprint), nudged by why you loved things (aspects)
// - vibe you dislike how close it feels to what you tier badly or skip
// - themes          twist endings, heists, coming of age… that you love
// - director love   directors whose films you've tiered well
// - cast love       actors from movies you've tiered well
// - genre           still counts, but lightly
// - era fit         decades you favour
// - runtime         long films count against once you've said "too long"
// - quality         TMDB rating, counted by its votes, as a gentle
//                   tiebreaker
// - watchlist       you saved it yourself
// - "not this one"  this session's turned-down picks steer away
// - a pinch of randomness, so "pick again" varies but still fits
//
// Beyond tiers it learns from two lighter signals (store/tasteStore):
// aspects ("the twist", "too slow"…) and passes (skips in Swipe and AI
// pick), which fade over a few weeks.

// How much each tier says about your taste. Watched-but-untiered still
// counts a little — you chose to watch it.
const TIER_WEIGHT = { S: 3, A: 2, B: 1, C: 0, D: -1.5, F: -2.5 };
const UNTIERED_WEIGHT = 0.5;
// A skip is a weak "no", fading by half every PASS_HALF_LIFE_DAYS.
const PASS_WEIGHT = -0.6;
const PASS_HALF_LIFE_DAYS = 21;
// How far one aspect tap moves the fingerprint, and the cap on the total
// nudge per dimension.
const ASPECT_STRENGTH = 0.35;
const ASPECT_CAP = 1.2;
// Onboarding's "this or that": with nothing liked yet they *are* the
// fingerprint (3 ± this much); once tiers exist they just nudge it.
const LEANING_ALONE = 1.3;
const LEANING_NUDGE = 0.7;
// Before anything's tiered, a dimension the answers left open (0) counts
// this much in the vibe match, so it doesn't drown out the ones you did
// say something about.
const OPEN_DIMENSION_WEIGHT = 0.25;
const LONG_RUNTIME = 135;
// With nothing to go on (nothing watched, no "this or that" answered), a
// bigger shuffle among the good, well-known films.
const COLD_JITTER = 2;

const WEIGHTS = {
  vibe: 2.4,
  dislikedVibe: 1.6,
  theme: 0.6,
  genre: 0.35,
  director: 0.9,
  cast: 0.5,
  decade: 0.3,
  runtime: 0.8,
  quality: 0.8,
  watchlist: 1.1,
  rejected: 1.2,
  jitter: 0.7,
};

// Distance in Taste DNA space (six 1–5 dimensions), and how "close" that
// is as 0–1.
const MAX_DISTANCE = Math.sqrt(DIMENSIONS.length * 16);
const vibeDistance = (a, b) =>
  Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
const closeness = (a, b) => 1 - vibeDistance(a, b) / MAX_DISTANCE;
// The same, with some dimensions counting more than others (scaled so
// equal weights give exactly `closeness`).
const weightedCloseness = (a, b, weights) => {
  if (!weights) return closeness(a, b);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const squared = a.reduce(
    (sum, value, index) => sum + weights[index] * (value - b[index]) ** 2,
    0,
  );
  return 1 - Math.sqrt((squared / total) * a.length) / MAX_DISTANCE;
};

// How alike two movies feel, 0–1 (dimensions, plus a little for each
// shared theme).
export const vibeSimilarity = (movieA, movieB) => {
  const a = getVibe(movieA.id);
  const b = getVibe(movieB.id);
  const shared = a.themes.filter((theme) => b.themes.includes(theme)).length;
  return Math.min(1, closeness(a.dims, b.dims) + shared * 0.06);
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

const passWeight = (pass, now) =>
  PASS_WEIGHT * 0.5 ** ((now - pass.at) / (PASS_HALF_LIFE_DAYS * 86400000));

// Your taste, learnt from the watched list (and, for your own picks, the
// aspect / pass signals — friends' models are built from tiers only).
export const buildTasteModel = (watched, signals = {}) => {
  const { aspects = {}, passes = [], leanings = null, now = Date.now() } =
    signals;
  const genres = new Map();
  const directors = new Map();
  const cast = new Map();
  const decades = new Map();
  const themes = new Map();
  const tierOf = new Map();
  const liked = { sum: DIMENSIONS.map(() => 0), weight: 0 };
  const disliked = { sum: DIMENSIONS.map(() => 0), weight: 0 };
  const lovedMovies = [];
  let tieredCount = 0;

  const learn = (movie, weight) => {
    movie.genres.forEach((genre) => add(genres, genre, weight, movie));
    add(directors, movie.director, weight, movie);
    (movie.cast ?? []).forEach((actor) => add(cast, actor, weight, movie));
    add(decades, decadeOf(movie.year), weight, movie);
    const vibe = getVibe(movie.id);
    vibe.themes.forEach((theme) => add(themes, theme, weight, movie));
    const side = weight > 0 ? liked : weight < 0 ? disliked : null;
    if (side) {
      vibe.dims.forEach((value, index) => {
        side.sum[index] += Math.abs(weight) * value;
      });
      side.weight += Math.abs(weight);
    }
  };

  const watchedIds = new Set();
  watched.forEach((entry) => {
    const movie = getMovieById(entry.movieId);
    if (!movie) return;
    watchedIds.add(movie.id);
    const tier = getTier(entry);
    if (tier) tieredCount += 1;
    tierOf.set(movie.id, tier);
    const weight = tier ? TIER_WEIGHT[tier] : UNTIERED_WEIGHT;
    if (weight >= TIER_WEIGHT.A) lovedMovies.push(movie);
    learn(movie, weight);
  });

  passes.forEach((pass) => {
    if (watchedIds.has(pass.movieId)) return;
    const movie = getMovieById(pass.movieId);
    if (movie) learn(movie, passWeight(pass, now));
  });

  // Aspects nudge the fingerprint and themes, and "too long" sets a
  // runtime preference.
  const nudge = DIMENSIONS.map(() => 0);
  let prefersShorter = false;
  Object.entries(aspects).forEach(([movieId, keys]) => {
    const movie = getMovieById(movieId);
    if (!movie) return;
    keys.forEach((key) => {
      const aspect = getAspect(key);
      if (!aspect) return;
      Object.entries(aspect.dims ?? {}).forEach(([index, delta]) => {
        nudge[index] += delta * ASPECT_STRENGTH;
      });
      (aspect.themes ?? []).forEach((theme) =>
        add(themes, theme, TIER_WEIGHT.A, movie),
      );
      if (aspect.shorter) prefersShorter = true;
    });
  });

  const centroid = (side) =>
    side.weight > 0 ? side.sum.map((value) => value / side.weight) : null;
  const clampDim = (value) => Math.min(5, Math.max(1, value));
  const likedCentroid = centroid(liked);
  let fingerprint = likedCentroid
    ? likedCentroid.map((value, index) =>
        clampDim(
          value + Math.max(-ASPECT_CAP, Math.min(ASPECT_CAP, nudge[index])),
        ),
      )
    : null;
  let fingerprintWeights = null;
  if (leanings) {
    if (fingerprint) {
      fingerprint = fingerprint.map((value, index) =>
        clampDim(value + (leanings[index] ?? 0) * LEANING_NUDGE),
      );
    } else {
      fingerprint = leanings.map((lean) =>
        clampDim(3 + (lean ?? 0) * LEANING_ALONE),
      );
      fingerprintWeights = leanings.map((lean) =>
        lean ? 1 : OPEN_DIMENSION_WEIGHT,
      );
    }
  }

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
    themes,
    tierOf,
    tieredCount,
    watchedCount: watched.length,
    affinity,
    // Where your tiers sit in Taste DNA space (null before anything is
    // liked), and where the things you didn't like sit.
    fingerprint,
    fingerprintWeights,
    dislikedCentroid: centroid(disliked),
    lovedMovies,
    prefersShorter,
  };
};

// Scale and realism describe a taste less than tone, pace, complexity and
// weight do, so they count a little less when choosing the words.
const DESCRIBE_WEIGHT = [1, 1, 1, 1, 0.75, 0.75];

// The fingerprint in words: its two strongest leanings, e.g.
// ["dark", "mind-bending"]. Empty when there's no clear lean yet.
export const describeFingerprint = (fingerprint) => {
  if (!fingerprint) return [];
  return fingerprint
    .map((value, index) => ({
      index,
      lean: (value - 3) * DESCRIBE_WEIGHT[index],
    }))
    .filter(({ lean }) => Math.abs(lean) >= 0.5)
    .sort((a, b) => Math.abs(b.lean) - Math.abs(a.lean))
    .slice(0, 2)
    .map(({ index, lean }) =>
      lean > 0 ? DIMENSIONS[index].high : DIMENSIONS[index].low,
    );
};

const joinWords = (words) =>
  words.length === 2
    ? t("{first} and {second}", { first: t(words[0]), second: t(words[1]) })
    : t(words[0]);
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Score one candidate, keeping each signal's contribution and its reason.
const scoreMovie = (movie, model, context) => {
  const { affinity, tierOf } = model;
  const vibe = getVibe(movie.id);
  const signals = [];
  const push = (key, value, reason) => {
    if (value !== 0) signals.push({ key, value, reason });
  };

  // Vibe: how close it feels to your fingerprint.
  if (model.fingerprint) {
    const fit = weightedCloseness(
      model.fingerprint,
      vibe.dims,
      model.fingerprintWeights,
    );
    const value = WEIGHTS.vibe * (fit - 0.65) * 5;
    let reason = null;
    if (value > 0) {
      // Its most distinctive qualities that you also lean towards…
      const shared = vibe.dims
        .map((dim, index) => ({
          index,
          lean: dim - 3,
          yours: model.fingerprint[index] - 3,
        }))
        .filter(({ lean, yours }) => Math.abs(lean) >= 1 && lean * yours > 0)
        .sort((a, b) => Math.abs(b.lean) - Math.abs(a.lean))
        .slice(0, 2)
        .map(({ index, lean }) =>
          lean > 0 ? DIMENSIONS[index].high : DIMENSIONS[index].low,
        );
      // …and the movie you loved that it feels most like.
      const nearest = model.lovedMovies
        .map((loved) => ({ loved, similarity: vibeSimilarity(loved, movie) }))
        .sort((a, b) => b.similarity - a.similarity)[0];
      if (nearest && nearest.similarity >= 0.8) {
        reason = t("Feels like {title}, which you tiered {tier}.", {
          title: nearest.loved.title,
          tier: tierOf.get(nearest.loved.id),
        });
        if (shared.length) {
          reason = `${capitalize(joinWords(shared))} — ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`;
        }
      } else if (shared.length) {
        reason = t("{qualities} — right on your wavelength.", {
          qualities: capitalize(joinWords(shared)),
        });
      }
    }
    push("vibe", value, reason);
  }

  // Vibe you don't enjoy: close to what you tier badly or skip.
  if (model.dislikedCentroid) {
    const fit = closeness(model.dislikedCentroid, vibe.dims);
    if (fit > 0.75) {
      push(
        "dislikedVibe",
        -WEIGHTS.dislikedVibe * (fit - 0.75) * 8,
        t("It feels like films you tiered low."),
      );
    }
  }

  // Themes: its best-loved theme carries it.
  const themeScores = vibe.themes
    .map((theme) => ({ theme, score: affinity(model.themes, theme) }))
    .sort((a, b) => b.score - a.score);
  if (themeScores.length && themeScores[0].score) {
    const [best, ...rest] = themeScores;
    const lovedCount = model.themes.get(best.theme)?.loved.length ?? 0;
    push(
      "theme",
      WEIGHTS.theme *
        (best.score + rest.reduce((sum, item) => sum + item.score, 0) * 0.3),
      best.score > 1.5 && lovedCount >= 2
        ? t("Another of the {theme} you rate highly.", {
            theme: t(THEMES[best.theme]),
          })
        : null,
    );
  }

  // Genre: still a signal, just a light one now.
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
      best.score > 1.5 && lovedCount >= 3
        ? t("{genre} gets your best tiers.", { genre: t(best.genre) })
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

  // Runtime: only once you've said something was too long.
  if (model.prefersShorter && movie.runtime > LONG_RUNTIME) {
    push(
      "runtime",
      -WEIGHTS.runtime * ((movie.runtime - LONG_RUNTIME) / 30),
      t("Longer than you like."),
    );
  }

  // Quality.
  const quality = weightedRating(movie);
  push(
    "quality",
    WEIGHTS.quality * (quality - 7.5),
    quality >= 8
      ? t("Rated {rating} on TMDB — one of the greats.", {
          rating: movie.rating.toFixed(1),
        })
      : null,
  );

  // Your own watchlist.
  if (context.watchlistIds.has(movie.id)) {
    push("watchlist", WEIGHTS.watchlist, t("You saved it to your watchlist."));
  }

  // Turned-down picks this session: steer away from more of the same.
  const rejectedMatches =
    movie.genres.filter((genre) => context.rejectedGenres.has(genre)).length +
    (context.rejectedDirectors.has(movie.director) ? 1 : 0);
  if (rejectedMatches) {
    push("rejected", -WEIGHTS.rejected * rejectedMatches, null);
  }

  push("jitter", context.jitter * context.random(), null);

  const score = signals.reduce((sum, signal) => sum + signal.value, 0);
  return { movie, score, signals };
};

// 0–100 "match" from a raw score — squashed so it reads like a percentage
// (most decent picks land in the 70s–90s, never a flat 100).
const toMatch = (score) =>
  Math.round(52 + 46 * (1 - Math.exp(-Math.max(0, score) / 7)));

// Why a pick scored well, best reason first: the "feels like…" vibe reason
// leads when there is one — it's the most personal — then the rest by how
// much they moved the score.
const reasonsOf = (signals) => {
  const reasons = signals
    .filter((signal) => signal.reason && signal.value > 0)
    .sort(
      (a, b) =>
        (b.key === "vibe") - (a.key === "vibe") || b.value - a.value,
    )
    .map((signal) => signal.reason)
    .slice(0, 3);
  return reasons.length > 0
    ? reasons
    : [t("Highly rated, and you haven't seen it yet.")];
};

// What each signal is, for the "why this match" breakdown.
const FACTOR_LABELS = {
  vibe: "Feel",
  dislikedVibe: "Feel",
  theme: "Themes",
  genre: "Genre",
  director: "Director",
  cast: "Cast",
  decade: "Era",
  quality: "Ratings",
  runtime: "Length",
};

// Every signal that moved a match, biggest first: { key, label, value,
// reason } — positive pulled it up, negative down. Session-only signals
// (jitter, turned-down picks, your watchlist) are left out.
const factorsOf = (signals) =>
  signals
    .filter((signal) => FACTOR_LABELS[signal.key] && Math.abs(signal.value) >= 0.05)
    .map((signal) => ({
      key: signal.key,
      label: FACTOR_LABELS[signal.key],
      value: signal.value,
      reason: signal.reason,
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

// Your own model: tiers plus your aspects and passes.
export const buildMyTasteModel = (watched) => {
  const { aspects, passes, leanings } = useTasteStore.getState();
  return buildTasteModel(watched, { aspects, passes, leanings });
};

// The best unwatched picks, best first — from the candidates (MOVIES), or
// `from`, a list of your own (e.g. the movies Reels has clips for).
// options: { watchlist: [movieId], rejected: [movieId], count, random, from }
export const getTastePicks = (watched, options = {}) => {
  const {
    watchlist = [],
    rejected = [],
    count = 5,
    random = Math.random,
    from = MOVIES,
  } = options;
  const model = buildMyTasteModel(watched);
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const rejectedIds = new Set(rejected);
  const rejectedMovies = rejected.map(getMovieById).filter(Boolean);
  const context = {
    watchlistIds: new Set(watchlist),
    rejectedGenres: new Set(rejectedMovies.flatMap((movie) => movie.genres)),
    rejectedDirectors: new Set(rejectedMovies.map((movie) => movie.director)),
    random,
    jitter:
      model.watchedCount === 0 && !useTasteStore.getState().leanings?.some(Boolean)
        ? COLD_JITTER
        : WEIGHTS.jitter,
  };

  return from.filter(
    (movie) => !watchedIds.has(movie.id) && !rejectedIds.has(movie.id),
  )
    .map((movie) => scoreMovie(movie, model, context))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((pick) => ({
      ...pick,
      match: toMatch(pick.score),
      reasons: reasonsOf(pick.signals),
    }));
};

// How well one movie fits your taste — for its page. The same score as the
// picks, but without the shuffle (so it reads the same on every visit) and
// without the watchlist bonus (it's about taste, not plans). null for a
// movie you've watched (your tier says it) or with too little history.
// → { match: 0–100, reasons: [string] }
export const getMovieMatch = (watched, movie) => {
  if (!movie?.vibe || watched.some((entry) => entry.movieId === movie.id)) {
    return null;
  }
  const model = buildMyTasteModel(watched);
  if (model.watchedCount < 3) return null;
  const pick = scoreMovie(movie, model, {
    watchlistIds: new Set(),
    rejectedGenres: new Set(),
    rejectedDirectors: new Set(),
    random: () => 0,
    jitter: 0,
  });
  return {
    match: toMatch(pick.score),
    reasons: reasonsOf(pick.signals),
    // For the breakdown: what moved it, and how much of you it's based on.
    factors: factorsOf(pick.signals),
    tieredCount: model.tieredCount,
    watchedCount: model.watchedCount,
  };
};

// How well a movie fits anyone's taste from a model of their tiers
// (buildTasteModel) — a friend's, for picking for a group (utils/groupPick).
// The same score as the picks, without shuffle or session signals; null
// with too little history to say.
const NO_SESSION = {
  watchlistIds: new Set(),
  rejectedGenres: new Set(),
  rejectedDirectors: new Set(),
  random: () => 0,
  jitter: 0,
};
export const matchForModel = (model, movie) =>
  model.watchedCount < 3 ? null : toMatch(scoreMovie(movie, model, NO_SESSION).score);

// What the "thinking" screen says it's doing — real numbers from your data.
export const getThinkingSteps = (watched, watchlist) => {
  const model = buildMyTasteModel(watched);
  const leanings = describeFingerprint(model.fingerprint);
  const topDirector = [...model.directors.entries()]
    .filter(([, value]) => value.loved.length > 0)
    .sort((a, b) => b[1].sum - a[1].sum)[0]?.[0];
  const topTheme = [...model.themes.entries()]
    .filter(([, value]) => value.sum > 0)
    .sort((a, b) => b[1].sum - a[1].sum)[0]?.[0];
  return [
    model.tieredCount > 0
      ? t("Reading your {count} tiers…", { count: model.tieredCount })
      : t("Looking at your {count} watched movies…", {
          count: model.watchedCount,
        }),
    leanings.length
      ? t("Mapping your taste DNA — you lean {leanings}…", {
          leanings: joinWords(leanings),
        })
      : t("Mapping your taste DNA…"),
    topTheme
      ? t("Weighing how much you love {theme}…", { theme: t(THEMES[topTheme]) })
      : t("Learning the themes you love…"),
    topDirector
      ? t("Matching directors like {director}…", { director: topDirector })
      : t("Matching directors…"),
    watchlist.length > 0
      ? t("Checking your {count} saved movies…", { count: watchlist.length })
      : t("Scanning the whole catalog…"),
    // The candidates are picked from movies you haven't seen.
    t("Scoring {count} movies you haven't seen…", { count: MOVIES.length }),
    t("Narrowing it down to one…"),
  ];
};

// True when there's too little history for a personal pick.
export const isColdStart = (watched) =>
  buildTasteModel(watched).watchedCount < 3;

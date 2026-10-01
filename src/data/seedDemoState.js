import { MOVIES } from "./movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { DIFFICULTY } from "../utils/xp";

// Populates a brand-new install with a plausible, already-engaged profile
// instead of real zero — an explicit, deliberate exception to this app's
// "derive, never fabricate" rule, made only here and only once. Everything
// downstream (badges, collections, XP, level, rank) is still computed live
// from this seeded data by the same real functions a genuine user's data
// would run through — nothing about XP/level/rank itself is hardcoded.
//
// Selection is deterministic (rank-based + a couple of named picks), not
// Math.random(), so a re-run of this exact logic always produces the same
// shape — calibrated by hand to land around Level 18 / Gold, matching the
// product spec's own example.

const DAY_MS = 24 * 60 * 60 * 1000;

const TOP_N = 60;
const SPREAD_EVERY = 12;

const byDirector = new Map();
MOVIES.forEach((movie) => {
  if (!byDirector.has(movie.director)) byDirector.set(movie.director, []);
  byDirector.get(movie.director).push(movie);
});

const LOTR = MOVIES.filter((movie) => movie.franchise === "The Lord of the Rings");
const NOLAN = byDirector.get("Christopher Nolan") ?? [];
// Left unwatched on purpose — sits on the watchlist instead, so the Nolan
// collection reads as "in progress" rather than already finished.
const NOLAN_WATCHED = NOLAN.filter((movie) => movie.title !== "Tenet");
const TENET = NOLAN.find((movie) => movie.title === "Tenet");

const buildWatchedSelection = () => {
  const ids = new Set();
  MOVIES.filter((movie) => movie.rank <= TOP_N).forEach((movie) => ids.add(movie.id));
  LOTR.forEach((movie) => ids.add(movie.id));
  NOLAN_WATCHED.forEach((movie) => ids.add(movie.id));
  MOVIES.filter((movie) => movie.rank > TOP_N).forEach((movie, index) => {
    if (index % SPREAD_EVERY === 0) ids.add(movie.id);
  });
  return MOVIES.filter((movie) => ids.has(movie.id));
};

// A handful of 0.5-step ratings cycled deterministically across the
// watched list, skewed positive (an engaged fan rates what they finish
// generously) with every 5th movie left unrated, same as a real viewer who
// doesn't rate everything.
const RATING_CYCLE = [4, 4.5, 5, 3.5, 4, 5, 4.5, 4];

const buildWatchedEntries = () => {
  const lotrIds = new Set(LOTR.map((movie) => movie.id));
  const nolanIds = new Set(NOLAN_WATCHED.map((movie) => movie.id));
  const selection = buildWatchedSelection();
  const now = Date.now();

  return selection.map((movie, index) => {
    // Three recency tiers tell a small, plausible story: a LOTR marathon
    // just finished, a Nolan kick a couple months back, the rest are the
    // older backlog of classics that built up over the past year.
    let daysAgo;
    if (lotrIds.has(movie.id)) {
      daysAgo = 2 + (index % 5);
    } else if (nolanIds.has(movie.id)) {
      daysAgo = 35 + (index % 40);
    } else {
      daysAgo = 90 + (index % 280);
    }

    const rating = index % 5 === 4 ? null : RATING_CYCLE[index % RATING_CYCLE.length];

    return {
      movieId: movie.id,
      timestamp: now - daysAgo * DAY_MS,
      rating,
    };
  }).sort((a, b) => b.timestamp - a.timestamp);
};

const BUCKET_SPREAD_EVERY = 5;

const buildBucketListEntries = (watchedIds) => {
  const now = Date.now();
  const candidates = MOVIES.filter(
    (movie) => !watchedIds.has(movie.id) && movie.id !== TENET?.id,
  ).filter((movie, index) => index % BUCKET_SPREAD_EVERY === 0);

  const entries = candidates.map((movie, index) => ({
    movieId: movie.id,
    // Spread across the last ~10 weeks, most recent first.
    addedAt: now - (3 + index * 2) * DAY_MS,
  }));

  if (TENET) {
    // Sits well past the 14-day "forgotten" threshold on purpose — keeps
    // the Nolan collection reachable via a real "Complete the Director"
    // or "Forgotten One" challenge generation.
    entries.push({ movieId: TENET.id, addedAt: now - 40 * DAY_MS });
  }

  return entries;
};

const makeHistoryEntry = ({ id, title, description, targetMovieId, difficulty, daysAgo, status }) => ({
  id,
  type: "seed",
  title,
  description,
  targetMovieId,
  difficulty,
  difficultyLabel: DIFFICULTY[difficulty].label,
  xpReward: Math.round((DIFFICULTY[difficulty].min + DIFFICULTY[difficulty].max) / 2 / 10) * 10,
  status,
  resolvedAt: Date.now() - daysAgo * DAY_MS,
});

const buildChallengeHistory = () => {
  const inception = MOVIES.find((movie) => movie.title === "Inception");
  const interstellar = MOVIES.find((movie) => movie.title === "Interstellar");
  const darkKnight = MOVIES.find((movie) => movie.title === "The Dark Knight");
  const returnOfTheKing = MOVIES.find(
    (movie) => movie.title === "The Lord of the Rings: The Return of the King",
  );

  const entries = [
    returnOfTheKing && makeHistoryEntry({
      id: "seed-complete-the-collection",
      title: "Complete the Collection",
      description: "One movie left to finish The Lord of the Rings.",
      targetMovieId: returnOfTheKing.id,
      difficulty: "HARD",
      daysAgo: 3,
      status: "completed",
    }),
    darkKnight && makeHistoryEntry({
      id: "seed-director-dive",
      title: "Director Dive",
      description: "Keep going through Christopher Nolan's filmography.",
      targetMovieId: darkKnight.id,
      difficulty: "MEDIUM",
      daysAgo: 38,
      status: "completed",
    }),
    inception && makeHistoryEntry({
      id: "seed-hidden-gem",
      title: "Hidden Gem",
      description: "A highly-rated movie you hadn't gotten to yet.",
      targetMovieId: inception.id,
      difficulty: "MEDIUM",
      daysAgo: 55,
      status: "completed",
    }),
    interstellar && makeHistoryEntry({
      id: "seed-roll-the-dice",
      title: "Roll the Dice",
      description: "No overthinking it.",
      targetMovieId: interstellar.id,
      difficulty: "EASY",
      daysAgo: 60,
      status: "completed",
    }),
  ].filter(Boolean);

  return entries.sort((a, b) => b.resolvedAt - a.resolvedAt);
};

export const seedDemoState = () => {
  const watched = buildWatchedEntries();
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const bucketList = buildBucketListEntries(watchedIds);
  const history = buildChallengeHistory();

  useMovieStore.setState({ watched, bucketList, pickedMovie: null });
  useChallengeStore.setState({ activeChallenge: null, history });
  useProfileStore.setState({ displayName: "Yazan" });
};

export default seedDemoState;

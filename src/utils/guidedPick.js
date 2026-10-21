import { MOVIES } from "../data/movies";
import { t } from "../i18n";
import { MOODS, getMood, moodScore } from "./moods";
import { formatRuntime, matchesGenres, weightedRating } from "./movieFilters";
import { buildMyTasteModel, getTastePicks } from "./tasteEngine";

// "Let ReelBoard choose" without a language model: a few quick taps —
// the mood, how long you've got, who's watching, familiar or new — then
// the taste engine picks with them. Each answer narrows or leans the
// ranking; the pick comes back in getTastePicks' shape, its reasons led by
// what you asked for.

export const QUESTIONS = [
  {
    key: "mood",
    title: "What's the mood?",
    options: [
      { key: "any", emoji: "🎲", label: "Anything" },
      ...MOODS.map((mood) => ({ key: mood.key, emoji: mood.emoji, label: mood.label })),
    ],
  },
  {
    key: "time",
    title: "How long have you got?",
    options: [
      { key: "short", emoji: "⚡", label: "Under 1h 45" },
      { key: "normal", emoji: "🕑", label: "About 2 hours" },
      { key: "any", emoji: "🌙", label: "No limit" },
    ],
  },
  {
    key: "company",
    title: "Who's watching?",
    options: [
      { key: "solo", emoji: "🙋", label: "Just me" },
      { key: "date", emoji: "💑", label: "Date night" },
      { key: "friends", emoji: "🍕", label: "Friends" },
      { key: "family", emoji: "👨‍👩‍👧", label: "Family" },
    ],
  },
  {
    key: "familiar",
    title: "Familiar or new?",
    options: [
      { key: "usual", emoji: "🎯", label: "My usual" },
      { key: "mix", emoji: "🔀", label: "Mix it up" },
      { key: "different", emoji: "🧭", label: "Something different" },
    ],
  },
];

export const DEFAULT_ANSWERS = { mood: "any", time: "any", company: "solo", familiar: "usual" };

const RUNTIME_CAP = { short: 105, normal: 135, any: null };
// Who's watching: genres that suit the room (a lean), and genres that
// don't belong in it at all (family night skips horror and crime).
const COMPANY = {
  solo: { lean: [], skip: [] },
  date: { lean: ["Romance", "Comedy", "Drama"], skip: [] },
  friends: { lean: ["Comedy", "Action", "Horror", "Thriller"], skip: [] },
  family: { lean: ["Animation", "Adventure", "Fantasy", "Comedy"], skip: ["Horror", "Thriller", "Crime"] },
};
// How much each answer moves the ranking against your taste score (which
// runs roughly 0–20).
const MOOD_WEIGHT = 3;
const LEAN_BONUS = 3;
const QUALITY_WEIGHT = 2;
// Enough left to choose from before loosening the filters.
const MIN_CANDIDATES = 3;
// The pick is one of the best few, so asking again can differ.
const TOP_FEW = 4;

// Hard filters for the answers, loosest last: mood genres, then time, go
// before company (family night keeps its skips).
const filtersFor = (answers) => {
  const mood = getMood(answers.mood);
  const cap = RUNTIME_CAP[answers.time];
  const company = COMPANY[answers.company] ?? COMPANY.solo;
  const fitsMood = (movie) => !mood?.genres || matchesGenres(movie, mood.genres);
  const fitsTime = (movie) =>
    (!cap || movie.runtime <= cap) && (!mood?.maxRuntime || movie.runtime <= mood.maxRuntime);
  const fitsCompany = (movie) => !movie.genres.some((genre) => company.skip.includes(genre));
  return [
    (movie) => fitsMood(movie) && fitsTime(movie) && fitsCompany(movie),
    (movie) => fitsTime(movie) && fitsCompany(movie),
    (movie) => fitsCompany(movie),
    () => true,
  ];
};

// Why it fits what you asked, in your words.
const answerReasons = (movie, answers) => {
  const reasons = [];
  const mood = getMood(answers.mood);
  if (mood) reasons.push(t("{mood}, like you asked", { mood: t(mood.label) }));
  const cap = RUNTIME_CAP[answers.time];
  if (cap && movie.runtime && movie.runtime <= cap) {
    reasons.push(t("{runtime} — fits your time", { runtime: formatRuntime(movie.runtime) }));
  }
  const lean = COMPANY[answers.company]?.lean ?? [];
  if (answers.company === "date" && movie.genres.some((genre) => lean.includes(genre))) {
    reasons.push(t("Good for a date night"));
  } else if (answers.company === "friends" && movie.genres.some((genre) => lean.includes(genre))) {
    reasons.push(t("Fun with friends"));
  } else if (answers.company === "family") {
    reasons.push(t("Fine for the whole family"));
  }
  if (answers.familiar === "different") reasons.push(t("Not your usual — on purpose"));
  return reasons;
};

// One line for the thinking screen: "Funny · Under 1h 45 · Date night".
export const describeAnswers = (answers) =>
  QUESTIONS.map((question) => {
    const value = answers[question.key];
    if (value === DEFAULT_ANSWERS[question.key]) return null;
    return t(question.options.find((option) => option.key === value)?.label ?? "");
  })
    .filter(Boolean)
    .join(" · ");

// The pick for these answers: { movie, score, signals, match, reasons },
// or null when there's nothing left. `options`: { watchlist, rejected }.
export const getGuidedPick = (watched, answers, { watchlist = [], rejected = [] } = {}) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const rejectedIds = new Set(rejected);
  const unseen = MOVIES.filter((movie) => !watchedIds.has(movie.id) && !rejectedIds.has(movie.id));

  // The tightest filters that still leave a few to choose from.
  const candidates =
    filtersFor(answers)
      .map((fits) => unseen.filter(fits))
      .find((list) => list.length >= MIN_CANDIDATES) ?? unseen;
  if (candidates.length === 0) return null;

  // "Mix it up" leaves your watchlist out, so it isn't what you'd pick.
  const from =
    answers.familiar === "mix"
      ? candidates.filter((movie) => !watchlist.includes(movie.id))
      : candidates;
  const picks = getTastePicks(watched, {
    from: from.length > 0 ? from : candidates,
    watchlist: answers.familiar === "usual" ? watchlist : [],
    count: candidates.length,
  });

  const mood = getMood(answers.mood);
  const { fingerprint } = mood ? buildMyTasteModel(watched) : {};
  const lean = COMPANY[answers.company]?.lean ?? [];
  // Your taste counts fully for "my usual", half for "mix it up", and
  // against you for "something different" — always kept to good films.
  const tasteWeight = { usual: 1, mix: 0.5, different: -0.5 }[answers.familiar] ?? 1;
  const ranked = picks
    .map((pick) => {
      const { movie } = pick;
      let total = tasteWeight * pick.score;
      if (mood) total += MOOD_WEIGHT * moodScore(movie, mood, fingerprint);
      if (movie.genres.some((genre) => lean.includes(genre))) total += LEAN_BONUS;
      if (answers.familiar !== "usual") total += QUALITY_WEIGHT * (weightedRating(movie) - 7);
      return { pick, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_FEW);

  const { pick } = ranked[Math.floor(Math.random() * ranked.length)];
  return {
    ...pick,
    reasons: [...answerReasons(pick.movie, answers), ...pick.reasons].slice(0, 4),
  };
};

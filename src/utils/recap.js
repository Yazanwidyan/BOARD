import { getMovieById } from "../data/movies";
import { tierRank } from "./tiers";
import { getUserXP } from "./xp";

// The recap — "your month (or year) on ReelBoard" — worked out from the
// watch history, like a little Wrapped: how much you watched, what kind of
// things, your favourites from that stretch and the XP it earned.

const MONTH = "month";
const YEAR = "year";

// The periods the recap screen offers, newest first: this month, last
// month, this year. `start`/`end` are timestamps, end exclusive.
export const getRecapPeriods = (now = new Date()) => {
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisYear = new Date(now.getFullYear(), 0, 1);
  const nextYear = new Date(now.getFullYear() + 1, 0, 1);
  return [
    { key: "this-month", kind: MONTH, start: thisMonth.getTime(), end: nextMonth.getTime(), date: thisMonth },
    { key: "last-month", kind: MONTH, start: lastMonth.getTime(), end: thisMonth.getTime(), date: lastMonth },
    { key: "this-year", kind: YEAR, start: thisYear.getTime(), end: nextYear.getTime(), date: thisYear },
  ];
};

const topBy = (items, keyOf, limit) => {
  const counts = new Map();
  items.forEach((item) =>
    [keyOf(item)].flat().filter(Boolean).forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1)),
  );
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
};

// `watched`: the full history ({ movieId, timestamp, tier, ... }).
export const buildRecap = (watched, period) => {
  const inPeriod = watched.filter(
    (entry) => entry.timestamp >= period.start && entry.timestamp < period.end,
  );
  const movies = inPeriod.map((entry) => getMovieById(entry.movieId)).filter(Boolean);
  const before = watched.filter((entry) => entry.timestamp < period.start);
  const upToEnd = watched.filter((entry) => entry.timestamp < period.end);

  // Favourites: best tier first, most recent first within a tier.
  const favourites = [...inPeriod]
    .sort((a, b) => tierRank(a) - tierRank(b) || b.timestamp - a.timestamp)
    .map((entry) => ({ movie: getMovieById(entry.movieId), entry }))
    .filter(({ movie }) => movie)
    .slice(0, 6);

  const longest = movies.reduce((best, movie) => (!best || movie.runtime > best.runtime ? movie : best), null);

  return {
    count: movies.length,
    minutes: movies.reduce((sum, movie) => sum + (movie.runtime ?? 0), 0),
    topGenres: topBy(movies, (movie) => movie.genres, 3),
    topDirector: topBy(movies, (movie) => movie.director, 1).find(({ count }) => count > 1) ?? null,
    favourites,
    longest,
    // XP from this stretch: everything up to its end, minus what was
    // already earned before it began.
    xp: getUserXP(upToEnd) - getUserXP(before),
    decades: topBy(movies, (movie) => `${Math.floor(movie.year / 10) * 10}s`, 1)[0] ?? null,
  };
};

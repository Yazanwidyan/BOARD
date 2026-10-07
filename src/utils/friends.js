import { getMovieById } from "../data/movies";
import { buildTasteModel } from "./tasteEngine";
import { getTier } from "./tiers";

const LOVED = new Set(["S", "A"]);

// How alike two watch histories are, as a 0–100 "taste match": cosine
// similarity of the genre-love each history builds (the same model the AI
// pick uses), nudged up by movies you both tiered alike. Null until you've
// watched enough for it to mean anything.
export const getTasteMatch = (myWatched, theirWatched) => {
  if (myWatched.length < 3 || theirWatched.length < 3) return null;
  const mine = buildTasteModel(myWatched);
  const theirs = buildTasteModel(theirWatched);
  const genres = new Set([...mine.genres.keys(), ...theirs.genres.keys()]);
  let dot = 0;
  let a = 0;
  let b = 0;
  genres.forEach((genre) => {
    const x = mine.affinity(mine.genres, genre);
    const y = theirs.affinity(theirs.genres, genre);
    dot += x * y;
    a += x * x;
    b += y * y;
  });
  const cosine = a && b ? dot / Math.sqrt(a * b) : 0;

  // Shared movies: same tier band → closer.
  const myTiers = new Map(
    myWatched.map((entry) => [entry.movieId, getTier(entry)]),
  );
  const agreements = theirWatched.filter((entry) => {
    const mineTier = myTiers.get(entry.movieId);
    return mineTier && LOVED.has(mineTier) === LOVED.has(entry.tier);
  }).length;

  return Math.max(
    12,
    Math.min(99, Math.round(38 + 52 * Math.max(0, cosine) + agreements * 2)),
  );
};

// Movies you both tiered S or A.
export const getBothLoved = (myWatched, theirWatched) => {
  const myLoved = new Set(
    myWatched
      .filter((entry) => LOVED.has(getTier(entry)))
      .map((entry) => entry.movieId),
  );
  return theirWatched
    .filter((entry) => LOVED.has(entry.tier) && myLoved.has(entry.movieId))
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean);
};

// What they tiered S or A that you haven't watched — best tiers first.
export const getTheyLovedYouHavent = (myWatched, theirWatched) => {
  const seen = new Set(myWatched.map((entry) => entry.movieId));
  return theirWatched
    .filter((entry) => LOVED.has(entry.tier) && !seen.has(entry.movieId))
    .sort((x, y) => (x.tier === "S" ? 0 : 1) - (y.tier === "S" ? 0 : 1))
    .map((entry) => ({ movie: getMovieById(entry.movieId), tier: entry.tier }))
    .filter((item) => item.movie);
};

const DAY = 24 * 60 * 60 * 1000;

export const timeAgo = (timestamp, now = Date.now()) => {
  const minutes = Math.floor((now - timestamp) / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor((now - timestamp) / DAY);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
};

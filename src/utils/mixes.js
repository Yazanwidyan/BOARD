import { getMovieById } from "../data/movies";
import { tierRank } from "./tiers";

// The moods a mix can be: each a test on a film (moodFits).
const MOODS = [
  { key: "light", label: "Feel-good" },
  { key: "intense", label: "Intense" },
  { key: "short", label: "Under 2h" },
  { key: "together", label: "Together" },
];

// Whether a film fits a mood — from its runtime, and its Taste DNA
// (data/vibes: dark, pace, mind, heavy, scale, unreal, each 1–5).
const moodFits = (movie, moodKey) => {
  const [dark, pace, mind, heavy] = movie.vibe?.dims ?? [3, 3, 3, 3];
  switch (moodKey) {
    case "light":
      return dark <= 2 && heavy <= 3;
    case "intense":
      return dark >= 4 || pace >= 4 || heavy >= 4;
    case "short":
      return !!movie.runtime && movie.runtime <= 120;
    // Easy to share: nothing too heavy, too knotty or too scary.
    case "together":
      return heavy <= 3 && mind <= 3 && !(movie.genres ?? []).includes("Horror");
    default:
      return true;
  }
};

// Home's "Made for you" mixes — piles of films to pick tonight's from,
// each a card on Home and a page of its own (MixScreen):
//   Tonight's mix     your best fits (utils/tonightPick), any mood
//   a mood each       Feel-good, Intense, Under 2h, Together
//   your watchlist    what you saved and haven't watched
//   because you loved films like your best-tiered recent watch
// A mix needs at least MIN_FILMS to be one.
const MIN_FILMS = 4;
const MAX_FILMS = 20;

// Each mix's colour, under its posters on the card — deep enough for white
// text.
export const MIX_TINTS = {
  made: "#1F6F50",
  light: "#B4541A",
  intense: "#8E1F3A",
  short: "#2C5F8A",
  together: "#6A3D8F",
  watchlist: "#3D4F63",
  loved: "#7A5A12",
};

const MOOD_HINTS = {
  light: "Easy, warm and funny",
  intense: "Dark, fast or heavy",
  short: "In bed before midnight",
  together: "Easy to share with anyone",
};

// `pool`: tonight's suggestions ({ movie }) best first; `bucketList` and
// `watchedIds` your own; `loved` your favourite recent watch (a movie) and
// `lovedSimilar` films like it (movies), or nulls.
export const buildMixes = ({ pool, bucketList, watchedIds, loved, lovedSimilar }) => {
  const films = pool.map((item) => item.movie);
  const mixes = [
    {
      key: "made",
      eyebrow: "Made for you",
      title: "Tonight's mix",
      hint: "Your best fits right now",
      movies: films.slice(0, MAX_FILMS),
    },
    ...MOODS.map((mood) => ({
      key: mood.key,
      eyebrow: "In the mood",
      title: mood.label,
      hint: MOOD_HINTS[mood.key],
      movies: films.filter((movie) => moodFits(movie, mood.key)).slice(0, MAX_FILMS),
    })),
    {
      key: "watchlist",
      eyebrow: "Your watchlist",
      title: "Saved for tonight",
      hint: "Films you meant to see",
      movies: bucketList
        .map((entry) => getMovieById(entry.movieId))
        .filter((movie) => movie && !watchedIds.has(movie.id))
        .slice(0, MAX_FILMS),
    },
  ];
  if (loved && lovedSimilar) {
    // Second, after Tonight's mix: the most personal one.
    mixes.splice(1, 0, {
      key: "loved",
      eyebrow: "Because you loved",
      title: loved.title,
      titleIsName: true,
      hint: "Films like it",
      movies: lovedSimilar.filter((movie) => !watchedIds.has(movie.id)).slice(0, MAX_FILMS),
    });
  }
  return mixes
    .filter((mix) => mix.movies.length >= MIN_FILMS)
    .map((mix) => ({ ...mix, tint: MIX_TINTS[mix.key] }));
};

// The film "Because you loved" starts from: your best tier among your last
// twenty watches, the most recent first.
export const pickLovedFilm = (watched) =>
  [...watched]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20)
    .sort((a, b) => tierRank(a) - tierRank(b))
    .find((entry) => tierRank(entry) <= 1)?.movieId ?? null;

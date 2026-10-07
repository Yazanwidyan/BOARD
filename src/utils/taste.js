import { getMovieById } from "../data/movies";
import { TIERS, getTier, isRated, tierRank } from "./tiers";
import { getCollectionById } from "./collections";

const TOP_GENRES = 3;
export const FAVORITE_COUNT = 10;
// A genre needs this many tiered movies before it can be called the one
// you love most — one S-tier movie isn't a pattern.
const LOVED_MIN_TIERED = 2;
// Below this many tiered movies overall, there's no insight to draw yet.
const INSIGHT_MIN_TIERED = 3;

// How you tier one genre: a count per tier, and the tier you give it most
// (ties go to the better tier).
const tierSpread = (entries) => {
  const tierCounts = Object.fromEntries(TIERS.map(({ key }) => [key, 0]));
  entries.forEach((entry) => {
    const tier = getTier(entry);
    if (tier) tierCounts[tier] += 1;
  });
  const tiered = Object.values(tierCounts).reduce((sum, n) => sum + n, 0);
  const typicalTier = tiered
    ? TIERS.reduce(
        (best, { key }) =>
          tierCounts[key] > tierCounts[best] ? key : best,
        TIERS[0].key,
      )
    : null;
  return { tierCounts, tiered, typicalTier };
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const countBy = (items, keyFn) => {
  const counts = new Map();
  items.forEach((item) => {
    [].concat(keyFn(item)).forEach((key) => {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

// Everything the Profile's taste section shows, derived live from the
// watched list (nothing stored):
// - favorites: your top 10 — best-tiered movies (S first), most recent first on ties
// - topGenres: the 3 most-watched genres with their share of all genre tags
// - genreTiers: those same genres with how you tier them
// - tasteInsight: the genre you watch most vs the one you tier highest
// - director / decade: the most-watched, plus the collection to open (if
//   one exists for it)
// - minutesWatched: runtime × times watched, summed
export const getTasteProfile = (watched) => {
  const entries = watched
    .map((entry) => ({ ...entry, movie: getMovieById(entry.movieId) }))
    .filter((entry) => entry.movie);
  const movies = entries.map((entry) => entry.movie);

  // Best tiers first (S, then A…), most recently watched first within a
  // tier.
  const favorites = entries
    .filter(isRated)
    .sort(
      (a, b) =>
        tierRank(a) - tierRank(b) || (b.timestamp ?? 0) - (a.timestamp ?? 0),
    )
    .slice(0, FAVORITE_COUNT)
    .map((entry) => ({ movie: entry.movie, tier: getTier(entry) }));

  const genreCounts = countBy(movies, (movie) => movie.genres);
  const genreTotal = genreCounts.reduce((sum, [, count]) => sum + count, 0);
  const topGenres = genreCounts.slice(0, TOP_GENRES).map(([genre, count]) => ({
    genre,
    share: genreTotal ? count / genreTotal : 0,
  }));

  // Per genre: how many you watched and how you tiered them.
  const genreTiers = genreCounts.slice(0, TOP_GENRES).map(([genre, count]) => ({
    genre,
    count,
    ...tierSpread(entries.filter((entry) => entry.movie.genres.includes(genre))),
  }));

  // The genre you love most: best average tier among genres with enough
  // tiered movies (more tiered wins a tie).
  const tieredEntries = entries.filter(isRated);
  const lovedGenre = genreCounts
    .map(([genre]) => {
      const inGenre = tieredEntries.filter((entry) =>
        entry.movie.genres.includes(genre),
      );
      return {
        genre,
        tiered: inGenre.length,
        average:
          inGenre.reduce((sum, entry) => sum + tierRank(entry), 0) /
          (inGenre.length || 1),
      };
    })
    .filter(({ tiered }) => tiered >= LOVED_MIN_TIERED)
    .sort((a, b) => a.average - b.average || b.tiered - a.tiered)[0];
  const tasteInsight =
    tieredEntries.length >= INSIGHT_MIN_TIERED && lovedGenre && genreCounts[0]
      ? { mostWatched: genreCounts[0][0], mostLoved: lovedGenre.genre }
      : null;

  const [topDirector] = countBy(movies, (movie) => movie.director);
  const director = topDirector
    ? {
        name: topDirector[0],
        count: topDirector[1],
        collectionId:
          getCollectionById(`director-${slugify(topDirector[0])}`)?.id ?? null,
      }
    : null;

  const [topDecade] = countBy(
    movies,
    (movie) => `${Math.floor(movie.year / 10) * 10}s`,
  );
  const decade = topDecade
    ? {
        label: topDecade[0],
        count: topDecade[1],
        collectionId:
          getCollectionById(`decade-${slugify(topDecade[0])}`)?.id ?? null,
      }
    : null;

  const rated = entries.filter(isRated);

  const minutesWatched = entries.reduce(
    (sum, entry) => sum + entry.movie.runtime * (entry.watchCount ?? 1),
    0,
  );

  return {
    favorites,
    topGenres,
    genreTiers,
    tasteInsight,
    director,
    decade,
    ratedCount: rated.length,
    minutesWatched,
  };
};

export default getTasteProfile;

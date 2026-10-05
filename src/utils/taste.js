import { getMovieById } from "../data/movies";
import { getCollectionById } from "./collections";

const TOP_GENRES = 3;
const FAVORITE_COUNT = 4;

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
// - favoriteFour: highest-rated movies, most recent first on ties
// - topGenres: the 3 most-watched genres with their share of all genre tags
// - director / decade: the most-watched, plus the collection to open (if
//   one exists for it)
// - criticDelta: how the user's ratings compare to IMDb on the same movies
//   (their 0.5–5 stars doubled onto IMDb's 10-point scale), averaged
// - minutesWatched: runtime × times watched, summed
export const getTasteProfile = (watched) => {
  const entries = watched
    .map((entry) => ({ ...entry, movie: getMovieById(entry.movieId) }))
    .filter((entry) => entry.movie);
  const movies = entries.map((entry) => entry.movie);

  const favoriteFour = entries
    .filter((entry) => entry.rating != null)
    .sort(
      (a, b) => b.rating - a.rating || (b.timestamp ?? 0) - (a.timestamp ?? 0),
    )
    .slice(0, FAVORITE_COUNT)
    .map((entry) => ({ movie: entry.movie, rating: entry.rating }));

  const genreCounts = countBy(movies, (movie) => movie.genres);
  const genreTotal = genreCounts.reduce((sum, [, count]) => sum + count, 0);
  const topGenres = genreCounts.slice(0, TOP_GENRES).map(([genre, count]) => ({
    genre,
    share: genreTotal ? count / genreTotal : 0,
  }));

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

  const rated = entries.filter((entry) => entry.rating != null);
  const criticDelta =
    rated.length > 0
      ? rated.reduce(
          (sum, entry) => sum + (entry.rating * 2 - entry.movie.rating),
          0,
        ) / rated.length
      : null;

  const minutesWatched = entries.reduce(
    (sum, entry) => sum + entry.movie.runtime * (entry.watchCount ?? 1),
    0,
  );

  return {
    favoriteFour,
    topGenres,
    director,
    decade,
    criticDelta,
    ratedCount: rated.length,
    minutesWatched,
  };
};

export default getTasteProfile;

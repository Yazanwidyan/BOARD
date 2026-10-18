// A rating counted by how many people gave it (IMDb's Top 250 formula): a
// 9.1 from a few hundred fans isn't better than an 8.7 from 20,000 — what
// "best first" means everywhere in the app. The server ranks candidates the
// same way (backend lib/candidates.js). The rating filter (minRating) still
// uses the plain rating, the number shown.
const RATING_VOTES = 3000;
const AVERAGE_RATING = 6.7;
export const weightedRating = (movie) => {
  const votes = movie.details?.votes ?? movie.votes ?? 0;
  return (
    (votes / (votes + RATING_VOTES)) * (movie.rating ?? 0) +
    (RATING_VOTES / (votes + RATING_VOTES)) * AVERAGE_RATING
  );
};
export const byWeightedRating = (a, b) => weightedRating(b) - weightedRating(a);

// The app's 12 genres (the server maps TMDB's onto these), and the decades
// its movies span.
export const ALL_GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
];
export const ALL_DECADES = [
  "1920s",
  "1930s",
  "1940s",
  "1950s",
  "1960s",
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "2010s",
  "2020s",
];

export const DECADE_RANGES = {
  Any: null,
  "2020s": [2020, 2029],
  "2010s": [2010, 2019],
  "2000s": [2000, 2009],
  "1990s": [1990, 1999],
  "1980s": [1980, 1989],
  "1970s": [1970, 1979],
  Older: [0, 1969],
};

export const RUNTIME_RANGES = {
  Any: null,
  "Under 2 hours": [0, 119],
  "2–3 hours": [120, 180],
  "3+ hours": [181, 9999],
};

export const matchesGenres = (movie, genres) => {
  if (!genres || genres.length === 0) return true;
  return movie.genres.some((genre) => genres.includes(genre));
};

export const matchesRating = (movie, minRating) => {
  if (!minRating) return true;
  return movie.rating >= minRating;
};

export const matchesDecade = (movie, decade) => {
  const range = DECADE_RANGES[decade];
  if (!range) return true;
  return movie.year >= range[0] && movie.year <= range[1];
};

export const matchesRuntime = (movie, runtime) => {
  const range = RUNTIME_RANGES[runtime];
  if (!range) return true;
  return movie.runtime >= range[0] && movie.runtime <= range[1];
};

export const applyPreferenceFilters = (movies, preferences) =>
  movies.filter(
    (movie) =>
      matchesGenres(movie, preferences?.genres) &&
      matchesRating(movie, preferences?.minRating) &&
      matchesDecade(movie, preferences?.decade) &&
      matchesRuntime(movie, preferences?.runtime),
  );

export const formatRuntime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const formatGenres = (genres) => genres.join(" · ");

// `bucketList` entries are `{ movieId, addedAt }` — this is the one place
// that knows that shape, so screens just ask "is this id in there" without
// re-deriving the id list themselves.
export const isInBucketList = (bucketList, movieId) =>
  bucketList.some((entry) => entry.movieId === movieId);

export const bucketListIds = (bucketList) =>
  bucketList.map((entry) => entry.movieId);

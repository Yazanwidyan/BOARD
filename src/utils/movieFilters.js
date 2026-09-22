export const DECADE_RANGES = {
  Any: null,
  '2020s': [2020, 2029],
  '2010s': [2010, 2019],
  '2000s': [2000, 2009],
  '1990s': [1990, 1999],
  '1980s': [1980, 1989],
  '1970s': [1970, 1979],
  Older: [0, 1969],
};

export const RUNTIME_RANGES = {
  Any: null,
  'Under 2 hours': [0, 119],
  '2–3 hours': [120, 180],
  '3+ hours': [181, 9999],
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

export const applyPreferenceFilters = (movies, preferences) => movies.filter((movie) => (
  matchesGenres(movie, preferences?.genres)
  && matchesRating(movie, preferences?.minRating)
  && matchesDecade(movie, preferences?.decade)
  && matchesRuntime(movie, preferences?.runtime)
));

export const formatRuntime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const formatGenres = (genres) => genres.join(' · ');

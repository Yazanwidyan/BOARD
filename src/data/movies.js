// The movie catalog, served by the ReelBoard backend (GET /api/movies/catalog)
// and loaded at sign-in by services/catalog.js — the app doesn't ship any
// movie data of its own. The backend's data/catalog.json is where movies,
// cast, details and vibes are maintained.
//
// MOVIES is filled in place, so the many modules importing it read the
// loaded catalog without changes. Nothing that reads it renders until it's
// loaded (see AppNavigator). Each movie:
//   { id, rank, title, year, rating, runtime, genres, director, cast,
//     details, description, franchise, poster, backdrop, vibe }
export const MOVIES = [];

let byId = new Map();
let version = 0;

export const setMovies = (movies) => {
  MOVIES.splice(0, MOVIES.length, ...movies);
  byId = new Map(MOVIES.map((movie) => [movie.id, movie]));
  version += 1;
};

// Bumped on every load — lets anything derived from the catalog (e.g.
// utils/collections) know when to recompute.
export const getCatalogVersion = () => version;

export const getMovieById = (id) => byId.get(id);

export default MOVIES;

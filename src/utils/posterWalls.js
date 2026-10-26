import { getMovieById } from "../data/movies";

// The movies on the sign-in screen (its stills and its sample tier
// list): recognisable recent films with short titles (the landing names
// each one in a line), by TMDB id. The sign-in screen fetches them from the server
// first (services/movieData's loadWallMovies — no account needed); any it
// couldn't get are just left off.


export const SIGN_IN_WALL = [
  "872585", // Oppenheimer
  "414906", // The Batman
  "157336", // Interstellar
  "496243", // Parasite
  "27205", // Inception
  "155", // The Dark Knight
  "419430", // Get Out
  "313369", // La La Land
  "354912", // Coco
  "245891", // John Wick
];

export const WALL_SIZE = SIGN_IN_WALL.length;

export const getSignInWallMovies = () =>
  SIGN_IN_WALL.map(getMovieById)
    .filter((movie) => movie?.poster)
    .slice(0, WALL_SIZE);

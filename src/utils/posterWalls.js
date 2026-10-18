import { getMovieById } from "../data/movies";

// The movies on the sign-in screen's drifting poster wall: recognisable
// recent films, by TMDB id. The sign-in screen fetches them from the server
// first (services/movieData's loadWallMovies — no account needed); any it
// couldn't get are just left off.

export const WALL_SIZE = 18;

export const SIGN_IN_WALL = [
  "693134", // Dune: Part Two
  "872585", // Oppenheimer
  "346698", // Barbie
  "324857", // Spider-Man: Into the Spider-Verse
  "414906", // The Batman
  "361743", // Top Gun: Maverick
  "545611", // Everything Everywhere All at Once
  "157336", // Interstellar
  "496243", // Parasite
  "299534", // Avengers: Endgame
  "27205", // Inception
  "155", // The Dark Knight
  "419430", // Get Out
  "634649", // Spider-Man: No Way Home
  "76341", // Mad Max: Fury Road
  "313369", // La La Land
  "354912", // Coco
  "245891", // John Wick
];

export const getSignInWallMovies = () =>
  SIGN_IN_WALL.map(getMovieById)
    .filter((movie) => movie?.poster)
    .slice(0, WALL_SIZE);

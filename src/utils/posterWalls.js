import { MOVIES } from "../data/movies";

// The movies on the sign-in screen's drifting poster wall: recognisable
// recent films, not the catalog's 1940s classics.
//
// Titles are looked up in the catalog. If the catalog is ever missing one,
// the gap is filled with its newest, best-rated movies, so the wall is
// never short.

export const WALL_SIZE = 18;

const SIGN_IN_WALL = [
  "Dune: Part Two",
  "Oppenheimer",
  "Barbie",
  "Spider-Man: Into the Spider-Verse",
  "The Batman",
  "Top Gun: Maverick",
  "Everything Everywhere All at Once",
  "Interstellar",
  "Parasite",
  "Avengers: Endgame",
  "Inception",
  "The Dark Knight",
  "Get Out",
  "Spider-Man: No Way Home",
  "Mad Max: Fury Road",
  "La La Land",
  "Coco",
  "John Wick",
];

export const getSignInWallMovies = () => {
  const byTitle = new Map(MOVIES.map((movie) => [movie.title, movie]));
  const picked = SIGN_IN_WALL.map((title) => byTitle.get(title)).filter(Boolean);
  if (picked.length >= WALL_SIZE) return picked.slice(0, WALL_SIZE);

  const onWall = new Set(SIGN_IN_WALL);
  const fill = MOVIES.filter((movie) => !onWall.has(movie.title))
    .sort((a, b) => b.year - a.year || b.rating - a.rating)
    .slice(0, WALL_SIZE - picked.length);
  return [...picked, ...fill];
};

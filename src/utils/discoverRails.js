import { MOVIES, getMovieById } from "../data/movies";
import { generateRecommendations } from "../services/recommendations";
import { getTasteProfile } from "./taste";

// Rows show the first RAIL_PREVIEW; "All ›" opens the full list.
export const RAIL_PREVIEW = 10;
const RECOMMENDED_COUNT = 20;
const RECENT_FOR_ACTORS = 10;
const MIN_ACTOR_FILMS = 2;
// "Hidden gems": well-rated but in the lower part of the Top 250, i.e. the
// ones people don't already know by heart.
const GEM_MIN_RANK = 120;
const GEM_MIN_RATING = 7.9;
const SHORT_RUNTIME = 100;

const byRating = (a, b) => b.rating - a.rating;

// Every Discover row, built from real state. Watched movies never appear —
// Discover is for finding something new. Rows with nothing to show are
// dropped. Each row carries its full list (`movies`) for "All ›".
export const buildDiscoverRails = ({ watched, preferences }) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const unwatched = MOVIES.filter((movie) => !watchedIds.has(movie.id));
  const rails = [];

  // Because you watched — the latest watch's main genre.
  const recent = watched[0] ? getMovieById(watched[0].movieId) : null;
  if (recent) {
    rails.push({
      key: "because",
      title: `Because you watched ${recent.title}`,
      movies: unwatched
        .filter((movie) => movie.genres.includes(recent.genres[0]))
        .sort(byRating),
    });
  }

  // Because you love {director} — your most-watched director's other films.
  const { director } = getTasteProfile(watched);
  if (director && director.count >= 2) {
    rails.push({
      key: "director",
      title: `Because you love ${director.name}`,
      movies: unwatched
        .filter((movie) => movie.director === director.name)
        .sort((a, b) => a.year - b.year),
    });
  }

  // Starring {actor} — whoever from your recent watches has the most
  // catalog films you haven't seen yet.
  const actorCounts = new Map();
  watched.slice(0, RECENT_FOR_ACTORS).forEach((entry) => {
    (getMovieById(entry.movieId)?.cast ?? []).forEach((actor) => {
      const remaining = unwatched.filter((movie) =>
        movie.cast?.includes(actor),
      ).length;
      if (remaining >= MIN_ACTOR_FILMS) actorCounts.set(actor, remaining);
    });
  });
  const [topActor] = [...actorCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (topActor) {
    rails.push({
      key: "actor",
      title: `Starring ${topActor[0]}`,
      movies: unwatched
        .filter((movie) => movie.cast?.includes(topActor[0]))
        .sort(byRating),
    });
  }

  rails.push({
    key: "recommended",
    title: "Recommended for you",
    movies: generateRecommendations(
      preferences,
      RECOMMENDED_COUNT,
      [],
      [...watchedIds],
    ),
  });

  rails.push({
    key: "gems",
    title: "Hidden gems",
    movies: unwatched
      .filter(
        (movie) => movie.rank > GEM_MIN_RANK && movie.rating >= GEM_MIN_RATING,
      )
      .sort(byRating),
  });

  rails.push({
    key: "short",
    title: `Under ${SHORT_RUNTIME} minutes`,
    movies: unwatched
      .filter((movie) => movie.runtime <= SHORT_RUNTIME)
      .sort(byRating),
  });

  rails.push({
    key: "top",
    title: "Top rated you haven't seen",
    movies: [...unwatched].sort(byRating),
  });

  return rails.filter((rail) => rail.movies.length > 0);
};

export default buildDiscoverRails;

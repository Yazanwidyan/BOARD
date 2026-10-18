import { MOVIES, getMovieById } from "../data/movies";
import { generateRecommendations } from "../services/recommendations";
import { getTasteProfile } from "./taste";
import { vibeSimilarity } from "./tasteEngine";
import { t } from "../i18n";
import { byWeightedRating } from "./movieFilters";

// Rows show the first RAIL_PREVIEW; "All ›" opens the full list.
export const RAIL_PREVIEW = 10;
const RECOMMENDED_COUNT = 20;
const RECENT_FOR_ACTORS = 10;
const MIN_ACTOR_FILMS = 2;
// "Hidden gems": well-rated but not widely seen — the ones people don't
// already know by heart: highly rated on TMDB by a real but modest
// audience (every movie on the server has 500+ votes; the famous ones
// have tens of thousands).
const GEM_RATING = 7.5;
const GEM_MAX_VOTES = 3000;

const isHiddenGem = (movie) => {
  const votes = movie.details?.votes;
  return votes != null && movie.rating >= GEM_RATING && votes < GEM_MAX_VOTES;
};
const SHORT_RUNTIME = 100;
// "Because you watched": how alike two movies must feel (Taste DNA, 0–1)
// to make the row.
const BECAUSE_MIN_SIMILARITY = 0.72;

const byRating = byWeightedRating;

// Every Discover row, built from real state. Watched movies never appear —
// Discover is for finding something new. Rows with nothing to show are
// dropped. Each row carries its full list (`movies`) for "All ›".
// `community` is GET /api/community/trending (store/communityStore), when
// it's loaded: what everyone else is watching and loving.
export const buildDiscoverRails = ({ watched, preferences, community }) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const unwatched = MOVIES.filter((movie) => !watchedIds.has(movie.id));
  const rails = [];
  const unwatchedFrom = (rows = []) =>
    rows
      .filter((row) => !watchedIds.has(row.movieId))
      .map((row) => getMovieById(row.movieId))
      .filter(Boolean);

  // Trending on ReelBoard — most watched and saved by everyone this week.
  rails.push({
    key: "trending",
    title: t("Trending on ReelBoard"),
    movies: unwatchedFrom(community?.trending),
  });

  // Because you watched — movies that *feel* like the latest watch
  // (Taste DNA: tone, pace, complexity, weight, scale, themes), closest
  // first, rather than ones that merely share its genre.
  const recent = watched[0] ? getMovieById(watched[0].movieId) : null;
  if (recent) {
    rails.push({
      key: "because",
      title: t("Because you watched {title}", { title: recent.title }),
      movies: unwatched
        .map((movie) => ({ movie, similarity: vibeSimilarity(recent, movie) }))
        .filter(({ similarity }) => similarity >= BECAUSE_MIN_SIMILARITY)
        .sort((a, b) => b.similarity - a.similarity)
        .map(({ movie }) => movie),
    });
  }

  // Because you love {director} — your most-watched director's other films.
  const { director } = getTasteProfile(watched);
  if (director && director.count >= 2) {
    rails.push({
      key: "director",
      title: t("Because you love {name}", { name: director.name }),
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
      title: t("Starring {value}", { value: topActor[0] }),
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

  // Community favourites — the highest share of S and A tiers.
  rails.push({
    key: "favorites",
    title: t("Community favorites"),
    movies: unwatchedFrom(community?.favorites),
  });

  rails.push({
    key: "gems",
    title: "Hidden gems",
    movies: unwatched.filter(isHiddenGem).sort(byRating),
  });

  rails.push({
    key: "short",
    title: t("Under {SHORT_RUNTIME} minutes", { SHORT_RUNTIME: SHORT_RUNTIME }),
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

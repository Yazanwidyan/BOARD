import { readTasteDna } from "../components/TasteDnaBars";
import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { getCollectionCompletedAt, getSagas } from "./collections";
import { getTasteDna } from "./tasteDna";
import { TIERS, getTier, orderSTier } from "./tiers";

const FAVOURITES = 10;
const TIER_EXAMPLES = 3;
const LEAN_WORDS = ["A slight lean", "A clear lean", "A strong lean"];

const movieOf = (entry) => getMovieById(entry.movieId);
// A slide's background: the film's still, else its poster.
const stillOf = (movie) => movie?.backdrop ?? movie?.poster ?? null;

// Instagram-style highlights for a watch history ({ movieId, tier|rating,
// timestamp }) — yours or a friend's — built from it, nothing to set up:
//
//   Favourites   the S tier, in `sOrder` (yours) — one film a slide
//   Tiers        each tier with films in it — its best and how many
//   Taste        each Taste DNA leaning, and how many are balanced
//   Collections  every collection finished, newest first
//   Boards       each board (`boards`: { id, name, movieIds }), its first
//                film's poster — yours open as boards (`ownBoards`),
//                a friend's as a list of its films
//
// Each: { key, label, cover: { poster | tier + color | icon }, slides:
// [{ key, image, blur?, poster?, tier?, tierColor?, eyebrow, title, line,
// movieId?, collectionId?, board? }] }. Empty ones are left out — except
// your boards (`ownBoards`): with none to show, a "New board" placeholder
// ({ empty: true, no slides }) stands in.
export const buildHighlights = (watched, { sOrder = [], boards = [], ownBoards = false } = {}) => {
  const highlights = [];

  const favourites = orderSTier(watched, sOrder).map(movieOf).filter(Boolean).slice(0, FAVOURITES);
  if (favourites.length > 0) {
    highlights.push({
      key: "favourites",
      label: t("Favourites"),
      cover: { poster: favourites[0].poster },
      slides: favourites.map((movie, index) => ({
        key: movie.id,
        image: stillOf(movie),
        poster: movie.poster,
        eyebrow: t("Favourite #{n}", { n: index + 1 }),
        title: movie.title,
        line: [movie.year, movie.director].filter(Boolean).join(" · "),
        movieId: movie.id,
      })),
    });
  }

  const tierSlides = TIERS.map((tier) => {
    const films = watched
      .filter((entry) => getTier(entry) === tier.key)
      .map(movieOf)
      .filter(Boolean);
    if (films.length === 0) return null;
    return {
      key: tier.key,
      image: stillOf(films[0]),
      poster: films[0].poster,
      tier: tier.key,
      tierColor: tier.color,
      eyebrow: t("{tier} tier", { tier: tier.key }),
      title: t(tier.meaning),
      line: [
        t("{count} films", { count: films.length }),
        films.slice(0, TIER_EXAMPLES).map((film) => film.title).join(", "),
      ].join(" · "),
      movieId: films[0].id,
    };
  }).filter(Boolean);
  if (tierSlides.length > 0) {
    highlights.push({
      key: "tiers",
      label: t("Tiers"),
      cover: { tier: tierSlides[0].tier, color: tierSlides[0].tierColor },
      slides: tierSlides,
    });
  }

  const dna = getTasteDna(watched);
  if (dna.hasDna) {
    const { leanings, balanced } = readTasteDna(dna.fingerprint);
    // Behind the words: the top favourite (or any film), softened.
    const behind = stillOf(favourites[0] ?? watched.map(movieOf).find(Boolean));
    const slides = leanings.map((leaning) => ({
      key: leaning.key,
      image: behind,
      blur: true,
      eyebrow: t("Taste DNA"),
      title: leaning.word,
      line: t(LEAN_WORDS[Math.min(LEAN_WORDS.length, leaning.steps) - 1]),
    }));
    if (balanced > 0) {
      slides.push({
        key: "balanced",
        image: behind,
        blur: true,
        eyebrow: t("Taste DNA"),
        title: t("{count} balanced", { count: balanced }),
        line: t("No strong lean either way"),
      });
    }
    if (slides.length > 0) {
      highlights.push({ key: "taste", label: t("Taste"), cover: { icon: "dna" }, slides });
    }
  }

  const finished = getSagas()
    .map((collection) => ({ collection, at: getCollectionCompletedAt(collection, watched) }))
    .filter(({ collection, at }) => at != null && collection.movieIds.length > 0)
    .sort((a, b) => b.at - a.at);
  if (finished.length > 0) {
    highlights.push({
      key: "collections",
      label: t("Collections"),
      cover: { poster: getMovieById(finished[0].collection.movieIds[0])?.poster },
      slides: finished.map(({ collection }) => {
        const first = getMovieById(collection.movieIds[0]);
        return {
          key: collection.id,
          image: stillOf(first),
          poster: first?.poster,
          eyebrow: t("Finished"),
          title: t(collection.title),
          line: t("{count} films", { count: collection.movieIds.length }),
          collectionId: collection.id,
        };
      }),
    });
  }

  const boardSlides = boards
    .map((board) => {
      const films = (board.movieIds ?? []).map((id) => getMovieById(id)).filter(Boolean);
      if (films.length === 0) return null;
      return {
        key: String(board.id),
        image: stillOf(films[0]),
        poster: films[0].poster,
        eyebrow: t("Board"),
        title: board.name,
        line: [
          t("{count} films", { count: films.length }),
          films.slice(1, 1 + TIER_EXAMPLES).map((film) => film.title).join(", "),
        ]
          .filter(Boolean)
          .join(" · "),
        board: { id: board.id, name: board.name, movieIds: board.movieIds, own: ownBoards },
      };
    })
    .filter(Boolean);
  if (boardSlides.length > 0) {
    highlights.push({
      key: "boards",
      label: t("Boards"),
      cover: { poster: boardSlides[0].poster },
      slides: boardSlides,
    });
  } else if (ownBoards) {
    highlights.push({
      key: "boards",
      label: t("New board"),
      cover: { icon: "plus" },
      empty: true,
      slides: [],
    });
  }

  return highlights;
};

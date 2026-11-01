import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";

// The collections you're part-way through — the server works them out with
// your library (its lib/collections.js getCollectionPaths), closest to
// finished first: [{ id, type, kind, title, person, art, movieIds,
// watched, total, next: [movie ids, best first] }]. The library is
// refetched after every watch, so they keep up.
const EMPTY = [];

export const usePaths = () => useMovieStore((state) => state.paths ?? EMPTY);

// The collection this film moves furthest along (the closest to done), or
// null.
export const getPathFor = (paths, movieId) =>
  paths.find((path) => path.movieIds.includes(movieId)) ?? null;

// Why this film, in a few words: "Finishes Nolan", "2 left in Nolan".
export const describePathStep = (path) => {
  if (!path) return null;
  const left = path.total - path.watched;
  return left === 1
    ? t("Finishes {title}", { title: path.title })
    : t("{count} left in {title}", { count: left, title: path.title });
};

// The film to watch next in a path: of its next films, the one highest in
// `rankedIds` (your taste picks, best first), else the server's best.
export const getPathNext = (path, rankedIds = []) => {
  const position = (id) => {
    const index = rankedIds.indexOf(id);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return [...path.next].sort((a, b) => position(a) - position(b))[0] ?? null;
};

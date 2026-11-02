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

// What a path is about, in plain words ("Harry Potter", "Christopher
// Nolan"); the server's `subject`, else its title.
export const subjectOf = (collection) => collection?.subject ?? collection?.title ?? "";

// Why this film, in a few words, by what the set is about: "Completes the
// Nolan set", "2 more Nolan films" — and with `long`, "2 more Nolan films
// to complete the set" (a film's page).
export const describeLeft = (subject, left, { long = false } = {}) => {
  if (left === 1) return t("Completes the {subject} set", { subject });
  return long
    ? t("{count} more {subject} films to complete the set", { count: left, subject })
    : t("{count} more {subject} films", { count: left, subject });
};

export const describePathStep = (path, options) =>
  path ? describeLeft(subjectOf(path), path.total - path.watched, options) : null;

// The film to watch next in a path: of its next films, the one highest in
// `rankedIds` (your taste picks, best first), else the server's best.
export const getPathNext = (path, rankedIds = []) => {
  const position = (id) => {
    const index = rankedIds.indexOf(id);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return [...path.next].sort((a, b) => position(a) - position(b))[0] ?? null;
};

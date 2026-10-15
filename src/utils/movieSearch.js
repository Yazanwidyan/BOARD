// Finding movies from what someone types — forgiving about the way people
// actually type titles, and able to find a movie by who made it or who's in
// it, not just by its exact title:
//
//   "spiderman", "spider man"  → Spider-Man: Into the Spider-Verse
//   "wall e", "walle"          → WALL-E
//   "amelie", "schindlers"     → Amélie-style accents and apostrophes ignored
//   "nolan"                    → every Christopher Nolan film
//   "dicaprio"                 → every movie he's top-billed in
//   "heath ledger knight"      → words can come from title, director and cast
//
// Results are ranked: title matches first (exact, then starting with the
// search, then a word in the title starting with it, then anywhere), then
// director, then cast — ties go to the higher-rated movie.

// Lowercase, accents off, punctuation → spaces, single spaces.
const normalize = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Same, with the spaces gone too — so "spiderman" finds "spider man".
const squash = (text) => text.replace(/ /g, "");

// How well `query` matches one piece of text: 4 the whole of it, 3 its
// start, 2 the start of one of its words, 1 anywhere in it, 0 not at all.
const matchStrength = (query, text) => {
  if (!text) return 0;
  const squashedQuery = squash(query);
  const squashedText = squash(text);
  if (text === query || squashedText === squashedQuery) return 4;
  if (text.startsWith(query) || squashedText.startsWith(squashedQuery)) return 3;
  if (` ${text}`.includes(` ${query}`)) return 2;
  if (text.includes(query) || squashedText.includes(squashedQuery)) return 1;
  return 0;
};

// Each movie's searchable text, normalized once per movie.
const indexCache = new WeakMap();
const indexOf = (movie) => {
  let entry = indexCache.get(movie);
  if (!entry) {
    const title = normalize(movie.title);
    entry = {
      title,
      // "The Dark Knight" is also found as "dark knight…".
      titleWithoutArticle: title.replace(/^(the|a|an) /, ""),
      director: normalize(movie.director),
      cast: (movie.cast ?? []).map((name) => ({ name, text: normalize(name) })),
      year: String(movie.year ?? ""),
    };
    entry.all = [entry.title, entry.director, ...entry.cast.map((c) => c.text), entry.year].join(" ");
    indexCache.set(movie, entry);
  }
  return entry;
};

// Scores one movie: { score, matchedBy } or null. `matchedBy` says how a
// non-title match was found — { kind: "director" | "cast", name } — so a
// result list can show why a movie came up.
const scoreMovie = (movie, query) => {
  const index = indexOf(movie);
  const title = Math.max(
    matchStrength(query, index.title),
    matchStrength(query, index.titleWithoutArticle),
  );
  if (title > 0) return { score: 100 + title * 10, matchedBy: null };

  const director = matchStrength(query, index.director);
  if (director > 1) {
    return { score: 60 + director * 5, matchedBy: { kind: "director", name: movie.director } };
  }
  let bestCast = null;
  index.cast.forEach((member) => {
    const strength = matchStrength(query, member.text);
    if (strength > 1 && (!bestCast || strength > bestCast.strength)) {
      bestCast = { strength, name: member.name };
    }
  });
  if (bestCast) {
    return { score: 40 + bestCast.strength * 5, matchedBy: { kind: "cast", name: bestCast.name } };
  }
  if (query === index.year) return { score: 30, matchedBy: null };

  // Several words: each has to turn up somewhere (title, director, cast,
  // year) — "nolan batman", "heath ledger knight". Single letters are too
  // loose to count as words here ("wall e" would match Eli Wallach).
  const words = query.split(" ").filter((word) => word.length > 1);
  if (words.length > 1 && words.every((word) => ` ${index.all}`.includes(` ${word}`))) {
    return { score: 20, matchedBy: null };
  }
  // A last resort for a name typed partly: "dicap", "tarant".
  if (director === 1) {
    return { score: 15, matchedBy: { kind: "director", name: movie.director } };
  }
  const anyCast = index.cast.find((member) => matchStrength(query, member.text) === 1);
  if (anyCast) return { score: 10, matchedBy: { kind: "cast", name: anyCast.name } };
  return null;
};

// Searches `movies` for `query`: [{ movie, matchedBy }], best first.
// An empty query matches nothing.
export const searchMovies = (movies, query, limit = Infinity) => {
  const normalized = normalize(query);
  if (!normalized) return [];
  return movies
    .map((movie) => {
      const result = scoreMovie(movie, normalized);
      return result && { movie, ...result };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.movie.rating ?? 0) - (a.movie.rating ?? 0) ||
        (a.movie.rank ?? 0) - (b.movie.rank ?? 0),
    )
    .slice(0, limit)
    .map(({ movie, matchedBy }) => ({ movie, matchedBy }));
};

// Just the movies, best first — for lists that don't show why.
export const findMovies = (movies, query, limit) =>
  searchMovies(movies, query, limit).map((result) => result.movie);

// Whether one movie matches — for filtering a list in place.
export const movieMatches = (movie, query) => {
  const normalized = normalize(query);
  return !normalized || scoreMovie(movie, normalized) !== null;
};

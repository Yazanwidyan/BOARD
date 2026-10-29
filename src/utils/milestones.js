import { getMovieById } from "../data/movies";

// Milestones, like Apple Music Replay's: round numbers your watching
// passes — minutes watched, films watched, directors watched — each
// reached on the day the film that crossed it was marked watched, the rest
// still in progress.
const KINDS = [
  { kind: "minutes", label: "Minutes watched", short: "Minutes", steps: [500, 1000, 2500, 5000, 7500, 10000, 25000] },
  { kind: "films", label: "Films watched", short: "Films", steps: [10, 25, 50, 100, 250, 500] },
  { kind: "directors", label: "Directors watched", short: "Directors", steps: [5, 10, 25, 50, 100] },
];

// [{ key, kind, label, short, value, level, reachedAt (timestamp | null),
// progress (0–1) }]: the reached ones newest first, then the ones in
// progress, closest first.
export const getMilestones = (watched) => {
  const totals = { minutes: 0, films: 0, directors: 0 };
  const directors = new Set();
  const reached = new Map();
  [...watched]
    .filter((entry) => entry.timestamp)
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((entry) => {
      const movie = getMovieById(entry.movieId);
      totals.films += 1;
      totals.minutes += movie?.runtime ?? 0;
      if (movie?.director) directors.add(movie.director);
      totals.directors = directors.size;
      KINDS.forEach(({ kind, steps }) =>
        steps.forEach((value) => {
          const key = `${kind}-${value}`;
          if (!reached.has(key) && totals[kind] >= value) reached.set(key, entry.timestamp);
        }),
      );
    });

  const all = KINDS.flatMap(({ kind, label, short, steps }) =>
    steps.map((value, level) => ({
      key: `${kind}-${value}`,
      kind,
      label,
      short,
      value,
      level,
      reachedAt: reached.get(`${kind}-${value}`) ?? null,
      progress: Math.min(totals[kind] / value, 1),
    })),
  );
  const done = all.filter((item) => item.reachedAt).sort((a, b) => b.reachedAt - a.reachedAt || b.value - a.value);
  // In progress: the next step of each kind first, then the rest.
  const open = all.filter((item) => !item.reachedAt).sort((a, b) => b.progress - a.progress);
  return [...done, ...open];
};

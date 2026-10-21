import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { getCollectionProgress, getSagas } from "./collections";
import { getTier } from "./tiers";

// Ranks — the one progress system. Everything you can achieve is a rank on
// a track, the number of ranks you have is your score, and your title
// comes from that. No XP, no levels, no badges; nothing is ever lost by
// waiting, and nothing rewards just opening the app.
//
// The server works the same out from your history (its lib/ranks.js — the
// rules must stay identical), so what friends see can't be made up; this
// copy shows yours instantly.
//
// Two kinds of track:
//   craft      how you watch: decades, genres, directors, old films, harsh
//              tiers, long films, marathon days, rewatches, dares
//   milestone  how much: films watched, films tiered
// A rank's id is its track's and its step's: "time-traveler:1".
//
// Sagas aren't ranks. Each has its own ladder ("First Year → Prefect →
// Hogwarts Graduate"), climbed on its own and celebrated when you reach a
// step (getSagaTracks, below, shapes them like tracks for that) — but they
// don't count toward your ranks or your title.

// Your title, by how many ranks you have — a night at the theatre, from
// walking in to keeping the archive. There are 39 ranks in all, so
// Archivist needs nearly every one.
export const TITLES = [
  { at: 0, name: "Walk-in" },
  { at: 3, name: "Regular" },
  { at: 8, name: "Front Row" },
  { at: 14, name: "Critic" },
  { at: 20, name: "Curator" },
  { at: 27, name: "Cinephile" },
  { at: 34, name: "Archivist" },
];

// Where `count` ranks put you: the title, its step (1 = Walk-in … 7 =
// Archivist, what the server stores as `level`), the next title and how far
// to it.
export const getTitle = (count) => {
  const index = TITLES.reduce((found, title, i) => (count >= title.at ? i : found), 0);
  const title = TITLES[index];
  const next = TITLES[index + 1] ?? null;
  return {
    name: title.name,
    step: index + 1,
    count,
    next,
    toNext: next ? next.at - count : 0,
    progress: next ? (count - title.at) / (next.at - title.at) : 1,
  };
};

// A friend's title from the step the server sends.
export const getTitleName = (step) =>
  TITLES[Math.min(Math.max(step ?? 1, 1), TITLES.length) - 1].name;

export const OLD_FILM_BEFORE = 1970;
export const LONG_FILM_MINUTES = 165;
export const MARATHON_FILMS = 3;
export const DEEP_DIRECTOR_FILMS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Craft and milestone tracks: what each counts (`stat`), how it reads
// (`hint`, `unit`), its icon (components/RankBadge), and its ladder —
// [needed, the rank's name].
export const TRACKS = [
  {
    id: "films",
    kind: "milestone",
    title: "Films watched",
    hint: "Every film you mark watched",
    unit: "films",
    icon: "film",
    stat: "watched",
    steps: [
      [1, "First Watch"],
      [10, "Ticket Stub"],
      [50, "Season Pass"],
      [100, "Centurion"],
      [250, "Reel Collector"],
      [500, "Film Buff"],
      [1000, "Hall of Fame"],
    ],
  },
  {
    id: "tiered",
    kind: "milestone",
    title: "Films tiered",
    hint: "Films you've put in a tier",
    unit: "tiered",
    icon: "tier",
    stat: "tiered",
    steps: [
      [10, "Opinionated"],
      [50, "Reviewer"],
      [100, "Trusted Voice"],
      [250, "Seasoned Reviewer"],
      [500, "Master Reviewer"],
    ],
  },
  {
    id: "time-traveler",
    kind: "craft",
    title: "Time Traveler",
    hint: "Films from different decades",
    unit: "decades",
    icon: "decades",
    stat: "decades",
    steps: [[4, "Tourist"], [7, "Explorer"], [10, "Time Lord"]],
  },
  {
    id: "genre-hopper",
    kind: "craft",
    title: "Genre Hopper",
    hint: "Genres you've watched",
    unit: "genres",
    icon: "genres",
    stat: "genres",
    steps: [[6, "Sampler"], [10, "Hopper"], [15, "Omnivore"]],
  },
  {
    id: "auteur-hunter",
    kind: "craft",
    title: "Auteur Hunter",
    hint: "Directors you've seen 3 or more films by",
    unit: "directors",
    icon: "directors",
    stat: "directors",
    steps: [[2, "Fan"], [6, "Devotee"], [15, "Auteur Hunter"]],
  },
  {
    id: "old-soul",
    kind: "craft",
    title: "Old Soul",
    hint: "Films from before 1970",
    unit: "films",
    icon: "classic",
    stat: "oldFilms",
    steps: [[3, "Matinee"], [12, "Golden Age"], [30, "Old Soul"]],
  },
  {
    id: "tough-critic",
    kind: "craft",
    title: "Tough Critic",
    hint: "Films you gave a D or an F",
    unit: "films",
    icon: "critic",
    stat: "harsh",
    steps: [[3, "Honest"], [10, "Harsh"], [25, "Ruthless"]],
  },
  {
    id: "long-haul",
    kind: "craft",
    title: "The Long Haul",
    hint: "Films over 2h 45m",
    unit: "films",
    icon: "long",
    stat: "longFilms",
    steps: [[3, "Patient"], [10, "Committed"], [25, "Epic Soul"]],
  },
  {
    id: "marathoner",
    kind: "craft",
    title: "Marathoner",
    hint: "Days you watched 3 or more films",
    unit: "days",
    icon: "marathon",
    stat: "marathons",
    steps: [[1, "Binger"], [5, "Marathoner"], [15, "Iron Eyes"]],
  },
  {
    id: "comfort-watcher",
    kind: "craft",
    title: "Comfort Watcher",
    hint: "Films you've rewatched",
    unit: "films",
    icon: "rewatch",
    stat: "rewatched",
    steps: [[3, "Comfort"], [10, "Returner"], [25, "Old Friend"]],
  },
  {
    id: "dare-devil",
    kind: "craft",
    title: "Dare Devil",
    hint: "Dares you've finished",
    unit: "dares",
    icon: "dare",
    stat: "dares",
    steps: [[1, "Daredevil"], [10, "Thrill Seeker"], [50, "Fearless"]],
  },
];

const decadeOf = (year) => Math.floor(year / 10) * 10;
const isHarsh = (entry) => {
  const tier = getTier(entry);
  return tier === "D" || tier === "F";
};

// What the craft and milestone tracks count, from the watched list ({
// movieId, tier | rating, watchCount, timestamp }) and how many dares
// you've finished. Only the movies the phone has count for decades,
// genres and the like — the same as the server, once they arrive.
export const getWatchStats = (watched, dares = 0) => {
  const movies = watched.map((entry) => getMovieById(entry.movieId)).filter(Boolean);
  const directorCounts = new Map();
  movies.forEach((movie) => {
    if (movie.director) {
      directorCounts.set(movie.director, (directorCounts.get(movie.director) ?? 0) + 1);
    }
  });
  // Days by the clock everyone shares (UTC), like the server.
  const perDay = new Map();
  watched.forEach((entry) => {
    if (!entry.timestamp) return;
    const day = Math.floor(entry.timestamp / DAY_MS);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  });
  return {
    watched: watched.length,
    tiered: watched.filter((entry) => getTier(entry) != null).length,
    decades: new Set(movies.filter((movie) => movie.year).map((movie) => decadeOf(movie.year))).size,
    genres: new Set(movies.flatMap((movie) => movie.genres ?? [])).size,
    directors: [...directorCounts.values()].filter((count) => count >= DEEP_DIRECTOR_FILMS).length,
    oldFilms: movies.filter((movie) => movie.year && movie.year < OLD_FILM_BEFORE).length,
    harsh: watched.filter(isHarsh).length,
    longFilms: movies.filter((movie) => (movie.runtime ?? 0) >= LONG_FILM_MINUTES).length,
    marathons: [...perDay.values()].filter((count) => count >= MARATHON_FILMS).length,
    rewatched: watched.filter((entry) => (entry.watchCount ?? 1) > 1).length,
    dares,
  };
};

// One track with where you are on it: its steps (each { id, title, at,
// index, top }), the value so far, the ranks reached, the current one and
// the next, and how far between them.
const buildTrack = (definition, value) => {
  const steps = definition.steps.map(([at, title], index, list) => ({
    id: `${definition.id}:${index + 1}`,
    title,
    at,
    index,
    top: index === list.length - 1,
  }));
  const reached = steps.filter((step) => value >= step.at);
  const current = reached[reached.length - 1] ?? null;
  const next = steps.find((step) => value < step.at) ?? null;
  const from = current?.at ?? 0;
  return {
    ...definition,
    steps,
    value,
    reached,
    current,
    next,
    toNext: next ? next.at - value : 0,
    progress: next ? Math.max(0, Math.min(1, (value - from) / (next.at - from))) : 1,
  };
};

// Every track, with your progress: craft, then milestones. `dares`: dares
// finished.
export const getRankTracks = (watched, dares = 0) => {
  const stats = getWatchStats(watched, dares);
  return TRACKS.map((track) => buildTrack(track, stats[track.stat] ?? 0));
};

// The sagas shaped like tracks — each step one of its own ranks — for
// celebrating a step reached. Not counted as ranks.
export const getSagaTracks = (watched) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  return getSagas()
    .filter((collection) => (collection.ranks ?? []).length > 0)
    .map((collection) => {
      const { watchedCount, total } = getCollectionProgress(collection, watchedIds);
      return buildTrack(
        {
          id: collection.id,
          kind: "saga",
          title: collection.title,
          hint: collection.subtitle,
          unit: "films",
          icon: "saga",
          collectionId: collection.id,
          total,
          steps: collection.ranks.map((rank) => [rank.at, rank.title]),
        },
        watchedCount,
      );
    });
};

// Every rank reached across these tracks: [{ ...step, track }].
export const getEarnedRanks = (tracks) =>
  tracks.flatMap((track) => track.reached.map((step) => ({ ...step, track })));

// The whole picture: tracks, ranks earned, how many, and the title.
export const getRankSummary = (watched, dares = 0) => {
  const tracks = getRankTracks(watched, dares);
  const earned = getEarnedRanks(tracks);
  return { tracks, earned, count: earned.length, title: getTitle(earned.length) };
};

export const getRankCount = (watched, dares = 0) =>
  getEarnedRanks(getRankTracks(watched, dares)).length;

// The ranks `after` has that `before` didn't — what an action just earned.
export const getNewRanks = (before, after) => {
  const had = new Set(getEarnedRanks(before).map((rank) => rank.id));
  return getEarnedRanks(after).filter((rank) => !had.has(rank.id));
};

// The ranks watching `movieId` now would earn (a dare's or tonight's
// pick's promise) — `finishesDare`: it's a dare's film, so finishing it
// counts for Dare Devil too. Already watched: none.
export const getRanksFromWatching = (watched, movieId, dares = 0, { finishesDare = false } = {}) => {
  if (watched.some((entry) => entry.movieId === movieId)) return [];
  return getNewRanks(
    getRankTracks(watched, dares),
    getRankTracks([...watched, { movieId, timestamp: Date.now() }], dares + (finishesDare ? 1 : 0)),
  );
};

// What watching one more film would do to your ranks — for many films at
// once (Tonight's pick weighs hundreds): your stats are worked out once,
// then each film only adds what it brings (a new decade, a new genre, a
// third film by a director, an old film, a long one, a third film today).
// → (movie) => { gained: [rank], advanced: [track] } — `gained` the ranks
// it would earn right away; `advanced` the craft tracks it would move
// along without reaching a rank yet (each shown as it would be after).
export const makeRankForecast = (watched, dares = 0) => {
  const base = getWatchStats(watched, dares);
  const before = new Map(getRankTracks(watched, dares).map((track) => [track.id, track]));
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const movies = watched.map((entry) => getMovieById(entry.movieId)).filter(Boolean);
  const decades = new Set(movies.filter((movie) => movie.year).map((movie) => decadeOf(movie.year)));
  const genres = new Set(movies.flatMap((movie) => movie.genres ?? []));
  const directorCounts = new Map();
  movies.forEach((movie) => {
    if (movie.director) {
      directorCounts.set(movie.director, (directorCounts.get(movie.director) ?? 0) + 1);
    }
  });
  const today = Math.floor(Date.now() / DAY_MS);
  const watchedToday = watched.filter(
    (entry) => entry.timestamp && Math.floor(entry.timestamp / DAY_MS) === today,
  ).length;

  return (movie) => {
    if (!movie || watchedIds.has(movie.id)) return { gained: [], advanced: [] };
    const after = { ...base, watched: base.watched + 1 };
    if (movie.year && !decades.has(decadeOf(movie.year))) after.decades += 1;
    after.genres += new Set((movie.genres ?? []).filter((genre) => !genres.has(genre))).size;
    if (movie.director && (directorCounts.get(movie.director) ?? 0) === DEEP_DIRECTOR_FILMS - 1) {
      after.directors += 1;
    }
    if (movie.year && movie.year < OLD_FILM_BEFORE) after.oldFilms += 1;
    if ((movie.runtime ?? 0) >= LONG_FILM_MINUTES) after.longFilms += 1;
    if (watchedToday === MARATHON_FILMS - 1) after.marathons += 1;

    const gained = [];
    const advanced = [];
    TRACKS.forEach((definition) => {
      if (after[definition.stat] === base[definition.stat]) return;
      const had = new Set(before.get(definition.id).reached.map((step) => step.id));
      const track = buildTrack(definition, after[definition.stat]);
      const fresh = track.reached.filter((step) => !had.has(step.id));
      fresh.forEach((step) => gained.push({ ...step, track }));
      if (fresh.length === 0 && definition.kind === "craft" && track.next) advanced.push(track);
    });
    // How you watch before how much: a craft rank leads.
    gained.sort((a, b) => Number(b.track.kind === "craft") - Number(a.track.kind === "craft"));
    advanced.sort((a, b) => a.toNext - b.toNext);
    return { gained, advanced };
  };
};

// A forecast as one line: the rank it earns ("Makes you Explorer in Time
// Traveler · +1 rank"), or else the track it moves along ("Counts toward
// Old Soul · 2 films to Golden Age"). Null when it does neither.
export const describeForecast = (forecast) => {
  const [rank] = forecast.gained;
  if (rank) {
    const gain =
      forecast.gained.length === 1
        ? t("+1 rank")
        : t("+{count} ranks", { count: forecast.gained.length });
    return `${t("Makes you {rank} in {saga}", { rank: t(rank.title), saga: t(rank.track.title) })} · ${gain}`;
  }
  const [track] = forecast.advanced;
  return track
    ? t("Counts toward {track} · {amount} to {rank}", {
        track: t(track.title),
        amount: formatAmount(track.toNext, track.unit),
        rank: t(track.next.title),
      })
    : null;
};

// The tracks closest to their next rank, nearest first — "Up next".
export const getClosestRanks = (tracks, limit = 3) =>
  tracks
    .filter((track) => track.next && track.value > 0)
    .sort((a, b) => a.toNext - b.toNext || b.progress - a.progress)
    .slice(0, limit);

// Rarest first (with rarity from the server: { [rank id]: percent }); a top
// rank breaks a tie, then the higher step.
export const sortByRarity = (ranks, rarity = {}) =>
  [...ranks].sort(
    (a, b) =>
      (rarity[a.id] ?? 100) - (rarity[b.id] ?? 100) ||
      Number(b.top) - Number(a.top) ||
      b.index - a.index,
  );

// "1 film", "3 decades": an amount on a track, in its unit.
const UNITS = {
  films: ["{count} film", "{count} films"],
  tiered: ["{count} film to tier", "{count} films to tier"],
  decades: ["{count} decade", "{count} decades"],
  genres: ["{count} genre", "{count} genres"],
  directors: ["{count} director", "{count} directors"],
  days: ["{count} day", "{count} days"],
  dares: ["{count} dare", "{count} dares"],
};
export const formatAmount = (count, unit) => {
  const [one, many] = UNITS[unit] ?? UNITS.films;
  return t(count === 1 ? one : many, { count });
};

// What's left to a track's next rank: "1 film to Wolf". Null at the top.
export const describeNext = (track) =>
  track.next
    ? t("{amount} to {rank}", { amount: formatAmount(track.toNext, track.unit), rank: t(track.next.title) })
    : null;

// How a step sits on its ladder, for its colour: "gold" for the top rank,
// "silver" past the middle, else "bronze".
export const getRankMetal = (step, track) => {
  if (step.top) return "gold";
  return step.index >= (track.steps.length - 1) / 2 ? "silver" : "bronze";
};

export default getRankSummary;

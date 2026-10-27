import { MOVIES, getMovieById } from "../data/movies";
import { t } from "../i18n";
import { getCollectionsForMovie, isSaga } from "./collections";
import { getMood, moodScore } from "./moods";
import { weightedRating } from "./movieFilters";
import { buildMyTasteModel, buildTasteModel, matchForModel } from "./tasteEngine";

// Picking for a group — Watch together. Everyone in the room is a member:
// you, friends (their taste learnt from their tiers, like yours) and guests
// (names only — no taste to go on). A film is only offered if nobody in the
// group has seen it, and it ranks by how well it fits the group: the
// least-pleased member counts most, then the average — so one person's
// favourite doesn't beat everyone else's "fine".
//
// Then the night's options, all from Decide's own smarts: a mood (Home's
// moods), how long you've got, and an angle — everyone's taste, something
// new to all of you, a collection you're in together, your watchlist, or a
// list.

// How much the least-pleased member weighs against the average.
const FAIRNESS = 0.6;
// Only good films are worth a group's evening; and only the best-rated of
// them are scored (scoring every film for every member is slow).
const MIN_RATING = 6.6;
const CANDIDATES = 700;
// "New for everyone": the good films that fit the group least, this share.
const NEW_SHARE = 0.3;
// A mood keeps its best-fitting share of the films.
const MOOD_SHARE = 0.35;
// A night's minutes of slack between the film ending and "done by".
const SLACK_MINUTES = 10;

export const GROUP_ANGLES = [
  { key: "blend", label: "Everyone's taste", hint: "The best fit for all of you" },
  { key: "new", label: "New for everyone", hint: "Good films outside your usual" },
  { key: "collection", label: "A collection you share", hint: "Moves you along one together" },
  { key: "watchlist", label: "Your watchlist", hint: "Films you've saved" },
];

// How long you've got: any, under two hours, or done by a time that leaves
// about two hours from now.
export const getTimeOptions = (now = Date.now()) => {
  const target = new Date(now + 2 * 60 * 60 * 1000);
  target.setMinutes(target.getMinutes() > 0 ? 60 : 0, 0, 0);
  const minutes = Math.round((target.getTime() - now) / 60000) - SLACK_MINUTES;
  return [
    { key: "any", label: t("Any length"), maxRuntime: null },
    { key: "2h", label: t("Under 2 hours"), maxRuntime: 120 },
    {
      key: "by",
      label: t("Done by {time}", {
        time: target.toLocaleTimeString([], { hour: "numeric", minute: target.getMinutes() ? "2-digit" : undefined }),
      }),
      maxRuntime: minutes,
    },
  ];
};

// The members: you, the friends who are in ({ id, name, watched }), and
// guests (names). Each with what they've seen and, when there's enough to go
// on, a model of their taste.
export const buildGroup = ({ name, watched, friends = [], guests = [] }) => [
  { key: "me", name, kind: "me", seen: new Set(watched.map((entry) => entry.movieId)), model: buildMyTasteModel(watched) },
  ...friends.map((friend) => ({
    key: friend.id,
    name: friend.name,
    kind: "friend",
    friend,
    seen: new Set((friend.watched ?? []).map((entry) => entry.movieId)),
    model: buildTasteModel(friend.watched ?? []),
  })),
  ...guests.map((guest, index) => ({ key: `guest-${index}`, name: guest, kind: "guest", seen: new Set(), model: null })),
];

// The group's average taste fingerprint (for moods), or null.
const groupFingerprint = (members) => {
  const prints = members.map((member) => member.model?.fingerprint).filter(Boolean);
  if (prints.length === 0) return null;
  return prints[0].map((_, index) => prints.reduce((sum, print) => sum + print[index], 0) / prints.length);
};

// One film for the group: each member's match (null for a guest, or anyone
// with too little history), and the group's fit (0–100).
const scoreForGroup = (movie, members) => {
  const matches = members.map((member) => ({
    key: member.key,
    name: member.name,
    match: member.model ? matchForModel(member.model, movie) : null,
  }));
  const known = matches.map((item) => item.match).filter((value) => value != null);
  const fit = known.length
    ? Math.round(FAIRNESS * Math.min(...known) + (1 - FAIRNESS) * (known.reduce((sum, value) => sum + value, 0) / known.length))
    : Math.round(weightedRating(movie) * 10);
  return { movie, matches, fit };
};

// The collections members are partway through that a film is in: how many
// members it moves along, and the best one's title.
const sharedCollection = (movie, members) => {
  let best = null;
  getCollectionsForMovie(movie.id)
    .filter(isSaga)
    .forEach((collection) => {
      const along = members.filter(
        (member) => member.kind !== "guest" && collection.movieIds.some((id) => member.seen.has(id)),
      );
      if (along.length > 0 && (!best || along.length > best.along.length)) best = { collection, along };
    });
  return best;
};

// The ranked films for the night: [{ movie, fit, matches, reason }], best
// first. `options`: { members, mood, maxRuntime, angle, watchlistIds,
// listMovieIds }.
export const rankForGroup = ({ members, mood: moodKey, maxRuntime, angle, watchlistIds = [], listMovieIds = null }) => {
  const seenByAnyone = (movie) => members.some((member) => member.seen.has(movie.id));
  const mood = getMood(moodKey);

  // Where the films come from: a list, your watchlist, or the good films.
  let pool =
    angle === "list" && listMovieIds
      ? listMovieIds.map(getMovieById).filter(Boolean)
      : angle === "watchlist"
        ? watchlistIds.map(getMovieById).filter(Boolean)
        : [...MOVIES]
            .filter((movie) => movie.rating >= MIN_RATING)
            .sort((a, b) => weightedRating(b) - weightedRating(a))
            .slice(0, CANDIDATES);
  pool = pool.filter(
    (movie) =>
      !seenByAnyone(movie) &&
      (!maxRuntime || !movie.runtime || movie.runtime <= maxRuntime) &&
      (!mood?.maxRuntime || !movie.runtime || movie.runtime <= mood.maxRuntime),
  );

  // A mood keeps the films that fit it best, for the group's taste.
  if (mood) {
    const fingerprint = groupFingerprint(members);
    const fitting = pool
      .map((movie) => ({ movie, score: moodScore(movie, mood, fingerprint) }))
      .sort((a, b) => b.score - a.score);
    pool = fitting.slice(0, Math.max(12, Math.ceil(fitting.length * MOOD_SHARE))).map((item) => item.movie);
  }

  let ranked = pool.map((movie) => scoreForGroup(movie, members));

  if (angle === "new") {
    // The good films that fit you least — then the best-rated of those.
    const byFit = [...ranked].sort((a, b) => a.fit - b.fit);
    ranked = byFit
      .slice(0, Math.max(12, Math.ceil(byFit.length * NEW_SHARE)))
      .sort((a, b) => weightedRating(b.movie) - weightedRating(a.movie))
      .map((item) => ({ ...item, reason: t("Something new for all of you") }));
  } else if (angle === "collection") {
    ranked = ranked
      .map((item) => ({ ...item, shared: sharedCollection(item.movie, members) }))
      .filter((item) => item.shared)
      .sort((a, b) => b.shared.along.length - a.shared.along.length || b.fit - a.fit)
      .map((item) => ({
        ...item,
        reason:
          item.shared.along.length > 1
            ? t("Moves {count} of you along {collection}", {
                count: item.shared.along.length,
                collection: item.shared.collection.title,
              })
            : t("Next in {collection} for {name}", {
                collection: item.shared.collection.title,
                name: item.shared.along[0].kind === "me" ? t("you") : item.shared.along[0].name,
              }),
      }));
  } else {
    ranked.sort((a, b) => b.fit - a.fit);
  }

  return ranked.map((item) => ({ ...item, reason: item.reason ?? describeFit(item, members) }));
};

// Why it suits the group, in a line.
const describeFit = ({ matches }, members) => {
  const known = matches.filter((item) => item.match != null);
  if (known.length === 0) return t("Well rated, and none of you have seen it");
  if (known.length === 1) return members.length > 1 ? t("Fits your taste, and nobody's seen it") : t("Fits your taste");
  const low = Math.min(...known.map((item) => item.match));
  return low >= 80
    ? t("Fits all {count} of you", { count: known.length })
    : low >= 68
      ? t("Something all {count} of you should like", { count: known.length })
      : t("The best middle ground for your group");
};

// How many films a shortlist holds, for this many people — a few strong
// options each, a short swipe either way.
export const shortlistSize = (people) => Math.min(14, Math.max(6, 4 + people * 2));

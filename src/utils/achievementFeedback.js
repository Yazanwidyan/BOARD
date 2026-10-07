import * as Haptics from "expo-haptics";

import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { getMovieById } from "../data/movies";
import { useAchievementStore } from "../store/achievementStore";
import { showToast } from "../store/toastStore";
import { isRated } from "./tiers";
import { getNewlyEarnedBadges } from "./badges";
import {
  getCollectionsCompletedBy,
  getCompletedCollectionsCount,
} from "./collections";
import {
  COLLECTION_XP,
  DIRECTOR_DEPTH_XP,
  NEW_DECADE_XP,
  NEW_GENRE_XP,
  RATE_XP,
  WATCH_XP,
  getCompletedChallengesCount,
  getCompletedXPCollections,
  getLevel,
  getXPBreakdown,
} from "./xp";

// The one place that turns "something in the XP economy just changed" into
// a real in-app achievement popup (see AchievementModal, mounted once at
// the navigation root) — a button silently changing label, or a badge you
// only discover later by opening Profile, isn't a moment at all. A single
// action can trigger more than one kind of reward at once (finishes a
// collection, completes a challenge, crosses a badge threshold); all of it
// shows in the same popup rather than several stacked ones.
export const badgeParams = (watched, bucketList, challengeHistory) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  return {
    watchedCount: watched.length,
    ratedCount: watched.filter(isRated).length,
    queuedCount: bucketList.length,
    completedCollectionsCount: getCompletedCollectionsCount(watchedIds),
    completedChallengesCount: getCompletedChallengesCount(challengeHistory),
    rewatchedCount: watched.filter((entry) => (entry.watchCount ?? 1) > 1)
      .length,
    watchedIds,
  };
};

// Badges and challenges are recognition — they show in the dialog but add
// no XP (xp: null renders as a ✓ instead of a number).
const badgeRows = (badges) =>
  badges.map((badge) => ({
    label: "Badge earned",
    detail: badge.label,
    xp: null,
    // So the dialog can show the real medal.
    badge,
  }));

// The XP rows for what changed between two watched lists: each new genre /
// decade / director milestone / finished collection named, so the dialog
// says *why* (e.g. "New genre · Horror +50").
const xpRowsBetween = (watchedBefore, watchedAfter) => {
  const before = getXPBreakdown(watchedBefore);
  const after = getXPBreakdown(watchedAfter);
  const rows = [];
  const added = (list, previous) =>
    list.filter((item) => !previous.includes(item));
  if (after.xp.watched > before.xp.watched) {
    rows.push({ label: "Watched", xp: WATCH_XP });
  }
  added(after.genres, before.genres).forEach((genre) =>
    rows.push({ label: "New genre", detail: genre, xp: NEW_GENRE_XP }),
  );
  added(after.decades, before.decades).forEach((decade) =>
    rows.push({
      label: "New decade",
      detail: `The ${decade}`,
      xp: NEW_DECADE_XP,
    }),
  );
  added(after.deepDirectors, before.deepDirectors).forEach((director) =>
    rows.push({
      label: "Director depth",
      detail: `3 films by ${director}`,
      xp: DIRECTOR_DEPTH_XP,
    }),
  );
  if (after.xp.rated > before.xp.rated) {
    rows.push({ label: "Rated", xp: RATE_XP });
  }
  return { rows, before: before.total, after: after.total };
};

// "Level up!" row when the change crossed a level boundary.
const levelUpRow = (xpBefore, xpAfter) => {
  const levelBefore = getLevel(xpBefore).level;
  const next = getLevel(xpAfter);
  return next.level > levelBefore
    ? {
        label: "Level up",
        detail: `Level ${next.level} · ${next.name}`,
        xp: null,
      }
    : null;
};

// `tierMovieId`: a just-watched movie — the dialog then offers its tier
// picker so it can be tiered on the spot.
const showAchievement = (
  rows,
  kinds,
  shareCollectionId = null,
  tierMovieId = null,
) => {
  if (rows.length === 0) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  const total = rows.reduce((sum, row) => sum + (row.xp ?? 0), 0);

  const title = kinds.includes("level")
    ? "Level Up!"
    : kinds.length > 1
      ? "Big Night!"
      : kinds.includes("collection")
        ? "Collection Complete!"
        : kinds.includes("challenge")
          ? "Challenge Complete!"
          : kinds.includes("rewatch")
            ? "Rewatched!"
            : kinds.includes("badge")
              ? rows.length > 1
                ? "Badges Earned!"
                : "Badge Earned!"
              : "Marked as Watched";

  const kind = kinds.includes("level")
    ? "level"
    : kinds.length > 1
      ? "multi"
      : (kinds[0] ?? "watched");

  useAchievementStore
    .getState()
    .showAchievement({
      title,
      kind,
      rows,
      total,
      shareCollectionId,
      tierMovieId,
    });
};

// Call right after toggleWatched(movieId), passing the watched/bucketList
// arrays as they were the instant BEFORE that call — every count this
// checks (watch tally, collections, badges) is read fresh from the store
// AFTER, so the diff is always against the real transition, not a guess.
export const giveWatchedFeedback = (
  movieId,
  watchedBefore,
  bucketListBefore,
) => {
  const challengeStore = useChallengeStore.getState();
  const historyBefore = challengeStore.history;
  const completedChallenge = challengeStore.checkAutoCompletion(movieId);

  const movieState = useMovieStore.getState();
  const watchedAfter = movieState.watched;
  const bucketListAfter = movieState.bucketList;
  const historyAfter = useChallengeStore.getState().history;

  const watchedIdsBefore = new Set(watchedBefore.map((entry) => entry.movieId));
  const completedCollections = getCollectionsCompletedBy(
    movieId,
    watchedIdsBefore,
  );

  const newBadges = getNewlyEarnedBadges(
    badgeParams(watchedBefore, bucketListBefore, historyBefore),
    badgeParams(watchedAfter, bucketListAfter, historyAfter),
  );

  const { rows, before, after } = xpRowsBetween(watchedBefore, watchedAfter);
  const kinds = [];

  // Every finished collection is celebrated; only real bodies of work
  // (franchise / director / actor, 3+ films) carry the XP.
  const xpCollectionIds = new Set(
    getCompletedXPCollections(
      new Set(watchedAfter.map((entry) => entry.movieId)),
    ).map((collection) => collection.id),
  );
  completedCollections.forEach((collection) => {
    rows.push({
      label: "Collection complete",
      detail: collection.title,
      xp: xpCollectionIds.has(collection.id) ? COLLECTION_XP : null,
    });
    kinds.push("collection");
  });
  if (completedChallenge) {
    rows.push({
      label: "Challenge complete",
      detail: completedChallenge.title,
      xp: null,
    });
    kinds.push("challenge");
  }
  if (newBadges.length > 0) {
    rows.push(...badgeRows(newBadges));
    kinds.push("badge");
  }
  // `after` already includes collection XP (it's derived from the whole
  // watched list), so the level check sees everything this watch earned.
  const levelUp = levelUpRow(before, after);
  if (levelUp) {
    rows.unshift(levelUp);
    kinds.push("level");
  }

  // Finishing a director / actor / franchise set offers the brag card.
  const shareCollectionId =
    completedCollections.find((collection) =>
      xpCollectionIds.has(collection.id),
    )?.id ?? null;
  showAchievement(rows, kinds, shareCollectionId, movieId);
};

// Call right after setWatchedRating(movieId, rating), passing the watched
// array as it was the instant BEFORE that call. Rating can only ever move
// the Critic badge ladder, but it's run through the same general diff so a
// crossed threshold is never missed — that's the exact gap that prompted
// this (rating a 5th movie earned "Amateur Critic" with nothing to show
// for it until Profile was opened later).
export const giveRatingFeedback = (watchedBefore) => {
  const { watched: watchedAfter, bucketList } = useMovieStore.getState();
  const { history } = useChallengeStore.getState();

  const newBadges = getNewlyEarnedBadges(
    badgeParams(watchedBefore, bucketList, history),
    badgeParams(watchedAfter, bucketList, history),
  );

  // Rating adds a little XP — only worth a dialog when it also earned a
  // badge or crossed a level; otherwise the tier lighting up is feedback
  // enough.
  const { rows, before, after } = xpRowsBetween(watchedBefore, watchedAfter);
  const levelUp = levelUpRow(before, after);
  if (newBadges.length === 0 && !levelUp) return;
  const kinds = [];
  if (levelUp) {
    rows.unshift(levelUp);
    kinds.push("level");
  }
  if (newBadges.length > 0) {
    rows.push(...badgeRows(newBadges));
    kinds.push("badge");
  }
  showAchievement(rows, kinds);
};

// A drop-in replacement for calling movieStore's rewatchMovie directly —
// owns the whole thing (the store call, the before/after snapshot, the
// popup) so every call site is just this one function. Always shows a
// confirmation: a toast normally, the achievement dialog when it earned a
// Rewatch-tier badge.
export const rewatchMovieWithFeedback = (movieId) => {
  const {
    watched: watchedBefore,
    bucketList,
    rewatchMovie,
  } = useMovieStore.getState();
  const { history } = useChallengeStore.getState();

  rewatchMovie(movieId);

  const { watched: watchedAfter } = useMovieStore.getState();
  const newBadges = getNewlyEarnedBadges(
    badgeParams(watchedBefore, bucketList, history),
    badgeParams(watchedAfter, bucketList, history),
  );

  // Rewatches add no XP (they're history, not more range) — a toast logs
  // it, unless it earned a Rewatch badge, which gets the dialog.
  if (newBadges.length > 0) {
    showAchievement(badgeRows(newBadges), ["badge"]);
  } else {
    const title = getMovieById(movieId)?.title ?? "Movie";
    showToast(`Rewatch of ${title} logged`, { tone: "success" });
  }
};

// A drop-in replacement for calling movieStore's toggleBucketList directly
// — every call site just swaps the import, no before/after snapshotting of
// its own to get wrong. Only the Curator badge (10+ on the watchlist) can
// possibly move here, but it goes through the same general diff as
// everything else so every badge category gets the exact same feedback
// once earned, not just the ones someone remembered to wire up.
export const toggleBucketListWithFeedback = (movieId) => {
  const {
    watched,
    bucketList: bucketListBefore,
    toggleBucketList,
  } = useMovieStore.getState();
  const { history } = useChallengeStore.getState();

  toggleBucketList(movieId);

  const bucketListAfter = useMovieStore.getState().bucketList;
  const added = bucketListAfter.some((entry) => entry.movieId === movieId);
  const title = getMovieById(movieId)?.title ?? "Movie";
  const newBadges = getNewlyEarnedBadges(
    badgeParams(watched, bucketListBefore, history),
    badgeParams(watched, bucketListAfter, history),
  );

  // A badge earned by this save gets the full achievement dialog; every
  // other add/remove gets a quick toast so the tap is never silent.
  if (newBadges.length > 0) {
    showAchievement(badgeRows(newBadges), ["badge"]);
  } else {
    showToast(
      added
        ? `${title} added to your watchlist`
        : `${title} removed from your watchlist`,
      { tone: added ? "success" : "info" },
    );
  }
};

export default giveWatchedFeedback;

import * as Haptics from "expo-haptics";

import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { useAchievementStore } from "../store/achievementStore";
import { getNewlyEarnedBadges } from "./badges";
import { getCollectionsCompletedBy, getCompletedCollectionsCount } from "./collections";
import {
  BADGE_XP,
  COLLECTION_XP,
  REWATCH_XP,
  WATCH_XP,
  getCompletedChallengesCount,
} from "./xp";

// The one place that turns "something in the XP economy just changed" into
// a real in-app achievement popup (see AchievementModal, mounted once at
// the navigation root) — a button silently changing label, or a badge you
// only discover later by opening Profile, isn't a moment at all. A single
// action can trigger more than one kind of reward at once (finishes a
// collection, completes a challenge, crosses a badge threshold); all of it
// shows in the same popup rather than several stacked ones.
const badgeParams = (watched, bucketList, challengeHistory) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  return {
    watchedCount: watched.length,
    ratedCount: watched.filter((entry) => entry.rating != null).length,
    queuedCount: bucketList.length,
    completedCollectionsCount: getCompletedCollectionsCount(watchedIds),
    completedChallengesCount: getCompletedChallengesCount(challengeHistory),
    rewatchedCount: watched.filter((entry) => (entry.watchCount ?? 1) > 1).length,
    watchedIds,
  };
};

const badgeRows = (badges) =>
  badges.map((badge) => ({
    label: "Badge Earned",
    detail: badge.label,
    xp: BADGE_XP,
  }));

const showAchievement = (rows, kinds) => {
  if (rows.length === 0) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  const total = rows.reduce((sum, row) => sum + row.xp, 0);

  const title =
    kinds.length > 1
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

  const kind =
    kinds.length > 1 ? "multi" : (kinds[0] ?? "watched");

  useAchievementStore.getState().showAchievement({ title, kind, rows, total });
};

// Call right after toggleWatched(movieId), passing the watched/bucketList
// arrays as they were the instant BEFORE that call — every count this
// checks (watch tally, collections, badges) is read fresh from the store
// AFTER, so the diff is always against the real transition, not a guess.
export const giveWatchedFeedback = (movieId, watchedBefore, bucketListBefore) => {
  const challengeStore = useChallengeStore.getState();
  const historyBefore = challengeStore.history;
  const completedChallenge = challengeStore.checkAutoCompletion(movieId);

  const movieState = useMovieStore.getState();
  const watchedAfter = movieState.watched;
  const bucketListAfter = movieState.bucketList;
  const historyAfter = useChallengeStore.getState().history;

  const watchedIdsBefore = new Set(watchedBefore.map((entry) => entry.movieId));
  const completedCollections = getCollectionsCompletedBy(movieId, watchedIdsBefore);

  const newBadges = getNewlyEarnedBadges(
    badgeParams(watchedBefore, bucketListBefore, historyBefore),
    badgeParams(watchedAfter, bucketListAfter, historyAfter),
  );

  const rows = [{ label: "Watched", xp: WATCH_XP }];
  const kinds = [];

  completedCollections.forEach((collection) => {
    rows.push({ label: "Collection Complete", detail: collection.title, xp: COLLECTION_XP });
    kinds.push("collection");
  });
  if (completedChallenge) {
    rows.push({
      label: "Challenge Complete",
      detail: completedChallenge.title,
      xp: completedChallenge.xpReward,
    });
    kinds.push("challenge");
  }
  if (newBadges.length > 0) {
    rows.push(...badgeRows(newBadges));
    kinds.push("badge");
  }

  showAchievement(rows, kinds);
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

  showAchievement(badgeRows(newBadges), newBadges.length > 0 ? ["badge"] : []);
};

// A drop-in replacement for calling movieStore's rewatchMovie directly —
// owns the whole thing (the store call, the before/after snapshot, the
// popup) so every call site is just this one function. Always shows a
// popup (unlike rating, which stays silent when nothing crossed a
// threshold) since a rewatch always earns REWATCH_XP on its own, with any
// newly-earned Rewatcher-tier badge folded into the same one.
export const rewatchMovieWithFeedback = (movieId) => {
  const { watched: watchedBefore, bucketList, rewatchMovie } = useMovieStore.getState();
  const { history } = useChallengeStore.getState();

  rewatchMovie(movieId);

  const { watched: watchedAfter } = useMovieStore.getState();
  const newBadges = getNewlyEarnedBadges(
    badgeParams(watchedBefore, bucketList, history),
    badgeParams(watchedAfter, bucketList, history),
  );

  const rows = [{ label: "Rewatched", xp: REWATCH_XP }, ...badgeRows(newBadges)];
  const kinds = ["rewatch", ...(newBadges.length > 0 ? ["badge"] : [])];

  showAchievement(rows, kinds);
};

// A drop-in replacement for calling movieStore's toggleBucketList directly
// — every call site just swaps the import, no before/after snapshotting of
// its own to get wrong. Only the Curator badge (10+ on the watchlist) can
// possibly move here, but it goes through the same general diff as
// everything else so every badge category gets the exact same feedback
// once earned, not just the ones someone remembered to wire up.
export const toggleBucketListWithFeedback = (movieId) => {
  const { watched, bucketList: bucketListBefore, toggleBucketList } =
    useMovieStore.getState();
  const { history } = useChallengeStore.getState();

  toggleBucketList(movieId);

  const bucketListAfter = useMovieStore.getState().bucketList;
  const newBadges = getNewlyEarnedBadges(
    badgeParams(watched, bucketListBefore, history),
    badgeParams(watched, bucketListAfter, history),
  );

  showAchievement(badgeRows(newBadges), newBadges.length > 0 ? ["badge"] : []);
};

export default giveWatchedFeedback;

import * as Haptics from "expo-haptics";

import { useChallengeStore } from "../store/challengeStore";
import { refreshRanks, useMovieStore } from "../store/movieStore";
import { getMovieById } from "../data/movies";
import { reportAchievements } from "../services/sync";
import { useAchievementStore } from "../store/achievementStore";
import { showToast } from "../store/toastStore";
import { getEarnedRanks, getNewRanks, getRankTracks, getSagaTracks } from "./ranks";
import { countFinishedDares } from "./useRanks";
import { t } from "../i18n";

// The one place that turns "you just earned something" into a real in-app
// moment (see AchievementModal, mounted once at the navigation root). There
// is one thing to earn — ranks (utils/ranks) — so every action is checked
// the same way: your ranks before it against your ranks after. A watch can
// reach several at once (Time Traveler, First Watch…), and a step on a
// saga's own ladder (not counted as a rank) or a finished dare can come
// with it; all of it is one moment, and the dialog decides what leads.

const snapshot = (watched, history) =>
  getRankTracks(watched, countFinishedDares(history));

// A moment: { reason: "watched" | "rewatch" | "tier", movieId, ranks (new,
// counted), sagaSteps (new, on sagas' own ladders), dare ({ title } |
// null), ranksBefore, ranksAfter, shareCollectionId (a saga just finished,
// for the brag card) }.
const showMoment = ({ reason, movieId = null, ranks = [], sagaSteps = [], dare = null, counts }) => {
  // New ranks and saga steps go to friends' activity feeds.
  reportAchievements([...ranks, ...sagaSteps].map((rank) => ({ rank })));
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  useAchievementStore.getState().showAchievement({
    reason,
    movieId,
    ranks,
    sagaSteps,
    dare,
    ranksBefore: counts.before,
    ranksAfter: counts.after,
    shareCollectionId: sagaSteps.find((step) => step.top)?.track.collectionId ?? null,
  });
};

const countsBetween = (before, after) => ({
  before: getEarnedRanks(before).length,
  after: getEarnedRanks(after).length,
});

// Call right after toggleWatched(movieId), passing the watched array as it
// was the instant BEFORE that call — everything is read fresh from the
// stores AFTER, so the diff is the real transition. Always shows (it's the
// moment to tier it).
export const giveWatchedFeedback = (movieId, watchedBefore) => {
  const challengeStore = useChallengeStore.getState();
  const historyBefore = challengeStore.history;
  const completedChallenge = challengeStore.checkAutoCompletion(movieId);
  // A finished dare is a rank of its own (Dare Devil).
  if (completedChallenge) refreshRanks();

  const watchedAfter = useMovieStore.getState().watched;
  const before = snapshot(watchedBefore, historyBefore);
  const after = snapshot(watchedAfter, useChallengeStore.getState().history);
  showMoment({
    reason: "watched",
    movieId,
    ranks: getNewRanks(before, after),
    sagaSteps: getNewRanks(getSagaTracks(watchedBefore), getSagaTracks(watchedAfter)),
    dare: completedChallenge ? { title: completedChallenge.title } : null,
    counts: countsBetween(before, after),
  });
};

// Call right after setWatchedRating(movieId, rating), passing the watched
// array as it was the instant BEFORE that call. A tier can earn a rank
// (Films tiered, Tough Critic) — the dialog only shows when it did;
// otherwise the tier lighting up is feedback enough.
export const giveRatingFeedback = (watchedBefore) => {
  const { history } = useChallengeStore.getState();
  const before = snapshot(watchedBefore, history);
  const after = snapshot(useMovieStore.getState().watched, history);
  const ranks = getNewRanks(before, after);
  if (ranks.length === 0) return;
  showMoment({ reason: "tier", ranks, counts: countsBetween(before, after) });
};

// A drop-in replacement for calling movieStore's rewatchMovie directly —
// owns the whole thing (the store call, the before/after, the popup).
// Always confirms: a toast normally, the dialog when it earned a rank
// (Comfort Watcher, or a third film that day for Marathoner).
export const rewatchMovieWithFeedback = (movieId) => {
  const { watched: watchedBefore, rewatchMovie } = useMovieStore.getState();
  const { history } = useChallengeStore.getState();

  rewatchMovie(movieId);

  const before = snapshot(watchedBefore, history);
  const after = snapshot(useMovieStore.getState().watched, history);
  const ranks = getNewRanks(before, after);
  if (ranks.length > 0) {
    showMoment({ reason: "rewatch", movieId, ranks, counts: countsBetween(before, after) });
  } else {
    const title = getMovieById(movieId)?.title ?? "Movie";
    showToast(t("Rewatch of {title} logged", { title: title }), {
      tone: "success",
    });
  }
};

// A drop-in replacement for calling movieStore's toggleBucketList directly,
// so every add or remove says so with a quick toast. (Saving earns no rank —
// watching does.)
export const toggleBucketListWithFeedback = (movieId) => {
  const { toggleBucketList } = useMovieStore.getState();
  toggleBucketList(movieId);
  const added = useMovieStore
    .getState()
    .bucketList.some((entry) => entry.movieId === movieId);
  const title = getMovieById(movieId)?.title ?? "Movie";
  showToast(
    added
      ? t("{title} added to your watchlist", { title: title })
      : t("{title} removed from your watchlist", { title: title }),
    { tone: added ? "success" : "info" },
  );
};

export default giveWatchedFeedback;

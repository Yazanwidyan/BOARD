import * as Haptics from "expo-haptics";

import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { getMovieById } from "../data/movies";
import { logEvent } from "../services/events";
import { getNudgeMovieId, scheduleTierNudge } from "../services/notifications";
import { useAchievementStore } from "../store/achievementStore";
import { useTasteStore } from "../store/tasteStore";
import { showToast } from "../store/toastStore";
import { getTonightSuggestions } from "./tonightPick";
import { getCollectionProgress, getCollectionsCompletedBy, getCollectionsForMovie, isSaga } from "./collections";
import { t } from "../i18n";

// The one place that turns "you just watched something" into a real in-app
// moment (see AchievementModal, mounted once at the navigation root). The
// one thing to finish is a collection: a watch that completes one is the
// big moment ("Collection complete"); any other says how far it took you
// ("Nolan · 7 of 8") and leads to tiering the film.

// What this watch did to your collections, from the watch history before
// it: `completed` — [{ id, title, saga }] it finished — and `progress` —
// { id, title, subject, movieIds, watched, total, started } for the
// closest one it moved along (`started`: this film began it), or null.
// Sagas are counted here; directors' collections come from the server's
// paths (store/movieStore `paths`), as they were before the watch.
const collectionsMovedBy = (movieId, watchedBefore) => {
  const before = new Set(watchedBefore.map((entry) => entry.movieId));
  if (before.has(movieId)) return { completed: [], progress: null };
  const after = new Set([...before, movieId]);
  const paths = useMovieStore.getState().paths ?? [];

  const completed = [
    ...getCollectionsCompletedBy(movieId, before).map((collection) => ({
      id: collection.id,
      title: collection.title,
      saga: true,
    })),
    ...paths
      .filter((path) => !isSaga(path) && path.movieIds.includes(movieId) && path.watched + 1 === path.total)
      .map((path) => ({ id: path.id, title: path.title, saga: false })),
  ];

  const moved = [
    ...getCollectionsForMovie(movieId)
      .filter(isSaga)
      .map((collection) => {
        const { watchedCount, total } = getCollectionProgress(collection, after);
        return {
          id: collection.id,
          title: collection.title,
          subject: collection.subject ?? collection.title,
          movieIds: collection.movieIds,
          watched: watchedCount,
          total,
        };
      }),
    ...paths
      .filter((path) => !isSaga(path) && path.movieIds.includes(movieId))
      .map((path) => ({
        id: path.id,
        title: path.title,
        subject: path.subject ?? path.title,
        movieIds: path.movieIds,
        watched: path.watched + 1,
        total: path.total,
      })),
  ]
    .filter((item) => item.watched < item.total)
    .sort((a, b) => a.total - a.watched - (b.total - b.watched));

  const progress = moved[0] ?? null;
  return { completed, progress: progress && { ...progress, started: progress.watched === 1 } };
};

// A moment: { reason: "watched" | "rewatch", movieId, completed, progress,
// dare ({ title } | null), shareCollectionId (a saga just finished, for
// the brag card) }.
const showMoment = ({ reason, movieId = null, completed = [], progress = null, dare = null }) => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  useAchievementStore.getState().showAchievement({
    reason,
    movieId,
    completed,
    progress,
    dare,
    shareCollectionId: completed.find((item) => item.saga)?.id ?? null,
  });
};

// Call right after toggleWatched(movieId), passing the watched array as it
// was the instant BEFORE that call. Always shows (it's the moment to tier
// it) — and if it isn't tiered by tomorrow morning, the app asks how it was.
export const giveWatchedFeedback = (movieId, watchedBefore) => {
  const completedChallenge = useChallengeStore.getState().checkAutoCompletion(movieId);
  if (!watchedBefore.some((entry) => entry.movieId === movieId)) scheduleTierNudge(movieId);
  showMoment({
    reason: "watched",
    movieId,
    ...collectionsMovedBy(movieId, watchedBefore),
    dare: completedChallenge ? { title: completedChallenge.title } : null,
  });
};

// Tonight's best fit right now — the film "One for tonight" leads with on
// Home (utils/tonightPick, its first suggestion) — or null.
const tonightsTopPick = () => {
  const { watched, bucketList } = useMovieStore.getState();
  return getTonightSuggestions(watched, bucketList, useTasteStore.getState().passes, 1)[0]?.movie ?? null;
};

// Tier a film and say what it did — honestly: tonight's pick is compared
// before and after, and a new one is named only when it really changed
// ("Heat → S. New pick for tonight: Thief."); otherwise just "Noted.".
// A D or an F says the picks will steer away. (The engine's guessed vibe
// words are never claimed — only the film it now picks.)
export const tierWithFeedback = (movieId, tier) => {
  // Activation: a tier for the film the morning question was about.
  if (getNudgeMovieId() === movieId) logEvent("pick_tiered");
  const before = tonightsTopPick();
  useMovieStore.getState().setWatchedTier(movieId, tier);
  const after = tonightsTopPick();
  const title = getMovieById(movieId)?.title ?? t("This film");
  const changed = after && after.id !== before?.id ? after : null;
  const disliked = tier === "D" || tier === "F";
  let message;
  if (disliked) {
    message = changed
      ? t("Got it, fewer films like {title}. New pick for tonight: {pick}.", { title, pick: changed.title })
      : t("Got it, fewer films like {title}.", { title });
  } else {
    message = changed
      ? t("{title} → {tier}. New pick for tonight: {pick}.", { title, tier, pick: changed.title })
      : t("Noted. {title} is in your {tier} tier.", { title, tier });
  }
  showToast(message, { tone: "success", duration: changed ? 4000 : 2600 });
};

// A drop-in replacement for calling movieStore's rewatchMovie directly —
// the store call, then a toast to say so.
export const rewatchMovieWithFeedback = (movieId) => {
  useMovieStore.getState().rewatchMovie(movieId);
  const title = getMovieById(movieId)?.title ?? "Movie";
  showToast(t("Rewatch of {title} logged", { title: title }), {
    tone: "success",
  });
};

// A drop-in replacement for calling movieStore's toggleBucketList directly,
// so every add or remove says so with a quick toast.
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

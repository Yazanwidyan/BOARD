import * as Haptics from "expo-haptics";
import { Bookmark, Check, Layers, Play, Shuffle, X } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { MOVIES, getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { giveWatchedFeedback } from "../utils/achievementFeedback";
import {
  getCollectionProgress,
  getCollectionsForMovie,
} from "../utils/collections";
import { getMood, pickMovieForMood } from "../utils/moods";
import { formatRuntime } from "../utils/movieFilters";
import { TargetIcon } from "./icons/TabIcons";
import { MarqueeSign } from "./MarqueeSign";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";

const SIMILAR_POOL = 20;

const randomFrom = (items) => items[Math.floor(Math.random() * items.length)];

// Tonight's Pick as a cinema marquee sign (see MarqueeSign) — poster-forward: a bigger poster with the movie's own
// description (so the card sells it a little), one main action — Watched
// it — plus round Trailer and Swap buttons, and a quiet ✕ in the corner
// to drop the pick. Tapping the card opens the movie. Renders nothing when
// there's no real pick, by design.
export const TonightsPickCard = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const clearPickedMovie = useMovieStore((state) => state.clearPickedMovie);
  const pickMood = useMovieStore((state) => state.pickMood);
  const setMoodPick = useMovieStore((state) => state.setMoodPick);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);

  const pickedMovie = pickedMovieId ? getMovieById(pickedMovieId) : null;
  if (!pickedMovie) return null;

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  // Only counts if it was made for this exact pick (see movieStore).
  const mood =
    pickMood?.movieId === pickedMovie.id ? getMood(pickMood.mood) : null;

  // Why this movie — the most specific reason wins.
  const inProgressCollection = getCollectionsForMovie(pickedMovie.id).find(
    (collection) => {
      const { progress } = getCollectionProgress(collection, watchedIds);
      return progress > 0 && progress < 1;
    },
  );
  const reason =
    activeChallenge?.targetMovieId === pickedMovie.id
      ? {
          Icon: TargetIcon,
          text: "Your active challenge",
          color: colors.accentLight,
        }
      : inProgressCollection
        ? {
            Icon: Layers,
            text: `Next in ${inProgressCollection.title}`,
            color: colors.success,
          }
        : bucketList.some((entry) => entry.movieId === pickedMovie.id)
          ? {
              Icon: Bookmark,
              text: "From your watchlist",
              color: colors.textSecondary,
            }
          : null;

  const openDetails = () =>
    navigation.navigate("MovieDetails", { movieId: pickedMovie.id });

  const markWatched = () => {
    const { watched: watchedBefore, bucketList: bucketListBefore } =
      useMovieStore.getState();
    toggleWatched(pickedMovie.id);
    // Stays on Home — the achievement dialog is the confirmation, and
    // the card itself goes away since the pick is now watched.
    giveWatchedFeedback(pickedMovie.id, watchedBefore, bucketListBefore);
  };

  const openTrailer = () => {
    const query = encodeURIComponent(
      `${pickedMovie.title} ${pickedMovie.year} trailer`,
    );
    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
  };

  // Swap for something in the same spirit: another movie for the same
  // mood; otherwise another unwatched watchlist movie; otherwise a
  // well-rated unwatched movie sharing this one's main genre.
  const swap = () => {
    Haptics.selectionAsync();
    if (mood) {
      const next = pickMovieForMood(mood.key, [pickedMovie.id]);
      if (next) setMoodPick(next.id, mood.key);
      return;
    }
    const fromWatchlist = bucketList
      .map((entry) => entry.movieId)
      .filter((id) => id !== pickedMovie.id && !watchedIds.has(id));
    if (fromWatchlist.length > 0) {
      togglePickedMovie(randomFrom(fromWatchlist));
      return;
    }
    const similar = MOVIES.filter(
      (movie) =>
        movie.id !== pickedMovie.id &&
        !watchedIds.has(movie.id) &&
        movie.genres[0] === pickedMovie.genres[0],
    )
      .sort((a, b) => b.rating - a.rating)
      .slice(0, SIMILAR_POOL);
    if (similar.length > 0) {
      togglePickedMovie(randomFrom(similar).id);
    } else {
      showToast("Nothing else to swap to right now");
    }
  };

  return (
    <Pressable onPress={openDetails}>
      <MarqueeSign
        label="NOW SHOWING · TONIGHT"
        backdropUri={pickedMovie.poster}
        right={
          <Pressable
            style={styles.dismiss}
            onPress={clearPickedMovie}
            hitSlop={8}
            accessibilityLabel="Remove tonight's pick"
          >
            <X size={14} color={colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
        }
      >
        <View style={styles.body}>
          <MoviePoster uri={pickedMovie.poster} style={styles.poster} />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {pickedMovie.title}
            </Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {pickedMovie.year} · {formatRuntime(pickedMovie.runtime)} ·{" "}
              {pickedMovie.genres[0]}
            </Text>
            {reason && (
              <View style={styles.reasonRow}>
                <reason.Icon size={13} color={reason.color} />
                <Text
                  style={[styles.reasonText, { color: reason.color }]}
                  numberOfLines={1}
                >
                  {reason.text}
                </Text>
              </View>
            )}
            <Text style={styles.description} numberOfLines={3}>
              {pickedMovie.description}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label="Watched it"
            icon={<Check size={16} color="#FFFFFF" strokeWidth={3} />}
            onPress={markWatched}
            style={styles.mainButton}
            contentStyle={styles.buttonContent}
          />
          <Pressable
            style={styles.roundButton}
            onPress={openTrailer}
            hitSlop={4}
            accessibilityLabel="Watch the trailer"
          >
            <Play
              size={16}
              color={colors.textPrimary}
              fill={colors.textPrimary}
            />
          </Pressable>
          <Pressable
            style={styles.roundButton}
            onPress={swap}
            hitSlop={4}
            accessibilityLabel="Swap for another movie"
          >
            <Shuffle size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      </MarqueeSign>
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    dismiss: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSoft,
    },
    body: {
      flexDirection: "row",
      gap: spacing.md,
    },
    poster: {
      width: 104,
      aspectRatio: 2 / 3,
    },
    info: {
      flex: 1,
      gap: 4,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
    },
    metaText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    reasonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    reasonText: {
      ...typography.caption,
      flexShrink: 1,
    },
    description: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 17,
      marginTop: spacing.xs,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    mainButton: {
      flex: 1,
    },
    buttonContent: {
      paddingVertical: 10,
    },
    roundButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
    },
  });

export default TonightsPickCard;

import { Bookmark, Check, Layers, Star } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { giveWatchedFeedback } from "../utils/achievementFeedback";
import {
  getCollectionProgress,
  getCollectionsForMovie,
} from "../utils/collections";
import { formatRuntime } from "../utils/movieFilters";
import { TargetIcon } from "./icons/TabIcons";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";

// Tonight's Pick: the movie, why it was picked, and two outcomes —
// watched it, or cancel the pick. Tapping the card opens the movie.
// Renders nothing when there's no real pick, by design.
export const TonightsPickCard = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const clearPickedMovie = useMovieStore((state) => state.clearPickedMovie);
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);

  const pickedMovie = pickedMovieId ? getMovieById(pickedMovieId) : null;
  if (!pickedMovie) return null;

  const watchedIds = new Set(watched.map((entry) => entry.movieId));

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
          text: `Your active challenge · +${activeChallenge.xpReward} XP`,
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
    giveWatchedFeedback(pickedMovie.id, watchedBefore, bucketListBefore);
    openDetails();
  };

  return (
    <Pressable style={styles.card} onPress={openDetails}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>TONIGHT&apos;S PICK</Text>
        <View style={styles.imdbRow}>
          <Star size={12} color={colors.rating} fill={colors.rating} />
          <Text style={styles.imdbText}>{pickedMovie.rating.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <MoviePoster
          uri={pickedMovie.poster}
          radius={radius.md}
          style={styles.poster}
        />
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
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Watched"
          icon={<Check size={16} color="#FFFFFF" strokeWidth={3} />}
          onPress={markWatched}
          style={styles.mainButton}
          contentStyle={styles.buttonContent}
        />
        <PrimaryButton
          label="Cancel"
          variant="secondary"
          onPress={clearPickedMovie}
          style={styles.mainButton}
          contentStyle={styles.buttonContent}
        />
      </View>
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardElevated,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    eyebrow: {
      ...typography.label,
      color: colors.accentLight,
    },
    imdbRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    imdbText: {
      ...typography.label,
      color: colors.rating,
    },
    body: {
      flexDirection: "row",
      gap: spacing.md,
      marginTop: spacing.md,
    },
    poster: {
      width: 80,
      aspectRatio: 2 / 3,
    },
    info: {
      flex: 1,
      justifyContent: "center",
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
      marginTop: 2,
    },
    reasonText: {
      ...typography.caption,
      flexShrink: 1,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    mainButton: {
      flex: 1,
    },
    buttonContent: {
      paddingVertical: 10,
    },
  });

export default TonightsPickCard;

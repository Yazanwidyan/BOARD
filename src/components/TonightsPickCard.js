import { Pressable, StyleSheet, Text, View } from "react-native";
import { Star } from "lucide-react-native";

import { getMovieById } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { giveWatchedFeedback } from "../utils/achievementFeedback";
import { formatRuntime } from "../utils/movieFilters";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";

// Same nested double-card "frame" as the Collections "Continue" card. A
// poster + info panel instead of a full-bleed backdrop with text over it —
// no photo-as-background means no scrim/gradient/shadow juggling to keep
// the title legible, and it reuses the same rating-badge treatment every
// other poster in the app already has. Renders nothing when there's no
// real pick, by design.
const FRAME_PADDING = 4;

export const TonightsPickCard = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const watched = useMovieStore((state) => state.watched);

  const pickedMovie = pickedMovieId ? getMovieById(pickedMovieId) : null;
  if (!pickedMovie) return null;

  const userRating = watched.find(
    (entry) => entry.movieId === pickedMovie.id,
  )?.rating;

  return (
    <View style={styles.frame}>
      <Pressable
        style={styles.card}
        onPress={() =>
          navigation.navigate("MovieDetails", { movieId: pickedMovie.id })
        }
      >
        <View style={styles.posterWrap}>
          <MoviePoster
            uri={pickedMovie.poster}
            radius={radius.md}
            style={styles.poster}
          />
          <View style={styles.imdbBadge}>
            <Star size={10} color={colors.rating} fill={colors.rating} />
            <Text style={styles.imdbBadgeText}>
              {pickedMovie.rating.toFixed(1)}
            </Text>
          </View>
          {userRating != null && (
            <View style={styles.userRatingBadge}>
              <Star
                size={10}
                color={colors.accentContrast}
                fill={colors.accentContrast}
              />
              <Text style={styles.userRatingBadgeText}>
                {userRating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.eyebrow}>TONIGHT&apos;S PICK</Text>
          <Text style={styles.title} numberOfLines={3}>
            {pickedMovie.title}
          </Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {pickedMovie.year} · {formatRuntime(pickedMovie.runtime)} ·{" "}
            {pickedMovie.genres[0]}
          </Text>
          <PrimaryButton
            label="Mark as Watched"
            dense
            onPress={() => {
              const { watched: watchedBefore, bucketList: bucketListBefore } =
                useMovieStore.getState();
              toggleWatched(pickedMovie.id);
              giveWatchedFeedback(pickedMovie.id, watchedBefore, bucketListBefore);
              navigation.navigate("MovieDetails", { movieId: pickedMovie.id });
            }}
            style={styles.actionButton}
          />
        </View>
      </Pressable>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    frame: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: FRAME_PADDING,
    },
    card: {
      flexDirection: "row",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      overflow: "hidden",
      backgroundColor: colors.cardElevatedLight,
    },
    posterWrap: {
      width: 108,
    },
    poster: {
      width: 108,
      aspectRatio: 2 / 3,
    },
    info: {
      flex: 1,
      justifyContent: "center",
      gap: 4,
    },
    eyebrow: {
      ...typography.label,
      color: colors.accentLight,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
    },
    metaText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    actionButton: {
      alignSelf: "flex-start",
      marginTop: spacing.md,
    },
    imdbBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: "rgba(2, 0, 2, 0.65)",
    },
    imdbBadgeText: {
      ...typography.label,
      fontSize: 10,
      color: colors.rating,
    },
    userRatingBadge: {
      position: "absolute",
      top: 6,
      left: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    userRatingBadgeText: {
      ...typography.label,
      fontSize: 10,
      color: colors.accentContrast,
    },
  });

export default TonightsPickCard;

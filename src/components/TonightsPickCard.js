import { LinearGradient } from "expo-linear-gradient";
import { Eye, Flame } from "lucide-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { giveWatchedFeedback } from "../utils/achievementFeedback";
import { getMood } from "../utils/moods";
import { formatRuntime } from "../utils/movieFilters";
import { getPickInsight } from "../utils/tonightPick";
import { countFinishedDares } from "../utils/useRanks";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";
import { t } from "../i18n";

const POSTER_WIDTH = 108;

// Tonight's Pick, the card that follows "Your 3 for tonight": the film's
// backdrop fading into a rounded card; "Tonight's pick" and Change (back to
// choosing); the poster beside its title, year · genre · length (and age
// rating), where it came from and what it's about; then Watched, the main
// button. Tapping the poster or its words opens the movie. Renders nothing
// when there's no pick.
export const TonightsPickCard = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const clearPickedMovie = useMovieStore((state) => state.clearPickedMovie);
  const pickMood = useMovieStore((state) => state.pickMood);
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);
  const history = useChallengeStore((state) => state.history);
  const dares = countFinishedDares(history);

  const movie = pickedMovieId ? getMovieById(pickedMovieId) : null;
  if (!movie) return null;

  // Only counts if it was made for this exact pick (see movieStore).
  const mood = pickMood?.movieId === movie.id ? getMood(pickMood.mood) : null;

  const insight = getPickInsight(movie, watched, dares);
  // Where it came from, or what it does for you — the most specific wins.
  const tag =
    activeChallenge?.targetMovieId === movie.id
      ? { text: t("Your active dare"), color: colors.dare }
      : mood
        ? { text: `${mood.emoji} ${t(mood.label)}` }
        : insight.forecast.gained.length > 0
          ? { text: t("Earns a rank tonight"), color: colors.rating }
          : insight.saga?.type === "rank" || insight.saga?.type === "progress"
            ? { text: t("Next in a collection"), color: colors.collection }
            : bucketList.some((entry) => entry.movieId === movie.id)
              ? { text: t("On your watchlist") }
              : null;
  const meta = [
    movie.year,
    movie.genres?.[0] && t(movie.genres[0]),
    movie.runtime ? formatRuntime(movie.runtime) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const rated = movie.details?.rated;

  const openDetails = () => navigation.navigate("MovieDetails", { movieId: movie.id });

  const markWatched = () => {
    const { watched: watchedBefore, bucketList: bucketListBefore } = useMovieStore.getState();
    toggleWatched(movie.id);
    // Stays on Home — the achievement dialog is the confirmation, and
    // the card itself goes away since the pick is now watched.
    giveWatchedFeedback(movie.id, watchedBefore, bucketListBefore);
  };

  return (
    <Animated.View key={movie.id} entering={FadeIn.duration(260)} style={styles.card}>
      {/* The film's backdrop (or its poster, blurred), fading into the card. */}
      <Image
        source={{ uri: movie.backdrop ?? movie.poster }}
        blurRadius={movie.backdrop ? 2 : 30}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[`${colors.card}66`, `${colors.card}D9`, colors.card]}
        locations={[0, 0.45, 0.8]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.head}>
        <View style={styles.eyebrow}>
          <Flame size={14} color={colors.textPrimary} fill={colors.textPrimary} strokeWidth={2} />
          <Text style={styles.eyebrowText}>{t("Tonight's pick")}</Text>
        </View>
        <Pressable onPress={clearPickedMovie} hitSlop={10} accessibilityRole="button" accessibilityHint={t("Back to choosing")}>
          <Text style={styles.change}>{t("Change")}</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        onPress={openDetails}
        accessibilityRole="button"
        accessibilityLabel={[movie.title, meta].filter(Boolean).join(", ")}
      >
        <MoviePoster uri={movie.poster} style={styles.poster} shadow />
        <View style={styles.words}>
          <Text style={styles.title} numberOfLines={2}>
            {movie.title}
          </Text>
          {(!!meta || !!rated) && (
            <View style={styles.metaRow}>
              {!!meta && (
                <Text style={styles.meta} numberOfLines={1}>
                  {meta}
                </Text>
              )}
              {!!rated && (
                <View style={styles.rated}>
                  <Text style={styles.ratedText}>{rated}</Text>
                </View>
              )}
            </View>
          )}
          {!!tag && (
            <View style={[styles.tag, tag.color && { borderColor: tag.color }]}>
              <Text style={[styles.tagText, tag.color && { color: tag.color }]} numberOfLines={1}>
                {tag.text}
              </Text>
            </View>
          )}
          {!!movie.description && (
            <Text style={styles.description} numberOfLines={3}>
              {movie.description}
            </Text>
          )}
        </View>
      </Pressable>

      <PrimaryButton
        label={t("Watched")}
        icon={<Eye size={18} color={colors.brandText} strokeWidth={2} />}
        onPress={markWatched}
        style={styles.main}
        contentStyle={styles.mainContent}
      />
    </Animated.View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      overflow: "hidden",
    },
    pressed: {
      opacity: 0.8,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    eyebrow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    eyebrowText: {
      ...typography.section,
      color: colors.textPrimary,
    },
    change: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    // The poster beside its words.
    body: {
      flexDirection: "row",
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    poster: {
      width: POSTER_WIDTH,
      aspectRatio: 2 / 3,
    },
    words: {
      flex: 1,
      gap: 6,
      justifyContent: "flex-end",
    },
    title: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 25,
      color: colors.textPrimary,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    meta: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    rated: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 4,
    },
    ratedText: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textSecondary,
    },
    // Where it came from: an outlined pill, in its feature's colour.
    tag: {
      alignSelf: "flex-start",
      maxWidth: "100%",
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 3,
      borderRadius: shape.chip,
      borderWidth: 1,
      borderColor: `${colors.textPrimary}47`,
    },
    tagText: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textPrimary,
    },
    description: {
      ...typography.body,
      fontSize: 12.5,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    main: {
      marginTop: spacing.md + 2,
    },
    mainContent: {
      minHeight: 48,
      borderRadius: shape.control,
    },
  });

export default TonightsPickCard;

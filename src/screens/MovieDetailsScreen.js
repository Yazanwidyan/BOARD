import {
  Linking,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  Clapperboard,
  Play,
  Star,
} from "lucide-react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useColors } from "../theme/useColors";
import { typography } from "../theme/typography";
import { radius, spacing } from "../theme/spacing";
import { PrimaryButton } from "../components/PrimaryButton";
import { MoviePoster } from "../components/MoviePoster";
import { RatingInput } from "../components/RatingInput";
import { BackButton } from "../components/BackButton";
import { getMovieById, MOVIES } from "../data/movies";
import { formatRuntime } from "../utils/movieFilters";
import { useMovieStore } from "../store/movieStore";

const POSTER_WIDTH = 116;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const POSTER_OVERLAP = POSTER_HEIGHT * 0.4;
const STICKY_BAR_HEIGHT = 52;

export const MovieDetailsScreen = ({ route, navigation }) => {
  const { movieId } = route.params;
  const movie = getMovieById(movieId);
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const inBucketList = useMovieStore((state) =>
    state.bucketList.includes(movieId),
  );
  const toggleBucketList = useMovieStore((state) => state.toggleBucketList);
  const watchedEntry = useMovieStore((state) =>
    state.watched.find((entry) => entry.movieId === movieId),
  );
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const setWatchedRating = useMovieStore((state) => state.setWatchedRating);
  const isPicked = useMovieStore((state) => state.pickedMovie === movieId);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const isWatched = !!watchedEntry;

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  if (!movie) {
    return null;
  }

  // No per-movie trailer id in the dataset yet, so this opens a YouTube
  // search for it rather than playing anything in-app.
  const handleWatchTrailer = () => {
    const query = encodeURIComponent(`${movie.title} ${movie.year} trailer`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
  };

  const backdropHeight = height * 0.4;
  // The sticky bar fades in over the last stretch of the backdrop's own
  // scroll range, so it's fully opaque right as the backdrop (and its own
  // back button) scrolls out from under the status bar.
  const stickyStart = backdropHeight - insets.top - STICKY_BAR_HEIGHT - 20;
  const stickyEnd = backdropHeight - insets.top;

  const stickyBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [stickyStart, stickyEnd],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        bounces={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.backdrop, { height: backdropHeight }]}>
          <MoviePoster uri={movie.poster} radius={0} style={styles.backdropBg} />
          <View style={styles.backdropScrim} />
          <LinearGradient
            colors={["transparent", colors.background]}
            style={styles.backdropFade}
          />

          <SafeAreaView edges={["top"]} style={styles.backdropTopRow}>
            <BackButton onPress={() => navigation.goBack()} />
          </SafeAreaView>
        </View>

        <View style={styles.posterRow}>
          <MoviePoster
            uri={movie.poster}
            style={styles.poster}
            radius={radius.md}
            shadow
          />
          <View style={styles.titleBlock}>
            <Text style={styles.rank} numberOfLines={1}>
              #{movie.rank} IN TOP {MOVIES.length}
            </Text>
            <Text style={styles.title} numberOfLines={3}>
              {movie.title}
            </Text>
            <Text style={styles.meta}>
              {movie.year} &middot; {formatRuntime(movie.runtime)}
            </Text>
            <View style={styles.chipsRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{movie.genres[0]}</Text>
              </View>
              <View style={styles.chip}>
                <Star size={11} color={colors.textPrimary} fill={colors.textPrimary} />
                <Text style={styles.chipText}>{movie.rating.toFixed(1)}</Text>
              </View>
              {isPicked && (
                <View style={[styles.chip, styles.pickedChip]}>
                  <Clapperboard size={11} color={colors.success} />
                  <Text style={[styles.chipText, { color: colors.success }]}>
                    PICKED
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <PrimaryButton
            label="Watch Trailer"
            variant="outline"
            icon={<Play size={16} color={colors.textPrimary} fill={colors.textPrimary} />}
            onPress={handleWatchTrailer}
            style={styles.button}
          />

          <Text style={styles.sectionLabel}>Director</Text>
          <Text style={styles.director}>{movie.director}</Text>

          <Text style={styles.sectionLabel}>Overview</Text>
          <Text style={styles.description}>{movie.description}</Text>

          <View style={styles.buttons}>
            {!isWatched && (
              <View style={styles.secondaryRow}>
                <PrimaryButton
                  label={inBucketList ? "In Watchlist" : "Watchlist"}
                  variant={inBucketList ? "secondary" : "outline"}
                  icon={
                    inBucketList ? (
                      <BookmarkCheck size={16} color={colors.textPrimary} />
                    ) : (
                      <Bookmark size={16} color={colors.textPrimary} />
                    )
                  }
                  onPress={() => toggleBucketList(movie.id)}
                  style={styles.secondaryButton}
                />
                <PrimaryButton
                  label={isPicked ? "Tonight's Pick" : "Pick for Tonight"}
                  variant={isPicked ? "secondary" : "outline"}
                  icon={
                    <Clapperboard
                      size={16}
                      color={isPicked ? colors.success : colors.textPrimary}
                    />
                  }
                  onPress={() => togglePickedMovie(movie.id)}
                  style={styles.secondaryButton}
                />
              </View>
            )}

            <PrimaryButton
              label={isWatched ? "Watched" : "Mark as Watched"}
              variant={isWatched ? "secondary" : "primary"}
              icon={
                isWatched ? (
                  <CheckCircle
                    size={18}
                    color={colors.success}
                    fill="transparent"
                  />
                ) : undefined
              }
              onPress={() => toggleWatched(movie.id)}
              style={styles.button}
            />

            {!isWatched && isPicked && (
              <Text style={styles.noteText}>
                Marking as watched will clear it as tonight&apos;s pick.
              </Text>
            )}

            {isWatched && (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Your rating</Text>
                <RatingInput
                  rating={watchedEntry.rating}
                  onRate={(rating) => setWatchedRating(movie.id, rating)}
                />
              </View>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      {/* Fades in once the backdrop's own back button scrolls out from under
          the status bar, so there's always exactly one visible way back. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.stickyBar,
          { height: insets.top + STICKY_BAR_HEIGHT, paddingTop: insets.top },
          stickyBarStyle,
        ]}
      >
        <BackButton onPress={() => navigation.goBack()} size={36} />
        <Text style={styles.stickyTitle} numberOfLines={1}>
          {movie.title}
        </Text>
      </Animated.View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    backdrop: {
      width: "100%",
    },
    backdropBg: {
      ...StyleSheet.absoluteFillObject,
    },
    backdropScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(2, 0, 2, 0.4)",
    },
    backdropFade: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "70%",
    },
    backdropTopRow: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    posterRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      marginTop: -POSTER_OVERLAP,
    },
    poster: {
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
    },
    titleBlock: {
      flex: 1,
      paddingBottom: spacing.xs,
    },
    rank: {
      ...typography.label,
      color: colors.textSecondary,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: 2,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    pickedChip: {
      backgroundColor: colors.successSoft,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 11,
      color: colors.textPrimary,
    },
    content: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    director: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    description: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    buttons: {
      marginTop: spacing.xl,
      gap: spacing.sm,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    ratingLabel: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    button: {
      width: "100%",
    },
    secondaryRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    secondaryButton: {
      flex: 1,
    },
    noteText: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: -spacing.xs,
    },
    stickyBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.background,
    },
    stickyTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
      flex: 1,
    },
  });

export default MovieDetailsScreen;

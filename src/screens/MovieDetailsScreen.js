import { LinearGradient } from "expo-linear-gradient";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  Clapperboard,
  Play,
  Share2,
  Star,
} from "lucide-react-native";
import { useState } from "react";
import {
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { RatingInput } from "../components/RatingInput";
import { MOVIES, getMovieById } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";

const POSTER_WIDTH = 108;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const POSTER_OVERLAP = POSTER_HEIGHT * 0.42;
const STICKY_BAR_HEIGHT = 52;
const DESCRIPTION_LINES = 4;

export const MovieDetailsScreen = ({ route, navigation }) => {
  const { movieId } = route.params;
  const movie = getMovieById(movieId);
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
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

  const handleShare = () => {
    Share.share({
      message: `Check out ${movie.title} (${movie.year}) on URWatch — rated ${movie.rating.toFixed(1)}.`,
    });
  };

  const heroHeight = height * 0.44;
  // Pulling down past the top overscrolls the outer ScrollView into
  // negative territory; growing the cover to match keeps it covering that
  // gap instead of the screen background showing through above it.
  const stretchStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-heroHeight, 0],
          [-heroHeight / 2, 0],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          scrollY.value,
          [-heroHeight, 0],
          [2, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // The sticky bar fades in over the last stretch of the hero's own scroll
  // range, so it's fully opaque right as the hero (and its own back button)
  // scrolls out from under the status bar.
  const stickyStart = heroHeight - insets.top - STICKY_BAR_HEIGHT - 20;
  const stickyEnd = heroHeight - insets.top;

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
        bounces
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          <Animated.View style={[StyleSheet.absoluteFillObject, stretchStyle]}>
            <MoviePoster
              uri={movie.backdrop}
              radius={0}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <View style={styles.heroScrim} />
          <LinearGradient
            colors={["transparent", "rgba(2, 0, 2, 0.55)", colors.background]}
            locations={[0, 0.55, 1]}
            style={styles.heroGradient}
          />

          <View
            style={[styles.heroTopRow, { paddingTop: insets.top + spacing.sm }]}
          >
            <BackButton onPress={() => navigation.goBack()} />
            <View style={styles.heroIconGroup}>
              {!isWatched && (
                <Pressable
                  style={styles.heroIconButton}
                  onPress={() => toggleBucketList(movie.id)}
                  hitSlop={6}
                >
                  {inBucketList ? (
                    <BookmarkCheck size={18} color={colors.success} />
                  ) : (
                    <Bookmark size={18} color="#FFFFFF" />
                  )}
                </Pressable>
              )}
              <Pressable
                style={styles.heroIconButton}
                onPress={handleShare}
                hitSlop={6}
              >
                <Share2 size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.posterRow}>
          <View>
            <MoviePoster
              uri={movie.poster}
              style={styles.poster}
              radius={radius.sm}
              shadow
            />
            <View style={styles.imdbBadge}>
              <Star size={10} color={colors.rating} fill={colors.rating} />
              <Text style={styles.imdbBadgeText}>
                {movie.rating.toFixed(1)}
              </Text>
            </View>
            {isWatched && watchedEntry.rating != null && (
              <View style={styles.userRatingBadge}>
                <Star
                  size={10}
                  color={colors.accentContrast}
                  fill={colors.accentContrast}
                />
                <Text style={styles.userRatingBadgeText}>
                  {watchedEntry.rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.rank} numberOfLines={1}>
              #{movie.rank} IN TOP {MOVIES.length}
            </Text>
            <Text style={styles.title} numberOfLines={3}>
              {movie.title}
            </Text>
            <Text style={styles.director} numberOfLines={1}>
              Directed by {movie.director}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{movie.year}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {formatRuntime(movie.runtime)}
              </Text>
            </View>
            {movie.genres.map((genre) => (
              <View key={genre} style={styles.chip}>
                <Text style={styles.chipText}>{genre}</Text>
              </View>
            ))}
          </View>

          {!isWatched && (
            <Pressable
              style={[styles.pickPill, isPicked && styles.pickPillActive]}
              onPress={() => togglePickedMovie(movie.id)}
            >
              <Clapperboard
                size={15}
                color={isPicked ? colors.success : colors.textSecondary}
              />
              <Text
                style={[
                  styles.pickPillText,
                  isPicked && styles.pickPillTextActive,
                ]}
              >
                {isPicked ? "Tonight's Pick" : "Set as Tonight's Pick"}
              </Text>
            </Pressable>
          )}

          <View style={styles.ctaRow}>
            <Pressable
              style={styles.trailerButton}
              onPress={handleWatchTrailer}
            >
              <Play
                size={20}
                color={colors.textPrimary}
                fill={colors.textPrimary}
              />
            </Pressable>
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
              style={styles.watchedButton}
            />
          </View>

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

          <Text style={styles.sectionLabel}>Overview</Text>
          <Text
            style={styles.description}
            numberOfLines={expanded ? undefined : DESCRIPTION_LINES}
            onTextLayout={(event) => {
              if (
                !expanded &&
                event.nativeEvent.lines.length >= DESCRIPTION_LINES
              ) {
                setCanExpand(true);
              }
            }}
          >
            {movie.description}
          </Text>
          {canExpand && (
            <Pressable
              onPress={() => setExpanded((value) => !value)}
              hitSlop={6}
            >
              <Text style={styles.moreText}>
                {expanded ? "Show less" : "Read more"}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.ScrollView>

      {/* Fades in once the hero's own back button scrolls out from under
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
    hero: {
      width: "100%",
      backgroundColor: colors.card,
    },
    heroScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(2, 0, 2, 0.4)",
    },
    heroGradient: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "85%",
    },
    heroTopRow: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      // Explicit stacking so it's guaranteed to paint above the hero
      // image/scrim/gradient siblings, matching the header pattern used on
      // SwipeScreen for the same "controls over a photo" case.
      zIndex: 10,
      elevation: 10,
    },
    heroIconGroup: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    heroIconButton: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
      borderWidth: 1,
      borderColor: colors.border,
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
    titleBlock: {
      flex: 1,
      paddingBottom: spacing.xs,
    },
    rank: {
      ...typography.label,
      color: colors.textSecondary,
    },
    title: {
      ...typography.hero,
      color: colors.textPrimary,
      marginTop: 2,
    },
    director: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    content: {
      paddingHorizontal: spacing.md,
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.sm,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 11,
      color: colors.textPrimary,
    },
    pickPill: {
      flexDirection: "row",
      alignSelf: "flex-start",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: "transparent",
    },
    pickPillActive: {
      borderColor: colors.success,
      backgroundColor: colors.successSoft,
    },
    pickPillText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    pickPillTextActive: {
      color: colors.success,
    },
    ctaRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    trailerButton: {
      width: 54,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    watchedButton: {
      flex: 1,
    },
    noteText: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.sm,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      marginTop: spacing.md,
    },
    ratingLabel: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginTop: spacing.xl,
      marginBottom: spacing.xs,
    },
    description: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    moreText: {
      ...typography.bodyBold,
      color: colors.accentLight,
      marginTop: spacing.xs,
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

import { LinearGradient } from "expo-linear-gradient";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  ChevronRight,
  Clapperboard,
  Play,
  RotateCw,
  Share2,
  Star,
} from "lucide-react-native";
import { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
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
import { TargetIcon } from "../components/icons/TabIcons";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { RatingInput } from "../components/RatingInput";
import { MOVIES, getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  giveRatingFeedback,
  giveWatchedFeedback,
  rewatchMovieWithFeedback,
  toggleBucketListWithFeedback,
} from "../utils/achievementFeedback";
import {
  getCollectionProgress,
  getCollectionsForMovie,
} from "../utils/collections";
import { formatRuntime, isInBucketList } from "../utils/movieFilters";

const POSTER_WIDTH = 168;
const HEADER_BAR_HEIGHT = 40;
const STICKY_BAR_HEIGHT = 52;
const DESCRIPTION_LINES = 4;
const SIMILAR_COUNT = 10;

// Same director first (closest match), then same lead genre, best-rated
// first within each — so the rail always has something even for a
// one-film director.
const getSimilarMovies = (movie) => {
  const byRating = (a, b) => b.rating - a.rating;
  const others = MOVIES.filter((other) => other.id !== movie.id);
  const sameDirector = others
    .filter((other) => other.director === movie.director)
    .sort(byRating);
  const sameGenre = others
    .filter(
      (other) =>
        other.director !== movie.director &&
        other.genres[0] === movie.genres[0],
    )
    .sort(byRating);
  return [...sameDirector, ...sameGenre].slice(0, SIMILAR_COUNT);
};

// One button of the action dock — icon over a short label, lit in accent
// when its state is "on" (on the watchlist, set as tonight's pick).
const DockButton = ({ icon, label, active, onPress, styles }) => (
  <Pressable
    style={[styles.dockButton, active && styles.dockButtonActive]}
    onPress={onPress}
  >
    {icon}
    <Text
      style={[styles.dockLabel, active && styles.dockLabelActive]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </Pressable>
);

// Poster stage (the real poster, large and centered on the same accent
// gradient as Collection Details — the per-movie backdrops are stock
// placeholders, so they're no longer used) → one primary "Mark as Watched"
// plus an action dock for everything else → context that only shows when
// it applies (active challenge, your rating) → overview → the collections
// it's part of → more like this.
export const MovieDetailsScreen = ({ route, navigation }) => {
  const { movieId } = route.params;
  const movie = getMovieById(movieId);
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const inBucketList = useMovieStore((state) =>
    isInBucketList(state.bucketList, movieId),
  );
  const watched = useMovieStore((state) => state.watched);
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const setWatchedRating = useMovieStore((state) => state.setWatchedRating);
  const isPicked = useMovieStore((state) => state.pickedMovie === movieId);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);

  // All hooks run before the `!movie` early return below, so the hook
  // order never changes between renders.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const stickyStart = 280;
  const stickyEnd = 340;
  const stickyBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [stickyStart, stickyEnd],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  if (!movie) {
    return null;
  }

  const watchedEntry = watched.find((entry) => entry.movieId === movieId);
  const isWatched = !!watchedEntry;
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const isChallengeTarget = activeChallenge?.targetMovieId === movieId;
  const collections = getCollectionsForMovie(movieId);
  const similarMovies = getSimilarMovies(movie);

  const handleToggleWatched = () => {
    const wasWatched = isWatched;
    const { watched: watchedBefore, bucketList: bucketListBefore } =
      useMovieStore.getState();
    toggleWatched(movieId);
    if (!wasWatched) {
      giveWatchedFeedback(movieId, watchedBefore, bucketListBefore);
    }
  };

  const handleRate = (rating) => {
    const { watched: watchedBefore } = useMovieStore.getState();
    setWatchedRating(movieId, rating);
    giveRatingFeedback(watchedBefore);
  };

  const handleWatchTrailer = () => {
    const query = encodeURIComponent(`${movie.title} ${movie.year} trailer`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
  };

  const handleShare = () => {
    Share.share({
      message: `Check out ${movie.title} (${movie.year}) on BOARD — rated ${movie.rating.toFixed(1)}.`,
    });
  };

  const headerTop = insets.top + spacing.sm;
  const iconColor = (active) =>
    active ? colors.accentLight : colors.textPrimary;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.stage,
            { paddingTop: headerTop + HEADER_BAR_HEIGHT + spacing.md },
          ]}
        >
          <LinearGradient
            colors={["rgba(141, 96, 226, 0.28)", colors.background]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View>
            <MoviePoster
              uri={movie.poster}
              style={styles.poster}
              radius={radius.md}
              shadow
            />
            <View style={styles.imdbBadge}>
              <Star size={11} color={colors.rating} fill={colors.rating} />
              <Text style={styles.imdbBadgeText}>
                {movie.rating.toFixed(1)}
              </Text>
            </View>
            {watchedEntry?.rating != null && (
              <View style={styles.userRatingBadge}>
                <Star
                  size={11}
                  color={colors.accentContrast}
                  fill={colors.accentContrast}
                />
                <Text style={styles.userRatingBadgeText}>
                  {watchedEntry.rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{movie.title}</Text>
          <Text style={styles.director} numberOfLines={1}>
            {movie.director} · {movie.year}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatRuntime(movie.runtime)} · {movie.genres.join(" · ")}
          </Text>
        </View>

        <View style={styles.content}>
          <PrimaryButton
            label={isWatched ? "Watched" : "Mark as Watched"}
            variant={isWatched ? "secondary" : "primary"}
            icon={
              isWatched ? (
                <CheckCircle size={18} color={colors.success} />
              ) : null
            }
            onPress={handleToggleWatched}
          />
          {!isWatched && isPicked && (
            <Text style={styles.noteText}>
              Marking as watched will clear it as tonight&apos;s pick.
            </Text>
          )}

          <View style={styles.dock}>
            {!isWatched && (
              <DockButton
                styles={styles}
                active={inBucketList}
                label={inBucketList ? "Saved" : "Watchlist"}
                onPress={() => toggleBucketListWithFeedback(movie.id)}
                icon={
                  inBucketList ? (
                    <BookmarkCheck size={20} color={iconColor(true)} />
                  ) : (
                    <Bookmark size={20} color={iconColor(false)} />
                  )
                }
              />
            )}
            {!isWatched && (
              <DockButton
                styles={styles}
                active={isPicked}
                label="Tonight"
                onPress={() => togglePickedMovie(movie.id)}
                icon={<Clapperboard size={20} color={iconColor(isPicked)} />}
              />
            )}
            <DockButton
              styles={styles}
              label="Trailer"
              onPress={handleWatchTrailer}
              icon={
                <Play
                  size={20}
                  color={colors.textPrimary}
                  fill={colors.textPrimary}
                />
              }
            />
            {isWatched && (
              <DockButton
                styles={styles}
                label="Rewatch"
                onPress={() => rewatchMovieWithFeedback(movieId)}
                icon={<RotateCw size={20} color={colors.textPrimary} />}
              />
            )}
          </View>

          {isChallengeTarget && (
            <View style={styles.challengeBanner}>
              <TargetIcon size={18} color={colors.accentContrast} />
              <View style={styles.bannerText}>
                <Text style={styles.challengeEyebrow}>
                  ACTIVE CHALLENGE · +{activeChallenge.xpReward} XP
                </Text>
                <Text style={styles.challengeDescription} numberOfLines={2}>
                  {activeChallenge.description}
                </Text>
              </View>
            </View>
          )}

          {isWatched && (
            <View style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <Text style={styles.sectionLabelInline}>Your rating</Text>
                <Text style={styles.watchCount}>
                  Watched {watchedEntry.watchCount ?? 1}×
                </Text>
              </View>
              <RatingInput rating={watchedEntry.rating} onRate={handleRate} />
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

        {collections.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, styles.railLabel]}>Part of</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railContent}
            >
              {collections.map((collection) => {
                const { watchedCount, total, progress } = getCollectionProgress(
                  collection,
                  watchedIds,
                );
                return (
                  <Pressable
                    key={collection.id}
                    style={styles.collectionChip}
                    onPress={() =>
                      navigation.push("CollectionDetails", {
                        collectionId: collection.id,
                      })
                    }
                  >
                    <View style={styles.collectionChipHeader}>
                      <Text
                        style={styles.collectionChipTitle}
                        numberOfLines={1}
                      >
                        {collection.title}
                      </Text>
                      <ChevronRight size={14} color={colors.textSecondary} />
                    </View>
                    <View style={styles.chipTrack}>
                      <View
                        style={[
                          styles.chipFill,
                          { width: `${progress * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.collectionChipStat}>
                      {watchedCount} / {total} watched
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {similarMovies.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, styles.railLabel]}>
              More Like This
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railContent}
            >
              {similarMovies.map((similar) => (
                <Pressable
                  key={similar.id}
                  style={styles.similarCard}
                  onPress={() =>
                    navigation.push("MovieDetails", { movieId: similar.id })
                  }
                >
                  <MoviePoster
                    uri={similar.poster}
                    radius={radius.xs}
                    style={styles.similarPoster}
                  />
                  <Text style={styles.similarTitle} numberOfLines={1}>
                    {similar.title}
                  </Text>
                  <Text style={styles.similarYear}>{similar.year}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </Animated.ScrollView>

      <View
        style={[styles.headerBar, { top: headerTop }]}
        pointerEvents="box-none"
      >
        <BackButton onPress={() => navigation.goBack()} />
        <Pressable
          style={styles.headerIconButton}
          onPress={handleShare}
          hitSlop={6}
        >
          <Share2 size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Fades in once the poster scrolls away, so there's always a title
          and a way back on screen. */}
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
    headerBar: {
      position: "absolute",
      left: spacing.md,
      right: spacing.md,
      height: HEADER_BAR_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerIconButton: {
      width: HEADER_BAR_HEIGHT,
      height: HEADER_BAR_HEIGHT,
      borderRadius: HEADER_BAR_HEIGHT / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stage: {
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
    },
    poster: {
      width: POSTER_WIDTH,
      aspectRatio: 2 / 3,
    },
    imdbBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: colors.scrim,
    },
    imdbBadgeText: {
      ...typography.label,
      fontSize: 11,
      color: colors.rating,
    },
    userRatingBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    userRatingBadgeText: {
      ...typography.label,
      fontSize: 11,
      color: colors.accentContrast,
    },
    title: {
      ...typography.hero,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.md,
    },
    director: {
      ...typography.bodyBold,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    meta: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 2,
    },
    content: {
      paddingHorizontal: spacing.md,
    },
    noteText: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    dock: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    dockButton: {
      flex: 1,
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: "transparent",
    },
    dockButtonActive: {
      backgroundColor: "rgba(141, 96, 226, 0.16)",
      borderColor: colors.accent,
    },
    dockLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    dockLabelActive: {
      color: colors.accentLight,
    },
    challengeBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    bannerText: {
      flex: 1,
    },
    challengeEyebrow: {
      ...typography.label,
      color: colors.accentContrast,
    },
    challengeDescription: {
      ...typography.caption,
      color: "rgba(255, 255, 255, 0.85)",
      marginTop: 2,
    },
    ratingCard: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
      gap: spacing.sm,
    },
    ratingHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionLabelInline: {
      ...typography.label,
      color: colors.textSecondary,
    },
    watchCount: {
      ...typography.caption,
      color: colors.textMuted,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
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
    railLabel: {
      paddingHorizontal: spacing.md,
    },
    railContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    collectionChip: {
      width: 180,
      padding: spacing.sm + 2,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    collectionChipHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    collectionChipTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      flex: 1,
    },
    chipTrack: {
      height: 4,
      borderRadius: 2,
      marginTop: spacing.sm,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
    },
    chipFill: {
      height: "100%",
      backgroundColor: colors.accentLight,
    },
    collectionChipStat: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },
    similarCard: {
      width: 100,
    },
    similarPoster: {
      width: 100,
      aspectRatio: 2 / 3,
    },
    similarTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    similarYear: {
      ...typography.caption,
      color: colors.textSecondary,
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

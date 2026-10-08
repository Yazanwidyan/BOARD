import { LinearGradient } from "expo-linear-gradient";
import { Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../components/AppText";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { MovieGrid } from "../components/MovieGrid";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { openShareCard } from "../store/shareCardStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  useHeroFadeStyle,
  useStretchyBackdropStyle,
} from "../utils/scrollEffects";
import {
  getCollectionById,
  getCollectionCompletedAt,
  getCollectionProgress,
} from "../utils/collections";
import { formatRuntime } from "../utils/movieFilters";
import { shuffle } from "../utils/shuffle";
import { t } from "../i18n";

const TYPE_LABELS = {
  franchise: "Franchise",
  director: "Director",
  actor: "Actor",
  decade: "Decade",
  genre: "Genre",
};

const HEADER_BAR_HEIGHT = 40;
const MARATHON_SIZE = 10;
const BACKDROP_POSTERS = 4;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const formatShortDate = (timestamp) => {
  const date = new Date(timestamp);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
};

// A collection, in Profile's flat style:
//   the set's posters, blurred, behind a grey caption + big title
//   numbers like a profile (watched / to go / time left — or, once done,
//   movies / runtime / completed date), then a thin progress line
//   square actions (pick one · or rewatch marathon + share when complete)
//   the posters edge to edge, watched ones checked.
export const CollectionDetailsScreen = ({ route, navigation }) => {
  const { collectionId } = route.params;
  const collection = getCollectionById(collectionId);
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const watched = useMovieStore((state) => state.watched);
  const startSession = useSessionStore((state) => state.startSession);

  // The header bar: transparent over the blurred posters, then a solid bar
  // with the title fades in as the top scrolls away — so the flat back and
  // share icons never float over the grid. (Hooks stay above the early
  // return.)
  const [heroHeight, setHeroHeight] = useState(320);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [heroHeight - 140, heroHeight - 80],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  // The title slides up into the bar as it fades in.
  const barTitleStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [heroHeight - 140, heroHeight - 80],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * 10 }],
    };
  });
  // Pull down and the posters zoom in with you; scroll up and they drift
  // behind the page while the title block eases away.
  const backdropStyle = useStretchyBackdropStyle(scrollY, heroHeight);
  const heroContentStyle = useHeroFadeStyle(scrollY, heroHeight - 80, {
    scale: false,
  });

  if (!collection) {
    return null;
  }

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const { watchedCount, total, progress } = getCollectionProgress(
    collection,
    watchedIds,
  );
  const isComplete = total > 0 && watchedCount === total;
  const minutesLeft = collection.movies
    .filter((movie) => !watchedIds.has(movie.id))
    .reduce((sum, movie) => sum + movie.runtime, 0);
  const totalMinutes = collection.movies.reduce(
    (sum, movie) => sum + movie.runtime,
    0,
  );

  const openMovie = (movieId) =>
    navigation.navigate("MovieDetails", { movieId });

  // Nothing in a collection is ordered, so instead of an "up next" this
  // just picks any unwatched movie at random.
  const pickRandomUnwatched = () => {
    const unwatched = collection.movies.filter(
      (movie) => !watchedIds.has(movie.id),
    );
    if (unwatched.length === 0) return;
    const pick = unwatched[Math.floor(Math.random() * unwatched.length)];
    openMovie(pick.id);
  };

  const completedAt = isComplete
    ? getCollectionCompletedAt(collection, watched)
    : null;

  // Opens the brag image card (posters grid + "I've seen all N …").
  const shareCollection = () => openShareCard(collection.id);

  // A completed collection's own movies as a Swipe session — pick tonight's
  // rewatch from the set you just finished.
  const startMarathon = () => {
    startSession(shuffle(collection.movies).slice(0, MARATHON_SIZE));
    navigation.navigate("Swipe");
  };

  const stats = isComplete
    ? [
        { value: total, label: "movies" },
        { value: formatRuntime(totalMinutes), label: "watched" },
        ...(completedAt
          ? [{ value: formatShortDate(completedAt), label: "completed" }]
          : []),
      ]
    : [
        { value: watchedCount, label: "watched" },
        { value: total - watchedCount, label: "to go" },
        { value: formatRuntime(minutesLeft), label: "left" },
      ];

  const headerTop = insets.top + spacing.sm;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        <View
          style={[
            styles.hero,
            { paddingTop: headerTop + HEADER_BAR_HEIGHT + spacing.lg },
          ]}
          onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}
        >
          {/* The set's own posters, blurred, fading into the page. */}
          <Animated.View
            style={[styles.backdrop, backdropStyle]}
            pointerEvents="none"
          >
            {collection.movies.slice(0, BACKDROP_POSTERS).map((movie) => (
              <MoviePoster
                key={movie.id}
                uri={movie.poster}
                blurRadius={14}
                style={styles.backdropPoster}
              />
            ))}
            <LinearGradient
              colors={[`${colors.background}8C`, colors.background]}
              locations={[0, 0.95]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <Animated.View style={heroContentStyle}>
          <Text style={styles.eyebrow}>
            {TYPE_LABELS[collection.type] ?? t("Collection")}
            {isComplete ? t(" · Completed") : ""}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {collection.title}
          </Text>

          <View style={styles.stats}>
            {stats.map(({ value, label }) => (
              <View key={label} style={styles.stat}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
          </Animated.View>
        </View>

        {/* Progress: a thin line edge to edge — gold once complete. */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              isComplete && styles.progressFillComplete,
              { width: `${progress * 100}%` },
            ]}
          />
        </View>

        <View style={styles.actions}>
          {isComplete ? (
            <>
              <PrimaryButton
                label={t("Rewatch marathon")}
                onPress={startMarathon}
                style={styles.action}
                contentStyle={styles.actionContent}
              />
              <PrimaryButton
                label={t("Share")}
                variant="secondary"
                onPress={shareCollection}
                style={styles.action}
                contentStyle={styles.actionContent}
              />
            </>
          ) : (
            <PrimaryButton
              label={t("Pick from this collection")}
              onPress={pickRandomUnwatched}
              style={styles.action}
              contentStyle={styles.actionContent}
            />
          )}
        </View>

        <MovieGrid
          movies={collection.movies}
          onPressMovie={(movie) => openMovie(movie.id)}
          showWatchedCheck
        />
      </Animated.ScrollView>

      <View
        style={[
          styles.headerBar,
          {
            paddingTop: headerTop,
            height: headerTop + HEADER_BAR_HEIGHT + spacing.sm,
          },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[styles.headerBarFill, barStyle]}
          pointerEvents="none"
        />
        {/* Same width as the share button, so the title stays centred. */}
        <View style={styles.headerSide}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <Animated.Text
          style={[styles.headerTitle, barTitleStyle]}
          numberOfLines={1}
          pointerEvents="none"
        >
          {collection.title}
        </Animated.Text>
        <Pressable
          style={styles.headerIconButton}
          onPress={shareCollection}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("Share this collection")}
        >
          <Share2 size={22} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
      </View>
    </SafeAreaView>
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
      top: 0,
      start: 0,
      end: 0,
      paddingHorizontal: spacing.md,
      flexDirection: "row",
      alignItems: "center",
    },
    headerSide: {
      width: HEADER_BAR_HEIGHT,
      flexDirection: "row",
    },
    headerBarFill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      ...typography.title,
      flex: 1,
      fontSize: 18,
      letterSpacing: -0.3,
      textAlign: "center",
      color: colors.textPrimary,
      marginHorizontal: spacing.sm,
    },
    // Flat, like the other header icons (no circle).
    headerIconButton: {
      width: HEADER_BAR_HEIGHT,
      height: HEADER_BAR_HEIGHT,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    // No overflow clipping: the backdrop has to grow past the hero's top
    // when you pull down.
    hero: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      flexDirection: "row",
    },
    backdropPoster: {
      flex: 1,
      height: "100%",
      opacity: 0.55,
    },
    eyebrow: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    // Numbers like a profile: value over a small label.
    stats: {
      flexDirection: "row",
      gap: spacing.lg,
      marginTop: spacing.md,
    },
    stat: {
      alignItems: "flex-start",
    },
    statValue: {
      ...typography.hero,
      fontSize: 19,
      lineHeight: 24,
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    progressTrack: {
      height: 2,
      backgroundColor: colors.border,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.textPrimary,
    },
    progressFillComplete: {
      backgroundColor: colors.rating,
    },
    actions: {
      flexDirection: "row",
      gap: 2,
      padding: spacing.md,
    },
    action: {
      flex: 1,
    },
    // Square, like the app's other filled boxes.
    actionContent: {
      borderRadius: 0,
      paddingVertical: 12,
    },
  });

export default CollectionDetailsScreen;

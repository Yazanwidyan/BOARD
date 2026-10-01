import { CheckCircle, Dices } from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { BackButton } from "../components/BackButton";
import { MoviePoster } from "../components/MoviePoster";
import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getCollectionById, getCollectionProgress } from "../utils/collections";
import { openChallengeGenerator } from "../utils/openChallengeGenerator";

const NODE_SIZE = 72;
const RING_SIZE = NODE_SIZE + 8;
const ROW_HEIGHT = 124;
const DOT_SPACING = 64;
const DOT_RADIUS = 4;
// A shade darker than colors.background itself — nothing in the shared
// palette is darker than background (border/card/etc are all lighter), so
// this is a one-off just for this screen's dot texture, not a design-
// system token.
const DOT_COLOR = "#16172A";
// Fractional x-position (of the path's content width) each node sits at,
// cycling to produce the winding, snake-like layout instead of a straight
// line — center, right, center, left, repeat.
const OFFSET_PATTERN = [0.5, 0.74, 0.5, 0.26];

const PathNode = ({ movie, cx, cy, state, onPress, styles, colors }) => {
  const ringColor =
    state === "watched"
      ? colors.success
      : state === "next"
        ? colors.accent
        : colors.border;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pathNode,
        {
          left: cx - RING_SIZE / 2,
          top: cy - RING_SIZE / 2,
          borderColor: ringColor,
        },
      ]}
    >
      <MoviePoster
        uri={movie.poster}
        radius={NODE_SIZE / 2}
        style={[
          styles.pathNodePoster,
          state === "remaining" && styles.pathNodeDimmed,
        ]}
      />
      {state === "watched" && (
        <View style={styles.pathNodeCheck}>
          <CheckCircle
            size={16}
            color={colors.success}
            fill={colors.background}
          />
        </View>
      )}
    </Pressable>
  );
};

export const CollectionDetailsScreen = ({ route, navigation }) => {
  const { collectionId } = route.params;
  const collection = getCollectionById(collectionId);
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const watched = useMovieStore((state) => state.watched);

  if (!collection) {
    return null;
  }

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const { watchedCount, total, progress } = getCollectionProgress(
    collection,
    watchedIds,
  );
  const isComplete = total > 0 && watchedCount === total;
  // Only the first not-yet-watched movie in sequence gets the "next up"
  // highlight — everything else unwatched is just unwatched, not locked,
  // since nothing here is actually gated.
  let nextAssigned = false;

  const contentWidth = width - spacing.md * 2;
  const nodePositions = collection.movies.map((movie, index) => {
    const offsetFraction = OFFSET_PATTERN[index % OFFSET_PATTERN.length];
    const cx = offsetFraction * contentWidth;
    const cy = RING_SIZE / 2 + index * ROW_HEIGHT;
    const isWatched = watchedIds.has(movie.id);
    let state = "remaining";
    if (isWatched) {
      state = "watched";
    } else if (!nextAssigned) {
      state = "next";
      nextAssigned = true;
    }
    return { movie, cx, cy, state };
  });
  const canvasHeight =
    RING_SIZE + (collection.movies.length - 1) * ROW_HEIGHT + spacing.xl;

  let pathD = "";
  nodePositions.forEach((pos, index) => {
    if (index === 0) {
      pathD += `M ${pos.cx} ${pos.cy}`;
      return;
    }
    const prev = nodePositions[index - 1];
    const c1y = prev.cy + ROW_HEIGHT / 2;
    const c2y = pos.cy - ROW_HEIGHT / 2;
    pathD += ` C ${prev.cx} ${c1y}, ${pos.cx} ${c2y}, ${pos.cx} ${pos.cy}`;
  });

  // Static — sized to the screen itself, not the scrollable content, and
  // rendered outside the ScrollView so it doesn't move as the user scrolls.
  const dots = [];
  for (let y = 14; y < height; y += DOT_SPACING) {
    for (let x = 14; x < width; x += DOT_SPACING) {
      dots.push({ x, y });
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Svg
        width={width}
        height={height}
        style={styles.dotBackground}
        pointerEvents="none"
      >
        {dots.map((dot) => (
          <Circle
            key={`${dot.x}-${dot.y}`}
            cx={dot.x}
            cy={dot.y}
            r={DOT_RADIUS}
            fill={DOT_COLOR}
          />
        ))}
      </Svg>

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {collection.title}
        </Text>
        {!isComplete && (
          <Pressable
            style={styles.headerIconButton}
            onPress={() => openChallengeGenerator(navigation)}
          >
            <Dices size={18} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        <View style={styles.summary}>
          <Text style={styles.summaryStat}>
            {watchedCount} / {total} watched
          </Text>
          <View style={styles.summaryBarTrack}>
            <View
              style={[styles.summaryBarFill, { width: `${progress * 100}%` }]}
            />
          </View>
          {isComplete && (
            <View style={styles.completeBanner}>
              <CheckCircle size={14} color={colors.success} />
              <Text style={styles.completeBannerText}>Collection Complete</Text>
            </View>
          )}
        </View>

        <View style={[styles.pathContainer, { height: canvasHeight }]}>
          <Svg
            width={contentWidth}
            height={canvasHeight}
            style={StyleSheet.absoluteFillObject}
          >
            <Path
              d={pathD}
              stroke={colors.border}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>
          {nodePositions.map(({ movie, cx, cy, state }) => (
            <PathNode
              key={movie.id}
              movie={movie}
              cx={cx}
              cy={cy}
              state={state}
              colors={colors}
              styles={styles}
              onPress={() =>
                navigation.navigate("MovieDetails", { movieId: movie.id })
              }
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    dotBackground: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      ...typography.title,
      color: colors.textPrimary,
      flex: 1,
    },
    headerIconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    summary: {
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xl,
    },
    summaryStat: {
      ...typography.title,
      color: colors.textPrimary,
    },
    summaryBarTrack: {
      width: "100%",
      height: 6,
      borderRadius: 2,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
      marginTop: spacing.sm,
    },
    summaryBarFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: colors.accentLight,
    },
    completeBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.successSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.lg,
      marginTop: spacing.md,
    },
    completeBannerText: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.success,
    },
    pathContainer: {
      marginTop: spacing.xl,
      marginHorizontal: spacing.md,
    },
    pathNode: {
      position: "absolute",
      width: RING_SIZE,
      height: RING_SIZE,
      borderRadius: RING_SIZE / 2,
      borderWidth: 3,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    pathNodePoster: {
      width: NODE_SIZE,
      height: NODE_SIZE,
    },
    pathNodeDimmed: {
      opacity: 0.4,
    },
    pathNodeCheck: {
      position: "absolute",
      bottom: -2,
      right: -2,
      backgroundColor: colors.background,
      borderRadius: 10,
    },
  });

export default CollectionDetailsScreen;

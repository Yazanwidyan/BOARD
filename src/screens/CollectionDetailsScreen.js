import { LinearGradient } from "expo-linear-gradient";
import {
  Check,
  Clock,
  RotateCw,
  Share2,
  Shuffle,
  Sparkles,
  Trophy,
} from "lucide-react-native";
import { Share, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { MovieGrid } from "../components/MovieGrid";
import { PrimaryButton } from "../components/PrimaryButton";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  getCollectionById,
  getCollectionCompletedAt,
  getCollectionProgress,
} from "../utils/collections";
import { formatRuntime } from "../utils/movieFilters";
import { shuffle } from "../utils/shuffle";
import { COLLECTION_XP } from "../utils/xp";

const TYPE_LABELS = {
  franchise: "Franchise",
  director: "Director",
  actor: "Actor",
  decade: "Decade",
  genre: "Genre",
};

const HEADER_BAR_HEIGHT = 40;
const MARATHON_SIZE = 10;
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
const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};
// Hero (accent gradient, progress, time left, completion XP) → a
// "Collection Complete" card once everything's watched → a poster grid of
// the whole collection with watched ones checked.
export const CollectionDetailsScreen = ({ route, navigation }) => {
  const { collectionId } = route.params;
  const collection = getCollectionById(collectionId);
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const watched = useMovieStore((state) => state.watched);
  const startSession = useSessionStore((state) => state.startSession);

  if (!collection) {
    return null;
  }

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const ratingsById = new Map(
    watched.map((entry) => [entry.movieId, entry.rating]),
  );
  const { watchedCount, total, progress } = getCollectionProgress(
    collection,
    watchedIds,
  );
  const isComplete = total > 0 && watchedCount === total;
  const minutesLeft = collection.movies
    .filter((movie) => !watchedIds.has(movie.id))
    .reduce((sum, movie) => sum + movie.runtime, 0);

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

  const shareCompletion = () => {
    Share.share({
      message: `I finished every movie in the ${collection.title} collection on BOARD (${total} movies). 🏆`,
    });
  };

  // A completed collection's own movies as a Swipe session — pick tonight's
  // rewatch from the set you just finished.
  const startMarathon = () => {
    startSession(shuffle(collection.movies).slice(0, MARATHON_SIZE));
    navigation.navigate("Swipe");
  };

  const headerTop = insets.top + spacing.sm;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        <View
          style={[
            styles.hero,
            { paddingTop: headerTop + HEADER_BAR_HEIGHT + spacing.lg },
          ]}
        >
          <LinearGradient
            colors={[
              isComplete ? `${colors.rating}40` : "rgba(141, 96, 226, 0.28)",
              colors.background,
            ]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={styles.eyebrowRow}>
            {isComplete && <Trophy size={13} color={colors.rating} />}
            <Text
              style={[styles.heroEyebrow, isComplete && styles.heroEyebrowGold]}
            >
              {isComplete ? "COMPLETED · " : ""}
              {(TYPE_LABELS[collection.type] ?? "Collection").toUpperCase()}
            </Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {collection.title}
          </Text>

          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  isComplete && styles.progressFillComplete,
                  { width: `${progress * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {watchedCount} / {total} watched
            </Text>
          </View>

          <View style={styles.statsRow}>
            {isComplete ? (
              completedAt && (
                <View style={styles.stat}>
                  <Check size={13} color={colors.rating} strokeWidth={3} />
                  <Text style={[styles.statText, styles.statTextXP]}>
                    Completed {formatDate(completedAt)}
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.stat}>
                <Clock size={13} color={colors.textSecondary} />
                <Text style={styles.statText}>
                  {formatRuntime(minutesLeft)} left
                </Text>
              </View>
            )}
            <View style={styles.stat}>
              <Sparkles size={13} color={colors.rating} />
              <Text style={[styles.statText, styles.statTextXP]}>
                {isComplete
                  ? `+${COLLECTION_XP} XP earned`
                  : `+${COLLECTION_XP} XP on finish`}
              </Text>
            </View>
          </View>

          {!isComplete && (
            <PrimaryButton
              label="Pick one for me"
              icon={<Shuffle size={16} color="#FFFFFF" />}
              onPress={pickRandomUnwatched}
              style={styles.pickButton}
              contentStyle={styles.pickButtonContent}
            />
          )}
        </View>

        {isComplete && (
          <View style={styles.section}>
            <View style={styles.trophyCard}>
              <View style={styles.trophyIcon}>
                <Trophy size={22} color={colors.rating} />
              </View>
              <View style={styles.completeInfo}>
                <Text style={styles.trophyTitle}>Collection complete</Text>
                <Text style={styles.completeSubtitle}>
                  All {total} watched · +{COLLECTION_XP} XP earned
                </Text>
              </View>
            </View>
            <View style={styles.trophyActions}>
              <PrimaryButton
                label="Rewatch marathon"
                icon={<RotateCw size={15} color="#FFFFFF" />}
                onPress={startMarathon}
                style={styles.trophyAction}
                contentStyle={styles.pickButtonContent}
              />
              <PrimaryButton
                label="Share"
                variant="secondary"
                icon={<Share2 size={15} color={colors.textPrimary} />}
                onPress={shareCompletion}
                style={styles.trophyAction}
                contentStyle={styles.pickButtonContent}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>All Movies</Text>
        </View>
        <MovieGrid
          movies={collection.movies}
          onPressMovie={(movie) => openMovie(movie.id)}
          showWatchedCheck
        />
      </ScrollView>

      <View style={[styles.headerBar, { top: headerTop }]}>
        <BackButton onPress={() => navigation.goBack()} />
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
      left: spacing.md,
      right: spacing.md,
      height: HEADER_BAR_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    hero: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
      overflow: "hidden",
    },
    heroEyebrow: {
      ...typography.label,
      color: colors.accentLight,
    },
    heroTitle: {
      ...typography.display,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    progressTrack: {
      flex: 1,
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: radius.pill,
      backgroundColor: colors.accentLight,
    },
    progressFillComplete: {
      backgroundColor: colors.rating,
    },
    progressText: {
      ...typography.label,
      color: colors.textPrimary,
    },
    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    stat: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    statText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    statTextXP: {
      color: colors.rating,
    },
    pickButton: {
      alignSelf: "flex-start",
      marginTop: spacing.md,
    },
    pickButtonContent: {
      paddingVertical: 10,
    },
    section: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    completeInfo: {
      flex: 1,
      justifyContent: "center",
    },
    eyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    heroEyebrowGold: {
      color: colors.rating,
    },
    trophyCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: `${colors.rating}14`,
      borderWidth: 1.5,
      borderColor: `${colors.rating}88`,
    },
    trophyIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.rating}24`,
    },
    trophyTitle: {
      ...typography.subtitle,
      color: colors.rating,
    },
    trophyActions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    trophyAction: {
      flex: 1,
    },
    completeSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });

export default CollectionDetailsScreen;

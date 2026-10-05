import {
  Check,
  ChevronRight,
  ListPlus,
  Plus,
  Trophy,
} from "lucide-react-native";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  getCollectionCompletedAt,
  getCollectionProgress,
  getCollectionSections,
  getSuggestedCollections,
} from "../utils/collections";
import { formatRuntime } from "../utils/movieFilters";
import { MoviePoster } from "./MoviePoster";

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "franchise", label: "Franchises" },
  { key: "director", label: "Directors" },
  { key: "actor", label: "Actors" },
  { key: "decade", label: "Decades" },
  { key: "genre", label: "Genres" },
];
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
const ALMOST_THERE_MAX_LEFT = 2;
const CAROUSEL_CARD = 156;
const RING_SIZE = 34;

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// 2×2 poster cover — the first four movies, cropped into square cells.
const Cover = ({ movies, size, dimmed, styles }) => {
  const cell = size / 2;
  return (
    <View style={[styles.cover, { width: size, height: size }]}>
      {[0, 1, 2, 3].map((index) => {
        const movie = movies[index % movies.length];
        return (
          <MoviePoster
            key={index}
            uri={movie?.poster}
            style={[
              { width: cell, height: cell },
              dimmed && styles.coverDimmed,
            ]}
          />
        );
      })}
    </View>
  );
};

const Ring = ({ progress, colors }) => {
  const stroke = 4;
  const r = (RING_SIZE - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={r}
        stroke="rgba(255, 255, 255, 0.18)"
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={r}
        stroke={colors.accentLight}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        fill="none"
        transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
      />
    </Svg>
  );
};

const SectionTitle = ({ title, count, styles }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {count != null && <Text style={styles.sectionCount}>{count}</Text>}
  </View>
);

// Library's Collections tab as shelves: type chips → In progress carousel
// (cover + ring + what's left) → Almost there (1–2 left, with the exact
// movie) → Not started → the gold Trophy shelf of completed ones (with the
// date they were finished) → You might like (untracked collections matching
// what you watch). The full browser stays one tap away under "See all".
export const CollectionsShelf = ({
  watched,
  unlockedCollectionIds,
  onOpen,
  onToggleTrack,
  onSeeAll,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const [typeFilter, setTypeFilter] = useState("all");

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const all = getCollectionSections()
    .flatMap((section) => section.collections)
    .map((collection) => {
      const progressInfo = getCollectionProgress(collection, watchedIds);
      const unwatched = collection.movies.filter(
        (movie) => !watchedIds.has(movie.id),
      );
      return {
        collection,
        ...progressInfo,
        left: unwatched.length,
        nextMovie: unwatched[0] ?? null,
        minutesLeft: unwatched.reduce((sum, movie) => sum + movie.runtime, 0),
        tracked:
          progressInfo.progress > 0 ||
          unlockedCollectionIds.includes(collection.id),
      };
    });

  const tracked = all.filter((item) => item.tracked);
  const availableTypes = TYPE_FILTERS.filter(
    ({ key }) =>
      key === "all" || tracked.some((item) => item.collection.type === key),
  );
  const matchesType = (item) =>
    typeFilter === "all" || item.collection.type === typeFilter;

  const visible = tracked.filter(matchesType);
  const inProgress = visible
    .filter((item) => item.progress > 0 && item.progress < 1)
    .sort((a, b) => b.progress - a.progress);
  const almostThere = inProgress.filter(
    (item) => item.left <= ALMOST_THERE_MAX_LEFT,
  );
  const notStarted = visible.filter((item) => item.progress === 0);
  const completed = visible
    .filter((item) => item.progress === 1)
    .map((item) => ({
      ...item,
      completedAt: getCollectionCompletedAt(item.collection, watched),
    }))
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const suggestions = getSuggestedCollections(
    watched,
    unlockedCollectionIds,
  ).filter(({ collection }) => matchesType({ collection }));

  const gridCell = (width - spacing.md * 2 - spacing.sm) / 2;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.flatRow}
        contentContainerStyle={styles.chips}
      >
        {availableTypes.map(({ key, label }) => (
          <Pressable
            key={key}
            style={[styles.chip, typeFilter === key && styles.chipActive]}
            onPress={() => setTypeFilter(key)}
          >
            <Text
              style={[
                styles.chipText,
                typeFilter === key && styles.chipTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tracked.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No collections yet.</Text>
          <Text style={styles.emptyText}>
            Watch a movie that belongs to one, or pick some to track.
          </Text>
        </View>
      )}

      {inProgress.length > 0 && (
        <View style={styles.section}>
          <SectionTitle
            title="In progress"
            count={inProgress.length}
            styles={styles}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.flatRow}
            contentContainerStyle={styles.carousel}
          >
            {inProgress.map((item) => (
              <Pressable
                key={item.collection.id}
                style={styles.carouselCard}
                onPress={() => onOpen(item.collection.id)}
              >
                <View>
                  <Cover
                    movies={item.collection.movies}
                    size={CAROUSEL_CARD}
                    styles={styles}
                  />
                  <View style={styles.ringBadge}>
                    <Ring progress={item.progress} colors={colors} />
                    <Text style={styles.ringText}>
                      {Math.round(item.progress * 100)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.collection.title}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {item.left} left · {formatRuntime(item.minutesLeft)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {almostThere.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="Almost there" styles={styles} />
          <View style={styles.list}>
            {almostThere.map((item) => (
              <Pressable
                key={item.collection.id}
                style={styles.almostRow}
                onPress={() => onOpen(item.collection.id)}
              >
                <MoviePoster
                  uri={item.nextMovie?.poster}
                  style={styles.almostPoster}
                />
                <View style={styles.almostInfo}>
                  <Text style={styles.almostTitle} numberOfLines={1}>
                    {item.collection.title}
                  </Text>
                  <Text style={styles.almostMeta} numberOfLines={1}>
                    {item.left === 1
                      ? `1 left · ${item.nextMovie?.title}`
                      : `${item.left} left · next: ${item.nextMovie?.title}`}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {notStarted.length > 0 && (
        <View style={styles.section}>
          <SectionTitle
            title="Not started"
            count={notStarted.length}
            styles={styles}
          />
          <View style={styles.grid}>
            {notStarted.map((item) => (
              <Pressable
                key={item.collection.id}
                style={{ width: gridCell }}
                onPress={() => onOpen(item.collection.id)}
              >
                <Cover
                  movies={item.collection.movies}
                  size={gridCell}
                  styles={styles}
                />
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.collection.title}
                </Text>
                <Text style={styles.cardMeta}>
                  0/{item.total} · {formatRuntime(item.minutesLeft)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {completed.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Trophy size={14} color={colors.rating} />
            <Text style={[styles.sectionTitle, styles.trophyTitle]}>
              Trophy shelf
            </Text>
            <Text style={styles.sectionCount}>{completed.length}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.flatRow}
            contentContainerStyle={styles.carousel}
          >
            {completed.map((item) => (
              <Pressable
                key={item.collection.id}
                style={styles.trophyCard}
                onPress={() => onOpen(item.collection.id)}
              >
                <View>
                  <Cover
                    movies={item.collection.movies}
                    size={CAROUSEL_CARD - 16}
                    styles={styles}
                  />
                  <View style={styles.trophyRibbon}>
                    <Check
                      size={12}
                      color={colors.background}
                      strokeWidth={3}
                    />
                  </View>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.collection.title}
                </Text>
                <Text style={styles.trophyMeta} numberOfLines={1}>
                  {item.completedAt
                    ? `Completed ${formatDate(item.completedAt)}`
                    : "Completed"}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {suggestions.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="You might like" styles={styles} />
          <View style={styles.list}>
            {suggestions.map(({ collection, genre }) => (
              <View key={collection.id} style={styles.suggestionRow}>
                <Pressable
                  style={styles.suggestionMain}
                  onPress={() => onOpen(collection.id)}
                >
                  <Cover movies={collection.movies} size={52} styles={styles} />
                  <View style={styles.almostInfo}>
                    <Text style={styles.almostTitle} numberOfLines={1}>
                      {collection.title}
                    </Text>
                    <Text style={styles.almostMeta} numberOfLines={1}>
                      {collection.movies.length} movies · you watch a lot of{" "}
                      {genre}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  style={styles.trackButton}
                  onPress={() => onToggleTrack(collection.id)}
                  hitSlop={6}
                >
                  <Plus
                    size={14}
                    color={colors.accentContrast}
                    strokeWidth={3}
                  />
                  <Text style={styles.trackText}>Track</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      <Pressable style={styles.seeAll} onPress={onSeeAll}>
        <ListPlus size={16} color={colors.textSecondary} strokeWidth={2.2} />
        <Text style={styles.seeAllText}>Browse all collections</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Horizontal ScrollViews default to flexGrow: 1 — pinned so they don't
    // stretch inside Library's flexGrow scroll content.
    flatRow: {
      flexGrow: 0,
    },
    chips: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
    },
    chipActive: {
      backgroundColor: "#FFFFFF",
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.background,
    },
    emptyBox: {
      alignItems: "center",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
      gap: spacing.xs,
    },
    emptyTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    emptyText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
    section: {
      marginTop: spacing.lg,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      ...typography.label,
      color: colors.textSecondary,
    },
    sectionCount: {
      ...typography.caption,
      color: colors.textMuted,
    },
    trophyTitle: {
      color: colors.rating,
    },
    carousel: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    carouselCard: {
      width: CAROUSEL_CARD,
    },
    cover: {
      flexDirection: "row",
      flexWrap: "wrap",
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    coverDimmed: {
      opacity: 0.5,
    },
    ringBadge: {
      position: "absolute",
      right: 6,
      bottom: 6,
      width: RING_SIZE,
      height: RING_SIZE,
      borderRadius: RING_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(2, 0, 2, 0.7)",
    },
    ringText: {
      ...typography.label,
      fontSize: 9,
      letterSpacing: 0,
      position: "absolute",
      color: colors.textPrimary,
    },
    cardTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginTop: spacing.xs + 2,
    },
    cardMeta: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    list: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    almostRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      padding: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
      borderLeftWidth: 3,
      borderLeftColor: colors.success,
    },
    almostPoster: {
      width: 34,
      aspectRatio: 2 / 3,
    },
    almostInfo: {
      flex: 1,
      gap: 2,
    },
    almostTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    almostMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    trophyCard: {
      width: CAROUSEL_CARD,
      padding: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: `${colors.rating}14`,
      borderWidth: 1.5,
      borderColor: `${colors.rating}88`,
    },
    trophyRibbon: {
      position: "absolute",
      top: 6,
      left: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.rating,
    },
    trophyMeta: {
      ...typography.caption,
      fontSize: 11,
      color: colors.rating,
      marginTop: 1,
    },
    suggestionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    suggestionMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
    },
    trackButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 7,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    trackText: {
      ...typography.label,
      fontSize: 11,
      color: colors.accentContrast,
    },
    seeAll: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: 6,
      marginTop: spacing.lg,
      padding: spacing.sm,
    },
    seeAllText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
  });

export default CollectionsShelf;

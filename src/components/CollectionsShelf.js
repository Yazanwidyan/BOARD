import { ListPlus, Plus, Trophy } from "lucide-react-native";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

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
import { CollectionCollage } from "./CollectionCollage";
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
const CAROUSEL_CARD = 136;

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

// One collection as a poster collage with its name and a line underneath.
const ShelfCard = ({
  item,
  width,
  meta,
  metaColor,
  watchedIds,
  onPress,
  styles,
}) => (
  <Pressable
    style={({ pressed }) => [{ width }, pressed && styles.pressed]}
    onPress={onPress}
  >
    <View style={styles.shelfCardBox}>
      <CollectionCollage
        collection={item.collection}
        watchedIds={watchedIds}
        size={width - 2}
      />
    </View>
    <View style={styles.shelfCardText}>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.collection.title}
      </Text>
      <Text
        style={[styles.cardMeta, metaColor && { color: metaColor }]}
        numberOfLines={1}
      >
        {meta}
      </Text>
    </View>
  </Pressable>
);

// Section headers as the little tags clipped to a store shelf.
const SectionTitle = ({ title, count, icon, color, styles }) => (
  <View style={styles.tag}>
    {icon}
    <Text style={[styles.tagText, color && { color }]}>
      {title.toUpperCase()}
    </Text>
    {count != null && <Text style={styles.tagCount}>{count}</Text>}
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
  onOpenMovie,
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

  // Not started: two collages per row.
  const gridCell = (width - (spacing.md - 1) * 2) / 2;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.flatRow, styles.chipsBar]}
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
              <ShelfCard
                key={item.collection.id}
                item={item}
                width={CAROUSEL_CARD}
                meta={`${item.watchedCount} of ${item.total} · ${formatRuntime(item.minutesLeft)} left`}
                watchedIds={watchedIds}
                onPress={() => onOpen(item.collection.id)}
                styles={styles}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {almostThere.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="Almost there" styles={styles} />
          <View style={styles.list}>
            {/* Missing pieces: the collection's collage, and the posters of
                the movies that would complete it — tap one to open it, or
                the row for the whole collection. */}
            {almostThere.map((item) => {
              const missing = item.collection.movies.filter(
                (movie) => !watchedIds.has(movie.id),
              );
              return (
                <Pressable
                  key={item.collection.id}
                  style={({ pressed }) => [
                    styles.missingCard,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => onOpen(item.collection.id)}
                >
                  <CollectionCollage
                    collection={item.collection}
                    watchedIds={watchedIds}
                    size={84}
                  />
                  <View style={styles.missingInfo}>
                    <Text style={styles.missingTitle} numberOfLines={1}>
                      {item.collection.title}
                    </Text>
                    <Text style={styles.missingMeta}>
                      <Text style={styles.missingCount}>
                        {item.left === 1 ? "1 movie" : `${item.left} movies`}
                      </Text>{" "}
                      to complete it
                    </Text>
                    <View style={styles.missingSlots}>
                      {missing.map((movie) => (
                        <Pressable
                          key={movie.id}
                          style={styles.missingSlot}
                          onPress={() =>
                            onOpenMovie
                              ? onOpenMovie(movie.id)
                              : onOpen(item.collection.id)
                          }
                          hitSlop={4}
                          accessibilityLabel={`Open ${movie.title}`}
                        >
                          <MoviePoster
                            uri={movie.poster}
                            style={styles.missingPoster}
                          />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </Pressable>
              );
            })}
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
          <View style={styles.shelfGrid}>
            {notStarted.map((item) => (
              <ShelfCard
                key={item.collection.id}
                item={item}
                width={gridCell}
                meta={`${item.total} movies · ${formatRuntime(item.minutesLeft)}`}
                watchedIds={watchedIds}
                onPress={() => onOpen(item.collection.id)}
                styles={styles}
              />
            ))}
          </View>
        </View>
      )}
      {completed.length > 0 && (
        <View style={styles.section}>
          <SectionTitle
            title="Trophy shelf"
            count={completed.length}
            icon={<Trophy size={12} color={colors.rating} />}
            color={colors.rating}
            styles={styles}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.flatRow}
            contentContainerStyle={styles.carousel}
          >
            {completed.map((item) => (
              <ShelfCard
                key={item.collection.id}
                item={item}
                width={CAROUSEL_CARD}
                meta={
                  item.completedAt
                    ? `Completed ${formatDate(item.completedAt)}`
                    : "Completed"
                }
                metaColor={colors.rating}
                watchedIds={watchedIds}
                onPress={() => onOpen(item.collection.id)}
                styles={styles}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {suggestions.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="You might like" styles={styles} />
          <View style={styles.suggestionList}>
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
    // Same bar as Watched / Watchlist: square filled boxes over a hairline,
    // the active one filled white.
    chipsBar: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    chips: {
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    chip: {
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm,
      backgroundColor: colors.card,
    },
    chipActive: {
      backgroundColor: colors.selected,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
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
    tag: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: spacing.xs + 2,
      marginLeft: spacing.md,
      marginBottom: spacing.sm + 2,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      borderRadius: radius.xs,
      backgroundColor: colors.cardElevated,
    },
    tagText: {
      ...typography.label,
      color: colors.textSecondary,
      letterSpacing: 1.2,
    },
    tagCount: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
    },
    // Cards sit edge to edge (no gap); each
    // card pads its own box instead.
    carousel: {
      paddingHorizontal: spacing.md - 1,
    },
    shelfGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: spacing.lg,
      paddingHorizontal: spacing.md - 1,
    },
    // 1px a side: covers sit 2px apart, like Library's poster grid.
    shelfCardBox: {
      paddingHorizontal: 1,
    },
    shelfCardText: {
      paddingHorizontal: 1,
      paddingRight: spacing.sm,
      marginTop: spacing.sm,
    },
    pressed: {
      opacity: 0.75,
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
    // Filled rows edge to edge, 2px apart — square, no border.
    list: {
      gap: 2,
    },
    missingCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
    },
    missingInfo: {
      flex: 1,
    },
    missingTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    missingMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    missingCount: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.textPrimary,
    },
    // The posters still to watch, 2px apart like the other poster rows.
    missingSlots: {
      flexDirection: "row",
      gap: 2,
      marginTop: spacing.sm,
    },
    missingSlot: {},
    missingPoster: {
      width: 44,
      height: 66,
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
    suggestionList: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
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

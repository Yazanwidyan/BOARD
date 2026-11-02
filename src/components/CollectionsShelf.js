import { Check, ChevronRight, ListPlus, Play, Plus } from "lucide-react-native";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { t, useIsRTL } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getCollectionProgress, getSagas, getSuggestedCollections } from "../utils/collections";
import { formatRuntime } from "../utils/movieFilters";
import { getPathNext, usePaths } from "../utils/paths";
import { Text } from "./AppText";
import { CollectionCollage } from "./CollectionCollage";
import { EmptyState } from "./EmptyState";
import { LaurelIcon } from "./icons/Laurel";
import { MoviePoster } from "./MoviePoster";
import { TrophyCabinet, getTrophies } from "./TrophyCabinet";

const HERO_COVER = 112;
const ROW_COVER = 64;
const NEXT_POSTER = 44;
const START_SHOWN = 6;

// What kind of collection, in a word.
const KIND_LABELS = {
  franchise: "Franchise",
  studio: "Studio",
  theme: "Theme",
  director: "Director",
  actor: "Actor",
};

// A collection from the server's paths (sagas and directors' films alike)
// as the collage wants it: its films as movies.
const asCollection = (path) => ({
  ...path,
  get movies() {
    return path.movieIds.map(getMovieById).filter(Boolean);
  },
});

// The time the films you haven't seen add up to.
const timeLeft = (path, watchedIds) =>
  path.movieIds
    .filter((id) => !watchedIds.has(id))
    .reduce((sum, id) => sum + (getMovieById(id)?.runtime ?? 0), 0);

// A section's heading, as Library's: bold, with a quiet count after it.
const Heading = ({ title, count, styles }) => (
  <View style={styles.headingRow}>
    <Text style={styles.headingText} numberOfLines={1}>
      {title}
    </Text>
    {count != null && <Text style={styles.headingCount}>{count}</Text>}
  </View>
);

// A thin progress bar; `strong` in the brand colour (one film left).
const Bar = ({ value, strong, styles }) => (
  <View style={styles.barTrack}>
    <View style={[styles.barFill, strong && styles.barFillStrong, { width: `${Math.round(value * 100)}%` }]} />
  </View>
);

// Library's Collections — the one thing to finish in ReelBoard:
//   Closest to done   the collection you're nearest the end of, big: how
//                     far, the time left, and its next film to watch
//   In progress       the rest you've started, one row each
//   Completed         the ones you've finished (n of all the sagas)
//   Start one         collections you track or might like, to begin
// then Browse all. Progress is the server's (utils/paths), so directors'
// collections count here too.
export const CollectionsShelf = ({
  watched,
  unlockedCollectionIds,
  onOpen,
  onToggleTrack,
  onSeeAll,
  onSeeTrophies,
  onOpenMovie,
}) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const rtl = useIsRTL();
  const { width } = useWindowDimensions();
  const paths = usePaths();

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const [closest, ...underWay] = paths;
  const closestNext = closest ? getMovieById(getPathNext(closest)) : null;
  const trophies = getTrophies(watched);
  const sagaCount = getSagas().length;

  // To start: the ones you track but haven't begun, then ones like what you
  // watch.
  const tracked = getSagas().filter(
    (collection) =>
      unlockedCollectionIds.includes(collection.id) &&
      getCollectionProgress(collection, watchedIds).watchedCount === 0,
  );
  const suggested = getSuggestedCollections(watched, unlockedCollectionIds, START_SHOWN);
  const toStart = [
    ...tracked.map((collection) => ({ collection, tracked: true, genre: null })),
    ...suggested.map(({ collection, genre }) => ({ collection, tracked: false, genre })),
  ].slice(0, START_SHOWN);
  const cell = Math.floor((width - spacing.md * 2 - spacing.rail) / 2);

  const nothing = paths.length === 0 && trophies.length === 0;

  return (
    <View style={styles.page}>
      {nothing && (
        <EmptyState
          art="noCollections"
          title={t("No collections yet")}
          subtitle={t("Watch a film from one and it starts here, or pick some to track below.")}
        />
      )}

      {/* Closest to done: the one to finish next, and its next film. */}
      {closest && (
        <Pressable
          style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
          onPress={() => onOpen(closest.id)}
          accessibilityRole="button"
          accessibilityLabel={`${closest.title}, ${t("{watched} of {total}", { watched: closest.watched, total: closest.total })}`}
        >
          <View style={styles.heroTop}>
            <CollectionCollage collection={asCollection(closest)} watchedIds={watchedIds} size={HERO_COVER} />
            <View style={styles.heroWords}>
              <Text style={styles.eyebrow}>{t("Closest to done")}</Text>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {closest.title}
              </Text>
              <Text style={styles.heroMeta} numberOfLines={1}>
                {[
                  t("{watched} of {total}", { watched: closest.watched, total: closest.total }),
                  timeLeft(closest, watchedIds) > 0
                    ? t("{time} to go", { time: formatRuntime(timeLeft(closest, watchedIds)) })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Bar value={closest.watched / closest.total} strong styles={styles} />
            </View>
          </View>
          {closestNext && (
            <View style={styles.next}>
              <MoviePoster uri={closestNext.poster} style={styles.nextPoster} />
              <View style={styles.nextWords}>
                <Text style={styles.nextLabel}>{t("Up next")}</Text>
                <Text style={styles.nextTitle} numberOfLines={1}>
                  {closestNext.title}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.watchNext, pressed && styles.pressed]}
                onPress={() => onOpenMovie(closestNext.id)}
                hitSlop={4}
                accessibilityRole="button"
              >
                <Play size={13} color={colors.brandText} fill={colors.brandText} />
                <Text style={styles.watchNextText}>{t("Watch next")}</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      )}

      {/* In progress: the rest you've started, closest first. */}
      {underWay.length > 0 && (
        <View style={styles.section}>
          <Heading title={t("In progress")} count={underWay.length} styles={styles} />
          <View style={styles.rows}>
            {underWay.map((path, index) => {
              const left = path.total - path.watched;
              const minutes = timeLeft(path, watchedIds);
              return (
                <Pressable
                  key={path.id}
                  style={({ pressed }) => [styles.row, index > 0 && styles.rowRule, pressed && styles.pressed]}
                  onPress={() => onOpen(path.id)}
                  accessibilityRole="button"
                >
                  <CollectionCollage collection={asCollection(path)} watchedIds={watchedIds} size={ROW_COVER} />
                  <View style={styles.rowWords}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {path.title}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {[
                        KIND_LABELS[path.kind] ? t(KIND_LABELS[path.kind]) : null,
                        t("{watched} of {total}", { watched: path.watched, total: path.total }),
                        left === 1
                          ? t("1 left")
                          : minutes > 0
                            ? t("{time} to go", { time: formatRuntime(minutes) })
                            : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                    <Bar value={path.watched / path.total} strong={left === 1} styles={styles} />
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.2} style={rtl && styles.flipped} />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Completed: every one you've finished, in its laurels. */}
      <View style={styles.section}>
        {/* The heading opens all your collections, completed or not. */}
        <Pressable
          style={({ pressed }) => [styles.headingRow, pressed && styles.pressed]}
          onPress={onSeeTrophies}
          accessibilityRole="button"
        >
          <LaurelIcon size={24} />
          <Text style={styles.headingText}>{t("Completed")}</Text>
          <Text style={styles.headingCount}>
            {t("{count} of {total}", { count: trophies.length, total: sagaCount })}
          </Text>
          <Text style={styles.seeAllLink}>{t("See all")} ›</Text>
        </Pressable>
        {trophies.length > 0 ? (
          <TrophyCabinet row finished={trophies} onOpen={onOpen} />
        ) : (
          <Text style={styles.muted}>{t("Watch every film in a collection to complete it.")}</Text>
        )}
      </View>

      {/* Start one: the ones you track, then ones like what you watch. */}
      {toStart.length > 0 && (
        <View style={styles.section}>
          <Heading title={t("Start one")} styles={styles} />
          <View style={styles.grid}>
            {toStart.map(({ collection, tracked: isTracked, genre }) => (
              <View key={collection.id} style={{ width: cell }}>
                <Pressable
                  onPress={() => onOpen(collection.id)}
                  style={({ pressed }) => pressed && styles.pressed}
                  accessibilityRole="button"
                  accessibilityLabel={collection.title}
                >
                  <CollectionCollage collection={collection} watchedIds={watchedIds} size={cell} />
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {collection.title}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {genre
                      ? t("{count} films · {genre}", { count: collection.movieIds.length, genre: t(genre) })
                      : t("{count} films", { count: collection.movieIds.length })}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.track, isTracked && styles.trackOn, pressed && styles.pressed]}
                  onPress={() => onToggleTrack(collection.id)}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isTracked }}
                >
                  {isTracked ? (
                    <Check size={14} color={colors.textPrimary} strokeWidth={2.6} />
                  ) : (
                    <Plus size={14} color={colors.textPrimary} strokeWidth={2.6} />
                  )}
                  <Text style={styles.trackText}>{isTracked ? t("Tracking") : t("Track")}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      <Pressable style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]} onPress={onSeeAll}>
        <ListPlus size={16} color={colors.textPrimary} strokeWidth={2.2} />
        <Text style={styles.seeAllText}>{t("Browse all collections")}</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    page: {
      paddingTop: spacing.sm,
    },
    pressed: {
      opacity: 0.8,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    section: {
      marginTop: spacing.section,
    },
    headingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm + 2,
    },
    headingText: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      lineHeight: 26,
      color: colors.textPrimary,
    },
    headingCount: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    seeAllLink: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.brand,
      marginStart: "auto",
    },
    muted: {
      ...typography.caption,
      color: colors.textSecondary,
      paddingHorizontal: spacing.md,
    },

    // Closest to done: one card, its cover beside the words, the next film
    // under them.
    hero: {
      marginHorizontal: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    heroWords: {
      flex: 1,
      gap: 3,
    },
    eyebrow: {
      ...typography.caption,
      fontFamily: fonts.bold,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: colors.brand,
    },
    heroTitle: {
      fontFamily: fonts.extraBold,
      fontSize: 20,
      lineHeight: 25,
      color: colors.textPrimary,
    },
    heroMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    next: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    nextPoster: {
      width: NEXT_POSTER,
      height: NEXT_POSTER * 1.5,
    },
    nextWords: {
      flex: 1,
    },
    nextLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    nextTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    watchNext: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      height: 34,
      paddingHorizontal: spacing.md,
      borderRadius: shape.chip,
      backgroundColor: colors.brand,
    },
    watchNextText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.brandText,
    },

    // The bar under each one's words.
    barTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.cardElevated,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: colors.collection,
    },
    barFillStrong: {
      backgroundColor: colors.brand,
    },

    // In progress: rows on one card, hairlines between.
    rows: {
      marginHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      paddingHorizontal: spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm + 4,
    },
    rowRule: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowWords: {
      flex: 1,
      gap: 4,
    },
    rowTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    rowMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },

    // Start one: two across.
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.rail,
      rowGap: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    cardTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    cardMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    track: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      height: 30,
      marginTop: spacing.sm,
      borderRadius: shape.chip,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    trackOn: {
      backgroundColor: colors.cardElevated,
      borderColor: colors.cardElevated,
    },
    trackText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textPrimary,
    },

    seeAll: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 46,
      marginHorizontal: spacing.md,
      marginTop: spacing.section,
      borderRadius: shape.card,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    seeAllText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
  });

export default CollectionsShelf;

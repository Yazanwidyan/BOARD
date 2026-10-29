import { ChevronRight, Plus } from "lucide-react-native";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { getMovieById } from "../data/movies";
import { t, useIsRTL } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getCollectionCompletedAt, getSagas } from "../utils/collections";
import { TIERS, getTier, getTierInfo } from "../utils/tiers";
import { Text } from "./AppText";
import { BoardCover } from "./BoardCover";
import { MoviePoster } from "./MoviePoster";
import { ShelfRail } from "./ShelfRail";
import { TasteDnaBars } from "./TasteDnaBars";

// A profile's sections, built like the rest of the app (Home's shelves),
// in the Apple Music style: a big bold title with a › when it opens
// somewhere (or its own action word, in the signature colour, at the end),
// and the content straight on the page — rows of tiles run edge to edge (ShelfRail, the same tile size as
// Home's sagas). Profile and a friend's page both use them.

// Home's saga tiles: 142 wide, with their 1px side padding.
const BOX_ITEM = 142;
const TILE = BOX_ITEM - 2;

// One section: its title and action, then its content. `onPress` makes
// the content a button (it opens the full view, like the action). `rail`:
// the content is a sideways row that runs to the screen's edges.
export const ProfileSection = ({ title, actionLabel, onAction, onPress, rail = false, children }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const rtl = useIsRTL();
  const heading = (
    <>
      <Text style={styles.tagText} numberOfLines={1}>
        {title}
      </Text>
      {onAction && !actionLabel && (
        <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.6} style={rtl && styles.flipped} />
      )}
    </>
  );
  return (
    <View style={styles.section}>
      <View style={styles.tagRow}>
        {onAction && !actionLabel ? (
          <Pressable
            onPress={onAction}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [styles.heading, pressed && styles.pressed]}
          >
            {heading}
          </Pressable>
        ) : (
          <View style={styles.heading}>{heading}</View>
        )}
        {onAction && !!actionLabel && (
          <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
            <Text style={styles.seeAllText}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
      {rail ? (
        <View style={styles.bleed}>{children}</View>
      ) : onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => pressed && styles.pressed}
          accessibilityRole="button"
        >
          {children}
        </Pressable>
      ) : (
        children
      )}
    </View>
  );
};

// What goes in an empty section, and what to do about it.
export const SectionEmpty = ({ line, actionLabel, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.empty, pressed && styles.pressed]}
      accessibilityRole={onPress ? "button" : undefined}
    >
      <Text style={styles.emptyLine}>{line}</Text>
      {!!actionLabel && <Text style={styles.emptyAction}>{actionLabel} ›</Text>}
    </Pressable>
  );
};

// Taste DNA in brief: each of the six dimensions as a line between its two
// ends with a dot where you sit — the end you lean towards is lit.
export const TasteSnapshot = ({ dna, onSeeUntiered }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  if (!dna.hasDna) {
    return (
      <SectionEmpty
        line={t("Tier a few movies and we'll map it — how dark, how fast, how twisty you like them.")}
        actionLabel={t("See untiered")}
        onPress={onSeeUntiered}
      />
    );
  }

  return <TasteDnaBars fingerprint={dna.fingerprint} />;
};

// The sagas finished in this watch history ({ movieId, timestamp }), the
// most recently finished first: [{ collection, top }] — `top` its last
// rank.
export const getFinishedSagas = (watched) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  return getSagas()
    .filter(
      (collection) =>
        collection.movieIds.length > 0 && collection.movieIds.every((id) => watchedIds.has(id)),
    )
    .map((collection) => ({
      collection,
      top: (collection.ranks ?? [])[collection.ranks.length - 1] ?? null,
      finishedAt: getCollectionCompletedAt(collection, watched),
    }))
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
};

// Tiers in brief: a box for each tier, S to F — in its colour when films
// sit in it, dark when none do — with the count under each. `onSeeUntiered` (yours) adds
// a line about the ones not tiered yet.
export const TierSummary = ({ entries, onSeeUntiered }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const counts = TIERS.map((tier) => ({
    ...tier,
    entries: entries.filter((entry) => getTier(entry) === tier.key),
  }));
  const tiered = counts.reduce((sum, tier) => sum + tier.entries.length, 0);
  const untiered = entries.length - tiered;

  if (tiered === 0) {
    return (
      <SectionEmpty
        line={t("Tier what you watch and the tier list builds here.")}
        actionLabel={onSeeUntiered && untiered > 0 ? t("See untiered") : null}
        onPress={onSeeUntiered && untiered > 0 ? onSeeUntiered : undefined}
      />
    );
  }

  return (
    <View
      accessibilityLabel={counts
        .filter((tier) => tier.entries.length > 0)
        .map((tier) => `${tier.key} ${tier.entries.length}`)
        .join(", ")}
    >
      {/* Six boxes, S to F: filled in the tier's colour when it has films,
          dark when it's empty — each with its count under it. */}
      <View style={styles.tierBar}>
        {counts.map((tier) => {
          const has = tier.entries.length > 0;
          return (
            <View key={tier.key} style={styles.tierColumn}>
              <View style={[styles.tierBox, has && { backgroundColor: tier.color }]}>
                <Text style={[styles.tierBoxText, !has && styles.tierBoxTextEmpty]}>{tier.key}</Text>
              </View>
              <Text style={[styles.tierLegendItem, !has && styles.tierLegendEmpty]}>
                <Text style={styles.tierLegendKey}>{tier.key}</Text> {tier.entries.length}
              </Text>
            </View>
          );
        })}
      </View>
      {onSeeUntiered && untiered > 0 && (
        <Pressable onPress={onSeeUntiered} hitSlop={6} style={styles.untiered}>
          <Text style={styles.untieredText}>
            {untiered === 1
              ? t("1 watched movie isn't tiered yet")
              : t("{untieredCount} watched movies aren't tiered yet", { untieredCount: untiered })}
            {" ›"}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

// Boards as a shelf of square covers. Yours ends with a "New list" tile
// (`onCreate`).
export const BoardsRail = ({ boards, onOpen, onCreate }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const items = boards.map((board) => ({
    key: board.id,
    onPress: () => onOpen(board),
    title: board.name,
    meta: t("{count} movies", { count: board.movieIds.length }),
    content: <BoardCover movies={board.movieIds.map(getMovieById).filter(Boolean)} size={TILE} />,
  }));
  if (onCreate) {
    items.push({
      key: "new-board",
      onPress: onCreate,
      title: t("New list"),
      meta: t("Another mood"),
      content: (
        <View style={styles.newTile}>
          <Plus size={28} color={colors.textSecondary} strokeWidth={1.6} />
        </View>
      ),
    });
  }
  return <ShelfRail itemWidth={BOX_ITEM} items={items} />;
};

// Your last watches as a poster grid, four across, newest first — each
// with the tier you gave it as a small badge on its corner and the day
// under it. Tap one for the film. `entries`: { movieId, timestamp,
// tier|rating }.
const RECENT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const RECENT_COLUMNS = 4;
const RECENT_GAP = 8;
export const RecentPosters = ({ entries, count = 8, onOpen }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const posterWidth = Math.floor((width - spacing.md * 2 - RECENT_GAP * (RECENT_COLUMNS - 1)) / RECENT_COLUMNS);
  const items = [...entries]
    .filter((entry) => entry.timestamp)
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((entry) => ({ entry, movie: getMovieById(entry.movieId) }))
    .filter(({ movie }) => movie)
    .slice(0, count);
  if (items.length === 0) {
    return <SectionEmpty line={t("Mark a movie as watched and it shows here.")} />;
  }
  return (
    <View style={styles.recentGrid}>
      {items.map(({ entry, movie }) => {
        const date = new Date(entry.timestamp);
        const tier = getTierInfo(getTier(entry));
        return (
          <Pressable
            key={`${entry.movieId}-${entry.timestamp}`}
            style={({ pressed }) => [{ width: posterWidth }, pressed && styles.pressed]}
            onPress={() => onOpen(movie.id)}
            accessibilityRole="button"
            accessibilityLabel={tier ? `${movie.title}, ${tier.key}` : movie.title}
          >
            <View>
              <MoviePoster uri={movie.poster} style={{ width: posterWidth, aspectRatio: 2 / 3 }} />
              {tier && (
                <View style={[styles.recentTier, { backgroundColor: tier.color }]}>
                  <Text style={styles.recentTierText}>{tier.key}</Text>
                </View>
              )}
            </View>
            <Text style={styles.recentDate} numberOfLines={1}>
              {t(RECENT_MONTHS[date.getMonth()])} {date.getDate()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    pressed: {
      opacity: 0.75,
    },
    fill: {
      width: "100%",
      height: "100%",
    },

    // A section: a hairline across the page above it (the section reaches
    // the screen's edges; its content keeps the margins).
    section: {
      marginHorizontal: -spacing.md,
      paddingHorizontal: spacing.md,
      marginTop: spacing.section,
    },
    tagRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      marginBottom: spacing.sm + 2,
    },
    // The title and its ›, together.
    heading: {
      flexShrink: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    // Section names: big and bold, as in Apple Music.
    tagText: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      lineHeight: 27,
      letterSpacing: -0.3,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    // An action word at the end, in the signature colour.
    seeAllText: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.brand,
    },
    // A row of tiles cancels the page's side padding, so it reaches both
    // screen edges.
    bleed: {
      marginHorizontal: -spacing.md,
    },
    empty: {
      gap: spacing.xs + 2,
    },
    emptyLine: {
      ...typography.body,
      color: colors.textSecondary,
    },
    emptyAction: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },

    // Recently watched
    recentGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: RECENT_GAP,
      rowGap: spacing.md,
    },
    // The tier, a small square on the poster's top-left corner.
    recentTier: {
      position: "absolute",
      top: 4,
      start: 4,
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 5,
    },
    recentTierText: {
      ...typography.label,
      fontSize: 11,
      lineHeight: 14,
      color: "#0C0C0C",
    },
    recentDate: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textSecondary,
      marginTop: 6,
      textAlign: "center",
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    newTile: {
      width: TILE,
      height: TILE,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: shape.control,
    },

    // Tiers
    tierBar: {
      flexDirection: "row",
      gap: 6,
    },
    tierColumn: {
      flex: 1,
      alignItems: "center",
      gap: spacing.xs + 2,
    },
    tierBox: {
      alignSelf: "stretch",
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
      borderRadius: shape.control - 4,
    },
    tierBoxText: {
      ...typography.label,
      fontSize: 13,
      color: "#0C0C0C",
    },
    tierBoxTextEmpty: {
      color: colors.textMuted,
    },
    tierLegendItem: {
      ...typography.caption,
      color: colors.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    tierLegendKey: {
      fontFamily: typography.bodyBold.fontFamily,
      color: colors.textPrimary,
    },
    tierLegendEmpty: {
      opacity: 0.45,
    },
    untiered: {
      marginTop: spacing.sm + 4,
    },
    untieredText: {
      ...typography.caption,
      color: colors.textSecondary,
    },

  });

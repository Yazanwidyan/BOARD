import { Plus } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { DIMENSIONS } from "../data/vibes";
import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getSagaRank, getSagas } from "../utils/collections";
import { buildRecap, getRecapPeriods } from "../utils/recap";
import { TIERS, getTier } from "../utils/tiers";
import { Text } from "./AppText";
import { BoardCover } from "./BoardCover";
import { CollectionCollage } from "./CollectionCollage";
import { MoviePoster } from "./MoviePoster";

// The sections of a profile under the top ten — each one row high, a
// preview of something bigger that opens on tap: Taste DNA, saga ranks,
// tiers, boards and the recap. Profile and a friend's page both use them.

const RAIL_GAP = 2;
const SAGA_CARD = 128;
const BOARD_CARD = 128;
// A tier's share of the bar below this hides its letter (it wouldn't fit).
const LETTER_MIN_SHARE = 0.07;
const DOT = 10;

// A section's title, with "See all" (or another action) at the end.
export const ProfileSectionHeader = ({ title, actionLabel, onAction }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {onAction && (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.headerAction}>{actionLabel ?? t("See all")} ›</Text>
        </Pressable>
      )}
    </View>
  );
};

// A sideways row, edge to edge, starting in line with the page.
const Rail = ({ children, styles }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.rail}
    contentContainerStyle={styles.railRow}
  >
    {children}
  </ScrollView>
);

// Taste DNA in brief: your watcher type, then each of the six dimensions
// as a line between its two ends with a dot where you sit — the end you
// lean towards is lit. Tap for the whole card.
export const TasteSnapshot = ({ dna, onOpen }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  if (!dna.hasDna) {
    return (
      <Pressable style={styles.card} onPress={onOpen}>
        <Text style={styles.cardTitle}>{t("Not mapped yet")}</Text>
        <Text style={styles.cardLine}>
          {t("Tier a few movies and we'll map it — how dark, how fast, how twisty you like them.")}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onOpen}
      accessibilityRole="button"
    >
      <Text style={[styles.archetype, { color: colors.rating }]}>
        {t(dna.archetype.name)}
      </Text>
      <Text style={styles.cardLine} numberOfLines={2}>
        {t(dna.archetype.line)}
      </Text>
      <View style={styles.dims}>
        {DIMENSIONS.map((dimension, index) => {
          const value = dna.fingerprint[index];
          const lean = value - 3;
          const position = Math.min(1, Math.max(0, (value - 1) / 4));
          return (
            <View key={dimension.key} style={styles.dim}>
              <Text
                style={[styles.dimEnd, styles.dimLow, lean <= -0.5 && styles.dimLit]}
                numberOfLines={1}
              >
                {t(dimension.low)}
              </Text>
              <View style={styles.dimTrack}>
                <View style={styles.dimMid} />
                <View
                  style={[
                    styles.dimDot,
                    { start: `${position * 100}%` },
                    Math.abs(lean) >= 0.5 && { backgroundColor: colors.rating },
                  ]}
                />
              </View>
              <Text
                style={[styles.dimEnd, lean >= 0.5 && styles.dimLit]}
                numberOfLines={1}
              >
                {t(dimension.high)}
              </Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
};

// The sagas someone has started: furthest along first, finished ones
// last. Each shows the rank reached and how far to the next. With none
// started, a line pointing to them (`onBrowse`) — or nothing.
export const SagaRanksRail = ({ watchedIds, onOpen, onBrowse }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const sagas = getSagas()
    .map((collection) => ({ collection, ...getSagaRank(collection, watchedIds) }))
    .filter(({ watchedCount }) => watchedCount > 0)
    .sort((a, b) => {
      const aDone = a.watchedCount === a.total;
      const bDone = b.watchedCount === b.total;
      if (aDone !== bDone) return aDone ? 1 : -1;
      return b.watchedCount / b.total - a.watchedCount / a.total;
    });

  if (sagas.length === 0) {
    if (!onBrowse) return null;
    return (
      <Pressable style={styles.card} onPress={onBrowse}>
        <Text style={styles.cardLine}>
          {t("Watch a film from a saga to start climbing its ranks.")}
        </Text>
        <Text style={styles.cardAction}>{t("Browse sagas")} ›</Text>
      </Pressable>
    );
  }

  return (
    <Rail styles={styles}>
      {sagas.map(({ collection, current, next, watchedCount, total }) => (
        <Pressable
          key={collection.id}
          style={({ pressed }) => [{ width: SAGA_CARD }, pressed && styles.pressed]}
          onPress={() => onOpen(collection.id)}
          accessibilityLabel={collection.title}
        >
          <CollectionCollage collection={collection} watchedIds={watchedIds} size={SAGA_CARD} />
          <Text style={styles.itemTitle} numberOfLines={1}>
            {collection.title}
          </Text>
          <Text
            style={[styles.itemMeta, current && { color: colors.rating }]}
            numberOfLines={1}
          >
            {current ? current.title : `${watchedCount}/${total}`}
          </Text>
          <Text style={styles.itemMeta} numberOfLines={1}>
            {next
              ? t("{count} more to {rank}", { count: next.at - watchedCount, rank: next.title })
              : t("Complete")}
          </Text>
        </Pressable>
      ))}
    </Rail>
  );
};

// Tiers in brief: one bar split by how many films sit in each tier (the
// letter on each part, the counts under it). Tapping it (`onPress`) opens
// the whole tier list. `onSeeUntiered` (yours) adds a line about the ones
// not tiered yet.
export const TierSummary = ({ entries, onPress, onSeeUntiered }) => {
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
      <Pressable style={styles.card} onPress={onSeeUntiered} disabled={!onSeeUntiered}>
        <Text style={styles.cardLine}>
          {t("Tier what you watch and the tier list builds here.")}
        </Text>
        {onSeeUntiered && untiered > 0 && (
          <Text style={styles.cardAction}>{t("See untiered")} ›</Text>
        )}
      </Pressable>
    );
  }

  return (
    <View>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => pressed && styles.pressed}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={counts
          .filter((tier) => tier.entries.length > 0)
          .map((tier) => `${tier.key} ${tier.entries.length}`)
          .join(", ")}
      >
        <View style={styles.tierBar}>
          {counts
            .filter((tier) => tier.entries.length > 0)
            .map((tier) => (
              <View
                key={tier.key}
                style={[styles.tierPart, { flex: tier.entries.length, backgroundColor: tier.color }]}
              >
                {tier.entries.length / tiered >= LETTER_MIN_SHARE && (
                  <Text style={styles.tierPartText}>{tier.key}</Text>
                )}
              </View>
            ))}
        </View>
        <View style={styles.tierLegend}>
          {counts.map((tier) => (
            <Text
              key={tier.key}
              style={[styles.tierLegendItem, tier.entries.length === 0 && styles.tierLegendEmpty]}
            >
              <Text style={styles.tierLegendKey}>{tier.key}</Text> {tier.entries.length}
            </Text>
          ))}
        </View>
      </Pressable>

      {onSeeUntiered && untiered > 0 && (
        <Pressable onPress={onSeeUntiered} hitSlop={6} style={styles.untiered}>
          <Text style={styles.untieredText}>
            {untiered === 1
              ? t("1 watched movie isn't tiered yet")
              : t("{untieredCount} watched movies aren't tiered yet", { untieredCount: untiered })}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

// Boards as a row of square covers. Yours ends with a "New board" tile
// (`onCreate`); without one, `emptyText` shows when there are none.
export const BoardsRail = ({ boards, onOpen, onCreate, emptyText }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  if (boards.length === 0 && !onCreate) {
    return emptyText ? <Text style={styles.emptyText}>{emptyText}</Text> : null;
  }

  return (
    <Rail styles={styles}>
      {boards.map((board) => (
        <Pressable
          key={board.id}
          style={({ pressed }) => [{ width: BOARD_CARD }, pressed && styles.pressed]}
          onPress={() => onOpen(board)}
          accessibilityLabel={board.name}
        >
          <BoardCover movies={board.movieIds.map(getMovieById).filter(Boolean)} size={BOARD_CARD} />
          <Text style={styles.itemTitle} numberOfLines={1}>
            {board.name}
          </Text>
          <Text style={styles.itemMeta}>{t("{count} movies", { count: board.movieIds.length })}</Text>
        </Pressable>
      ))}
      {onCreate && (
        <Pressable
          style={({ pressed }) => [{ width: BOARD_CARD }, pressed && styles.pressed]}
          onPress={onCreate}
          accessibilityRole="button"
        >
          <View style={styles.newBoard}>
            <Plus size={28} color={colors.textSecondary} strokeWidth={1.5} />
          </View>
          <Text style={styles.itemTitle}>{t("New board")}</Text>
          <Text style={styles.itemMeta}>
            {boards.length === 0 ? t("Rainy day, date night…") : t("Another mood")}
          </Text>
        </Pressable>
      )}
    </Rail>
  );
};

// This month on ReelBoard: what you've watched so far, its best films
// fanned out at the end. Opens the recap.
export const RecapCard = ({ watched, onOpen }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [period] = getRecapPeriods();
  const recap = buildRecap(watched, period);
  const hours = Math.round(recap.minutes / 60);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, styles.recap, pressed && styles.pressed]}
      onPress={onOpen}
      accessibilityRole="button"
    >
      <View style={styles.recapText}>
        <Text style={styles.cardTitle}>{t("Your recap")}</Text>
        <Text style={styles.cardLine} numberOfLines={2}>
          {recap.count > 0
            ? t("{count} movies this month · {hours}h — ready to share", {
                count: recap.count,
                hours,
              })
            : t("Your month on ReelBoard, ready to share")}
        </Text>
      </View>
      {recap.favourites.length > 0 && (
        <View style={styles.recapPosters}>
          {recap.favourites.slice(0, 3).map(({ movie }, index) => (
            <MoviePoster
              key={movie.id}
              uri={movie.poster}
              style={[styles.recapPoster, index > 0 && styles.recapPosterOverlap]}
            />
          ))}
        </View>
      )}
      <Text style={styles.recapChevron}>›</Text>
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    pressed: {
      opacity: 0.8,
    },
    header: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: spacing.sm,
      marginTop: spacing.lg,
      marginBottom: spacing.sm + 2,
    },
    headerTitle: {
      ...typography.title,
      fontSize: 17,
      color: colors.textPrimary,
    },
    headerAction: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    // Rows cancel the page's side padding: edge to edge, starting in line
    // with the page.
    rail: {
      marginHorizontal: -spacing.md,
    },
    railRow: {
      gap: RAIL_GAP,
      paddingHorizontal: spacing.md,
    },
    itemTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
      marginTop: spacing.xs + 2,
    },
    itemMeta: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    emptyText: {
      ...typography.body,
      color: colors.textSecondary,
    },

    // A band edge to edge, like the Taste DNA card.
    card: {
      marginHorizontal: -spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
    },
    cardTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    cardLine: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 2,
    },
    cardAction: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },

    // Taste DNA
    archetype: {
      ...typography.hero,
      fontSize: 22,
      lineHeight: 27,
    },
    dims: {
      marginTop: spacing.md,
      gap: spacing.sm + 2,
    },
    dim: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    dimEnd: {
      ...typography.caption,
      flex: 1,
      color: colors.textMuted,
    },
    dimLow: {
      textAlign: "right",
    },
    dimLit: {
      fontFamily: typography.bodyBold.fontFamily,
      color: colors.textPrimary,
    },
    dimTrack: {
      width: 96,
      height: DOT,
      justifyContent: "center",
    },
    dimMid: {
      position: "absolute",
      start: 0,
      end: 0,
      height: 2,
      backgroundColor: colors.surfaceSoft,
    },
    dimDot: {
      position: "absolute",
      width: DOT,
      height: DOT,
      borderRadius: DOT / 2,
      marginStart: -DOT / 2,
      backgroundColor: colors.textSecondary,
    },

    // Tiers
    tierBar: {
      flexDirection: "row",
      height: 28,
      gap: 2,
    },
    tierPart: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: 4,
    },
    tierPartText: {
      ...typography.label,
      fontSize: 12,
      color: "#0C1014",
    },
    tierLegend: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.xs + 2,
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
      marginTop: spacing.sm + 2,
    },
    untieredText: {
      ...typography.caption,
      color: colors.textSecondary,
      textDecorationLine: "underline",
    },

    // Boards
    newBoard: {
      width: BOARD_CARD,
      height: BOARD_CARD,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },

    // Recap
    recap: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    recapText: {
      flex: 1,
    },
    recapPosters: {
      flexDirection: "row",
    },
    recapPoster: {
      width: 40,
      height: 60,
      borderWidth: 2,
      borderColor: colors.card,
    },
    recapPosterOverlap: {
      marginStart: -16,
    },
    recapChevron: {
      ...typography.title,
      color: colors.textSecondary,
    },
  });

import { Plus } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getCollectionCompletedAt, getSagas } from "../utils/collections";
import { buildRecap, getRecapPeriods } from "../utils/recap";
import { TIERS, getTier } from "../utils/tiers";
import { Text } from "./AppText";
import { BoardCover } from "./BoardCover";
import { CollectionCollage } from "./CollectionCollage";
import { MoviePoster } from "./MoviePoster";
import { ShelfRail } from "./ShelfRail";
import { TasteDnaBars } from "./TasteDnaBars";

// A profile's sections, built like the rest of the app (Home's shelves):
// a bold title with "See all" at the end, and the content straight on the
// page — rows of tiles run edge to edge (ShelfRail, the same tile size as
// Home's sagas). Profile and a friend's page both use them.

// Home's saga tiles: 142 wide, with their 1px side padding.
const BOX_ITEM = 142;
const TILE = BOX_ITEM - 2;
// A tier's share of the bar below this hides its letter (it wouldn't fit).
const LETTER_MIN_SHARE = 0.07;

// One section: its title and action, then its content. `onPress` makes
// the content a button (it opens the full view, like the action). `rail`:
// the content is a sideways row that runs to the screen's edges.
export const ProfileSection = ({ title, actionLabel, onAction, onPress, rail = false, children }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.section}>
      <View style={styles.tagRow}>
        <Text style={styles.tagText} numberOfLines={1}>
          {title}
        </Text>
        {onAction && (
          <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
            <Text style={styles.seeAllText}>{actionLabel ?? t("See all")}</Text>
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

// Finished sagas as a shelf of box sets, like Home's sagas: each its cover
// (four of its posters, 2 × 2, with the gold "Complete" corner), then its
// top rank in gold and the saga — or, when the top rank shares the saga's
// name ("Goodfellas"), who it's about.
export const FinishedSagasRail = ({ watched, onOpen }) => {
  const colors = useColors();
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  return (
    <ShelfRail
      itemWidth={BOX_ITEM}
      items={getFinishedSagas(watched).map(({ collection, top }) => {
        // Under the rank: the saga, unless the rank already says it.
        const sameName =
          !!top && top.title.trim().toLowerCase() === collection.title.trim().toLowerCase();
        return {
          key: collection.id,
          onPress: () => onOpen(collection.id),
          title: top ? t(top.title) : t("Complete"),
          titleColor: colors.rating,
          meta: sameName ? collection.person ?? t(collection.title) : t(collection.title),
          content: <CollectionCollage collection={collection} watchedIds={watchedIds} size={TILE} />,
        };
      })}
    />
  );
};

// Tiers in brief: one bar split by how many films sit in each tier (the
// letter on each part, the counts under it). `onSeeUntiered` (yours) adds
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
      <View style={styles.tierBar}>
        {counts
          .filter((tier) => tier.entries.length > 0)
          .map((tier) => (
            <View key={tier.key} style={[styles.tierPart, { flex: tier.entries.length, backgroundColor: tier.color }]}>
              {tier.entries.length / tiered >= LETTER_MIN_SHARE && (
                <Text style={styles.tierPartText}>{tier.key}</Text>
              )}
            </View>
          ))}
      </View>
      <View style={styles.tierLegend}>
        {counts.map((tier) => (
          <Text key={tier.key} style={[styles.tierLegendItem, tier.entries.length === 0 && styles.tierLegendEmpty]}>
            <Text style={styles.tierLegendKey}>{tier.key}</Text> {tier.entries.length}
          </Text>
        ))}
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

// Boards as a shelf of square covers. Yours ends with a "New board" tile
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
      title: t("New board"),
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

// This month on ReelBoard, as Home's recap banner: how much you've watched
// so far, its best films at the end. Opens the recap.
export const RecapBanner = ({ watched, onOpen }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [period] = getRecapPeriods();
  const recap = buildRecap(watched, period);
  const hours = Math.round(recap.minutes / 60);

  return (
    <Pressable
      style={({ pressed }) => [styles.recapBanner, pressed && styles.pressed]}
      onPress={onOpen}
      accessibilityRole="button"
    >
      <View style={styles.recapText}>
        <Text style={styles.recapTitle}>{t("Your recap")}</Text>
        <Text style={styles.recapHint} numberOfLines={2}>
          {recap.count > 0
            ? t("{count} movies this month · {hours}h — ready to share", { count: recap.count, hours })
            : t("Your month on ReelBoard, ready to share")}{" "}
          ›
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
    </Pressable>
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

    // A section — Home's shelves: 32 apart, a bold title, "See all".
    section: {
      marginTop: spacing.xl,
    },
    tagRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      marginBottom: spacing.sm + 2,
    },
    tagText: {
      ...typography.title,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.3,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    seeAllText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
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
      color: colors.textPrimary,
    },

    newTile: {
      width: TILE,
      height: TILE,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
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
      marginTop: spacing.sm + 4,
    },
    untieredText: {
      ...typography.caption,
      color: colors.textSecondary,
    },

    // Recap: Home's banner — a card, the title, a hint.
    recapBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.xl,
      padding: spacing.md,
      backgroundColor: colors.card,
    },
    recapText: {
      flex: 1,
      gap: 2,
    },
    recapTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    recapHint: {
      ...typography.caption,
      color: colors.textSecondary,
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
  });

import { ChevronRight, Dices, Heart, Layers, RefreshCw, Target } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "./AppText";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { t, useIsRTL } from "../i18n";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getRanksFromWatching } from "../utils/ranks";
import { countFinishedDares } from "../utils/useRanks";

// The icon's circle on every card.
const ICON_CIRCLE = 38;

// Ways to go, stacked: each the same rounded card as Home's ways to
// decide — its icon in a circle, its name and a line on what it does — with
// a ›. `rows`: [{ key, Icon, label, hint, onPress }]. Watch together.
export const ActionList = ({ rows }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const rtl = useIsRTL();
  return (
    <View style={styles.list}>
      {rows.map(({ key, Icon, label, hint, onPress }) => (
        <Pressable
          key={key}
          style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${hint}`}
        >
          <View style={styles.pillIcon}>
            <Icon size={20} color={colors.textPrimary} strokeWidth={2} />
          </View>
          <View style={styles.pillWords}>
            <Text style={styles.pillLabel} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.pillHint} numberOfLines={2}>
              {hint}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} style={rtl && styles.flipped} />
        </Pressable>
      ))}
    </View>
  );
};

// Home's ways to decide, as a row of rounded cards you scroll sideways:
// each its icon in a circle, its name and a line on what it does. The last
// is your dare — its film and the ranks it earns, with a small ⟳ to swap
// it — or what a dare is.
// `dare`: the active challenge, or null; `onDare` opens it (or starts one).
// `chips`: a row of small pills (Home, under the mixes), not cards.
export const DecideWays = ({ onWildcard, onSwipe, onSimilar, dare, onDare, onNewDare, chips = false }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  // A card and a bit of the next on screen, so it reads as a row to scroll.
  const cardWidth = Math.round((width - spacing.md * 2) * 0.62);
  // Re-render when the dare's film arrives (data/movies).
  useMoviesVersion();
  const watched = useMovieStore((state) => state.watched);
  const history = useChallengeStore((state) => state.history);
  const movie = dare ? getMovieById(dare.targetMovieId) : null;
  // Worked out live, so it stays true as your history changes.
  const rankGain = dare
    ? getRanksFromWatching(watched, dare.targetMovieId, countFinishedDares(history), {
        finishesDare: true,
      }).length
    : 0;
  const reward =
    rankGain === 0 ? null : rankGain === 1 ? t("+1 rank") : t("+{count} ranks", { count: rankGain });

  const ways = [
    { key: "wildcard", Icon: Dices, label: t("Surprise me"), hint: t("One film, a surprise"), onPress: onWildcard },
    { key: "swipe", Icon: Layers, label: t("Sort a pile"), hint: t("Your watchlist, a genre and more"), onPress: onSwipe },
    { key: "similar", Icon: Heart, label: t("More like…"), hint: t("Films like one you love"), onPress: onSimilar },
    {
      key: "dare",
      Icon: Target,
      tint: colors.dare,
      label: dare ? t("Your dare") : t("Dare"),
      hint: dare
        ? [movie?.title ?? t(dare.difficultyLabel), reward].filter(Boolean).join(" · ")
        : t("Watch it, earn ranks"),
      onPress: onDare,
      onSwap: dare ? onNewDare : undefined,
    },
  ];

  if (chips) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {ways.map(({ key, Icon, label, hint, onPress, onSwap, tint }) => (
          <View key={key} style={[styles.chip, tint && { borderColor: tint }]}>
            <Pressable
              style={({ pressed }) => [styles.chipMain, pressed && styles.pillPressed]}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={`${label}. ${hint}`}
            >
              <Icon size={16} color={tint ?? colors.textPrimary} strokeWidth={2.2} />
              <Text style={[styles.chipText, tint && { color: tint }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
            {onSwap && (
              <Pressable
                style={({ pressed }) => [styles.chipSwap, pressed && styles.pillPressed]}
                onPress={onSwap}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t("Change dare")}
              >
                <RefreshCw size={14} color={tint ?? colors.textPrimary} strokeWidth={2.2} />
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.waysRow}
      snapToInterval={cardWidth + spacing.sm}
      snapToAlignment="start"
      decelerationRate="fast"
    >
      {ways.map(({ key, Icon, label, hint, onPress, onSwap, tint }) => (
        <Pressable
          key={key}
          style={({ pressed }) => [
            styles.pill,
            { width: cardWidth },
            pressed && styles.pillPressed,
          ]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${hint}`}
        >
          {/* A feature's own colour (the dare's orange) tints its icon. */}
          <View style={[styles.pillIcon, tint && { backgroundColor: `${tint}2E` }]}>
            <Icon size={20} color={tint ?? colors.textPrimary} strokeWidth={2} />
          </View>
          <View style={styles.pillWords}>
            <Text style={styles.pillLabel} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.pillHint} numberOfLines={2}>
              {hint}
            </Text>
          </View>
          {onSwap && (
            <Pressable
              style={({ pressed }) => [styles.swap, pressed && styles.pillPressed]}
              onPress={onSwap}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("Change dare")}
            >
              <RefreshCw size={15} color={colors.textPrimary} strokeWidth={2} />
            </Pressable>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Stacked cards, inside the page's margins.
    list: {
      gap: spacing.sm,
    },
    // The ways to decide: a row you scroll, inside the page's margins.
    waysRow: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    // The card: rounded, a step above the page, its icon in a circle.
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      minHeight: 64,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.sm + 4,
      backgroundColor: colors.cardElevated,
      borderRadius: shape.card,
    },
    // The chips: a row you scroll, each a rounded pill (the dare's in its
    // orange), the dare's with its swap after a hairline.
    chipRow: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      height: 38,
      backgroundColor: colors.card,
      borderRadius: shape.chip,
      borderWidth: 1,
      borderColor: "transparent",
    },
    chipMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      height: "100%",
      paddingHorizontal: spacing.md,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textPrimary,
    },
    chipSwap: {
      height: "100%",
      justifyContent: "center",
      paddingStart: spacing.sm,
      paddingEnd: spacing.md - 2,
      borderStartWidth: StyleSheet.hairlineWidth,
      borderStartColor: colors.border,
    },
    pillPressed: {
      opacity: 0.75,
    },
    pillIcon: {
      width: ICON_CIRCLE,
      height: ICON_CIRCLE,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
      borderRadius: ICON_CIRCLE / 2,
    },
    pillWords: {
      flex: 1,
      gap: 1,
    },
    // Swap the dare: a small round button at the card's end.
    swap: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
      borderRadius: 16,
    },
    pillLabel: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 19,
      color: colors.textPrimary,
    },
    pillHint: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 15,
      color: colors.textSecondary,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
  });

export default DecideWays;

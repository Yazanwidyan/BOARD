import { RefreshCw } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { t } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

const COLUMNS = 3;
const GAP = spacing.sm + 2;

// The moods along the top: one tap narrows the three (see moodFits).
export const TONIGHT_MOODS = [
  { key: "any", label: "Any" },
  { key: "light", label: "Feel-good" },
  { key: "intense", label: "Intense" },
  { key: "short", label: "Under 2h" },
  { key: "together", label: "Together" },
];

// Whether a film fits a mood — from its runtime, and its Taste DNA
// (data/vibes: dark, pace, mind, heavy, scale, unreal, each 1–5).
export const moodFits = (movie, moodKey) => {
  const [dark, pace, mind, heavy] = movie.vibe?.dims ?? [3, 3, 3, 3];
  switch (moodKey) {
    case "light":
      return dark <= 2 && heavy <= 3;
    case "intense":
      return dark >= 4 || pace >= 4 || heavy >= 4;
    case "short":
      return !!movie.runtime && movie.runtime <= 120;
    // Easy to share: nothing too heavy, too knotty or too scary.
    case "together":
      return heavy <= 3 && mind <= 3 && !(movie.genres ?? []).includes("Horror");
    default:
      return true;
  }
};

// Home's "Your 3 for tonight": three picks side by side — choosing from
// three is quick, and seeing them together beats judging one at a time.
// A mood on top narrows them; "3 more" brings the next three. Each: its
// poster, name, match and one reason; tap one for its page (`onOpen`).
// `picks`: [{ movie, match, reason }] — the three; `mood` / `onMood`;
// `onMore`.
export const TonightThree = ({ picks, mood, onMood, onMore, onOpen }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const inner = width - spacing.md * 2 - spacing.md * 2;
  const tile = Math.floor((inner - GAP * (COLUMNS - 1)) / COLUMNS);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.heading}>{t("Your 3 for tonight")}</Text>
        <Pressable
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          onPress={onMore}
          hitSlop={8}
          accessibilityRole="button"
        >
          <RefreshCw size={14} color={colors.textSecondary} strokeWidth={2.2} />
          <Text style={styles.moreText}>{t("3 more")}</Text>
        </Pressable>
      </View>

      {/* One tap: the mood for tonight. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.moods}
        style={styles.moodsRow}
      >
        {TONIGHT_MOODS.map((item) => {
          const on = item.key === mood;
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [styles.moodChip, on && styles.moodChipOn, pressed && styles.pressed]}
              onPress={() => onMood(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.moodText, on && styles.moodTextOn]}>{t(item.label)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {picks.length === 0 ? (
        <Text style={styles.empty}>{t("Nothing like that right now — try another mood.")}</Text>
      ) : (
        <View style={styles.row}>
          {picks.map(({ movie, match, reason }) => (
            <Animated.View key={movie.id} entering={FadeIn.duration(240)} style={{ width: tile }}>
              <Pressable
                onPress={() => onOpen(movie)}
                style={({ pressed }) => pressed && styles.pressed}
                accessibilityRole="button"
                accessibilityLabel={[movie.title, match != null && t("{match}% match", { match }), reason]
                  .filter(Boolean)
                  .join(". ")}
              >
                <MoviePoster uri={movie.poster} style={{ width: tile, height: Math.round(tile * 1.5) }} shadow />
                <Text style={styles.title} numberOfLines={1}>
                  {movie.title}
                </Text>
                {match != null && (
                  <Text style={styles.match}>{t("{match}% match", { match })}</Text>
                )}
                {!!reason && (
                  <Text style={styles.reason} numberOfLines={2}>
                    {reason}
                  </Text>
                )}
              </Pressable>
            </Animated.View>
          ))}
        </View>
      )}

    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    pressed: {
      opacity: 0.75,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    heading: {
      ...typography.section,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    more: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    moreText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    moodsRow: {
      marginTop: spacing.sm + 2,
      flexGrow: 0,
    },
    moods: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    // Moods: pills, the chosen one in the signature colour.
    moodChip: {
      paddingHorizontal: spacing.md - 2,
      paddingVertical: 6,
      borderRadius: shape.chip,
      backgroundColor: colors.cardElevatedLight,
    },
    moodChipOn: {
      backgroundColor: colors.brand,
    },
    moodText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    moodTextOn: {
      color: colors.brandText,
    },
    row: {
      flexDirection: "row",
      gap: GAP,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
    },
    title: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    match: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      color: colors.success,
      marginTop: 2,
    },
    reason: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textMuted,
      marginTop: 2,
    },
    empty: {
      ...typography.body,
      fontSize: 14,
      lineHeight: 19,
      color: colors.textMuted,
      textAlign: "center",
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
    },
  });

export default TonightThree;

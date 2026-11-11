import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { t } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { TEN } from "../utils/myTen";
import { getTierInfo } from "../utils/tiers";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";
import { TierBadge } from "./TierBadge";

const COLUMNS = 5;
const GAP = spacing.sm;

// The title (utils/myTen): a gold S and your #1 — "S · Heat". Before your
// first S, a plain S and, on your own profile, "Your first S is still out
// there" (a friend's says they have none yet).
export const CrownTitle = ({ crown, mine = true, onPress, style }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <Pressable
      onPress={crown ? onPress : undefined}
      disabled={!crown || !onPress}
      style={({ pressed }) => [styles.crown, pressed && styles.pressed, style]}
      accessibilityRole={crown && onPress ? "button" : "text"}
    >
      <TierBadge tier="S" size={22} muted={!crown} />
      <Text style={[styles.crownText, !crown && styles.crownEmpty]} numberOfLines={1}>
        {crown ? crown.title : mine ? t("Your first S is still out there") : t("No S yet")}
      </Text>
    </Pressable>
  );
};

// The Ten: TEN slots, five across — the films in them, the rest empty
// frames waiting for an S. `ring`: ids to ring in gold (on a friend's, the
// ones you tiered S too). `onPressSlot(movie)`.
export const TenGrid = ({ movies, onPressSlot, ring = null }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const slot = Math.floor((width - spacing.md * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const gold = getTierInfo("S").color;
  return (
    <View style={styles.grid}>
      {Array.from({ length: TEN }, (_, index) => {
        const movie = movies[index];
        if (!movie) {
          return <View key={`empty-${index}`} style={[styles.empty, { width: slot, height: Math.round(slot * 1.5) }]} />;
        }
        const ringed = ring?.has(movie.id);
        return (
          <Pressable
            key={movie.id}
            onPress={() => onPressSlot?.(movie)}
            style={({ pressed }) => [{ width: slot }, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${index + 1}. ${movie.title}`}
          >
            <MoviePoster uri={movie.poster} style={[{ width: slot, height: Math.round(slot * 1.5) }, ringed && { borderWidth: 2, borderColor: gold }]} />
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    pressed: {
      opacity: 0.7,
    },
    crown: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      maxWidth: "100%",
    },
    crownText: {
      ...typography.bodyBold,
      fontSize: 16,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    crownEmpty: {
      ...typography.body,
      color: colors.textSecondary,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GAP,
    },
    // An empty slot: a frame waiting for an S.
    empty: {
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.border,
      borderRadius: shape.poster,
    },
  });

export default TenGrid;

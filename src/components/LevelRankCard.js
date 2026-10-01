import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { RankGemIcon } from "./icons/RankGemIcon";

// Level (numeric, fine-grained) and Rank (permanent, coarse) shown together
// but visually distinct — same underlying XP, two different lenses on it.
// Shared by Profile and Home so "your progress" always looks identical.
export const LevelRankCard = ({ level, rank, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <View>
          <Text style={styles.levelLabel}>LEVEL {level.level}</Text>
          <Text style={styles.levelName}>{level.name}</Text>
        </View>
        <View style={styles.rankBlock}>
          <RankGemIcon size={26} color={rank.color} />
          <Text style={[styles.rankLabel, { color: rank.color }]}>
            {rank.tier}
          </Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[styles.barFill, { width: `${level.progress * 100}%` }]}
        />
      </View>
      <Text style={styles.xpText}>
        {Math.round(level.currentXP).toLocaleString()} /{" "}
        {level.requiredXP.toLocaleString()} XP
      </Text>
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    levelLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    levelName: {
      ...typography.subtitle,
      color: colors.textPrimary,
      marginTop: 2,
    },
    rankBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    rankLabel: {
      ...typography.bodyBold,
    },
    barTrack: {
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
      marginTop: spacing.md,
    },
    barFill: {
      height: "100%",
      borderRadius: radius.pill,
      backgroundColor: colors.accentLight,
    },
    xpText: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
  });

export default LevelRankCard;

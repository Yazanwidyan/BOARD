import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { TIERS } from "../utils/league";
import { RankGemIcon } from "./icons/RankGemIcon";

const GEM_SIZE = 18;
const CURRENT_GEM_SIZE = 28;

// Level (numeric, fine-grained) and Rank (permanent, coarse) shown together
// but visually distinct — same underlying XP, two different lenses on it:
// the level's progress ring wraps the avatar on Profile (AvatarLevelRing),
// so here level is just its name and XP; rank is a ladder of every tier so
// the next one — and the top one — are always in view. Each column of the
// ladder is flex: 1, so gem centers sit at (i + 0.5) / tierCount of the
// width, and the track's fill is measured in those same column units.
export const LevelRankCard = ({ level, rank, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  const tierCount = TIERS.length;
  const tierIndex = Math.max(
    0,
    TIERS.findIndex((tier) => tier.tier === rank.tier),
  );
  const nextTier = TIERS[tierIndex + 1];
  const columnPercent = 100 / tierCount;
  const fillColumns = Math.min(tierIndex + rank.progress, tierCount - 1);
  const xpToNextLevel = Math.max(
    0,
    Math.ceil(level.requiredXP - level.currentXP),
  );

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.levelRow}>
        <View style={styles.levelInfo}>
          <Text style={styles.levelEyebrow}>LEVEL {level.level}</Text>
          <Text style={styles.levelName} numberOfLines={1}>
            {level.name}
          </Text>
        </View>
        <View style={styles.levelXPBlock}>
          <Text style={styles.levelXP}>
            {Math.round(level.currentXP).toLocaleString()} /{" "}
            {level.requiredXP.toLocaleString()} XP
          </Text>
          <Text style={styles.levelNext}>
            {xpToNextLevel.toLocaleString()} XP to Level {level.level + 1}
          </Text>
        </View>
      </View>

      <View style={styles.rankHeader}>
        <Text style={styles.rankEyebrow}>
          RANK ·{" "}
          <Text style={{ color: rank.color }}>{rank.tier.toUpperCase()}</Text>
        </Text>
        <View style={styles.leagueLink}>
          <Text style={styles.leagueLinkText}>League</Text>
          <ChevronRight size={14} color={colors.textSecondary} />
        </View>
      </View>

      <View style={styles.ladder}>
        <View
          style={[
            styles.track,
            { left: `${columnPercent / 2}%`, right: `${columnPercent / 2}%` },
          ]}
        />
        <View
          style={[
            styles.track,
            styles.trackFill,
            {
              left: `${columnPercent / 2}%`,
              width: `${fillColumns * columnPercent}%`,
            },
          ]}
        />
        {TIERS.map((tier, index) => {
          const isCurrent = index === tierIndex;
          const isReached = index <= tierIndex;
          return (
            <View key={tier.tier} style={styles.ladderColumn}>
              <View style={styles.gemSlot}>
                {isCurrent && (
                  <View
                    style={[
                      styles.currentGlow,
                      { backgroundColor: tier.color, shadowColor: tier.color },
                    ]}
                  />
                )}
                <View style={!isReached && styles.gemFuture}>
                  <RankGemIcon
                    size={isCurrent ? CURRENT_GEM_SIZE : GEM_SIZE}
                    color={tier.color}
                  />
                </View>
              </View>
              <Text
                style={[
                  styles.tierLabel,
                  isCurrent && [styles.tierLabelCurrent, { color: tier.color }],
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {tier.tier}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.rankNext}>
        {nextTier ? (
          <>
            {rank.xpToNext.toLocaleString()} XP to{" "}
            <Text style={{ color: nextTier.color }}>{nextTier.tier}</Text>
          </>
        ) : (
          "Top rank reached"
        )}
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
    levelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    levelInfo: {
      flex: 1,
      gap: 2,
    },
    levelEyebrow: {
      ...typography.label,
      color: colors.textSecondary,
    },
    levelXPBlock: {
      alignItems: "flex-end",
      gap: 2,
    },
    levelName: {
      ...typography.title,
      color: colors.textPrimary,
    },
    levelXP: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    levelNext: {
      ...typography.caption,
      color: colors.accentLight,
    },
    rankHeader: {
      marginTop: spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rankEyebrow: {
      ...typography.label,
      color: colors.textSecondary,
    },
    leagueLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    leagueLinkText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    ladder: {
      flexDirection: "row",
      marginTop: spacing.md,
    },
    // Vertically centered on the gem slot (CURRENT_GEM_SIZE tall).
    track: {
      position: "absolute",
      top: CURRENT_GEM_SIZE / 2 - 1,
      height: 2,
      borderRadius: 1,
      backgroundColor: colors.surfaceSoft,
    },
    trackFill: {
      backgroundColor: colors.accentLight,
    },
    ladderColumn: {
      flex: 1,
      alignItems: "center",
    },
    gemSlot: {
      height: CURRENT_GEM_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    currentGlow: {
      position: "absolute",
      width: CURRENT_GEM_SIZE - 8,
      height: CURRENT_GEM_SIZE - 8,
      borderRadius: CURRENT_GEM_SIZE,
      opacity: 0.35,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 8,
    },
    gemFuture: {
      opacity: 0.3,
    },
    tierLabel: {
      ...typography.caption,
      fontSize: 9,
      color: colors.textMuted,
      marginTop: 4,
    },
    tierLabelCurrent: {
      ...typography.label,
      fontSize: 9,
    },
    rankNext: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
  });

export default LevelRankCard;

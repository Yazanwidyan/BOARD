import { Crown, Layers, TrendingUp } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { describeForecast } from "../utils/ranks";
import { describeSagaStep } from "../utils/tonightPick";
import { Text } from "./AppText";

// Why a movie is (or could be) tonight's pick, under Home's banner: how
// well it fits your taste and a tag for where it came from (your
// watchlist, a dare, a mood), the main reason it fits, and where it gets
// you in a saga ("Makes you Capo in Say Hello"), and what it does for your
// ranks — one it earns tonight, or one it moves along.
// `insight`: from utils/tonightPick's getPickInsight. `tag`: { text, color }.
export const PickInsight = ({ insight, tag }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const sagaLine = describeSagaStep(insight.saga);
  const isRank = insight.saga?.type === "rank";
  const rankLine = insight.forecast ? describeForecast(insight.forecast) : null;
  const earnsRank = (insight.forecast?.gained.length ?? 0) > 0;
  const RankIcon = earnsRank ? Crown : TrendingUp;
  if (insight.match == null && !tag && !insight.reason && !sagaLine && !rankLine) return null;
  const SagaIcon = isRank ? Crown : Layers;

  return (
    <View style={styles.wrap}>
      {(insight.match != null || tag) && (
        <View style={styles.chips}>
          {insight.match != null && (
            <View style={styles.matchPill}>
              <Text style={styles.matchText}>
                {t("{match}% your taste", { match: insight.match })}
              </Text>
            </View>
          )}
          {tag && (
            <View style={styles.tag}>
              <Text style={[styles.tagText, tag.color && { color: tag.color }]} numberOfLines={1}>
                {tag.text}
              </Text>
            </View>
          )}
        </View>
      )}
      {!!insight.reason && (
        <Text style={styles.reason} numberOfLines={2}>
          {insight.reason}
        </Text>
      )}
      {!!sagaLine && (
        <View style={styles.saga}>
          <SagaIcon size={14} color={colors.rating} strokeWidth={2} />
          <Text
            style={[styles.sagaText, isRank && styles.sagaTextRank]}
            numberOfLines={2}
          >
            {sagaLine}
          </Text>
        </View>
      )}
      {!!rankLine && (
        <View style={styles.saga}>
          <RankIcon size={14} color={colors.rating} strokeWidth={2} />
          <Text style={[styles.sagaText, earnsRank && styles.sagaTextRank]} numberOfLines={2}>
            {rankLine}
          </Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.xs + 2,
      marginTop: spacing.md,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs + 2,
    },
    // Like the match on a movie's page.
    matchPill: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      backgroundColor: colors.successSoft,
    },
    matchText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.success,
    },
    tag: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      backgroundColor: colors.card,
      flexShrink: 1,
    },
    tagText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    reason: {
      ...typography.body,
      color: colors.textPrimary,
    },
    saga: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    sagaText: {
      ...typography.caption,
      flexShrink: 1,
      color: colors.textSecondary,
    },
    sagaTextRank: {
      fontFamily: typography.bodyBold.fontFamily,
      color: colors.rating,
    },
  });

export default PickInsight;

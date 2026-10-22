import { StyleSheet, View } from "react-native";

import { useMovieCommunity } from "../store/communityStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { TIERS, getAverageTier, getTierInfo } from "../utils/tiers";
import { t } from "../i18n";
import { Text } from "./AppText";

const BAR_HEIGHT = 64;
const BAR_GAP = 2;
// Low to high, left to right — F at the start, S at the end.
const ORDER = [...TIERS].reverse();

// Ratings, Letterboxd-style: everyone's tiers as a row of slate bars (F on
// the left, S on the right), with the ReelBoard tier — the average — big
// at the end. Totals only; nobody's named. Nothing until it's loaded.
// `style`: the block's own (a line above it, say); `labelStyle`: its label's.
export const TierHistogram = ({ movieId, style, labelStyle }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { data } = useMovieCommunity(movieId);
  if (!data) return null;

  const tiers = data.tiers ?? {};
  const tiered = data.tieredCount ?? 0;
  const most = Math.max(...ORDER.map((tier) => tiers[tier.key] ?? 0), 1);
  const average = getAverageTier(tiers);
  const averageInfo = average ? getTierInfo(average) : null;

  return (
    <View style={style}>
      <View style={styles.labelRow}>
        <Text style={labelStyle}>{t("Ratings")}</Text>
        {tiered > 0 && (
          <Text style={styles.count}>{t("{count} tiered", { count: tiered })}</Text>
        )}
      </View>
      {tiered > 0 ? (
        <View style={styles.chart}>
          <Text style={[styles.end, { color: getTierInfo("F").color }]}>F</Text>
          <View style={styles.bars}>
            {ORDER.map((tier) => {
              const count = tiers[tier.key] ?? 0;
              return (
                <View
                  key={tier.key}
                  style={styles.barSlot}
                  accessibilityLabel={`${tier.key}: ${count}`}
                >
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max(2, Math.round((count / most) * BAR_HEIGHT)) },
                      count === 0 && styles.barEmpty,
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.average}>
            <Text style={[styles.averageLetter, averageInfo && { color: averageInfo.color }]}>
              {average ?? "–"}
            </Text>
            <Text style={[styles.end, { color: getTierInfo("S").color }]}>S</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.none}>{t("Nobody's tiered it yet.")}</Text>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    labelRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    count: {
      ...typography.caption,
      color: colors.textMuted,
    },
    chart: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.sm,
    },
    bars: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: BAR_GAP,
      height: BAR_HEIGHT,
    },
    barSlot: {
      flex: 1,
      justifyContent: "flex-end",
    },
    bar: {
      backgroundColor: colors.selected,
    },
    barEmpty: {
      backgroundColor: colors.border,
    },
    end: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 14,
    },
    average: {
      alignItems: "flex-end",
      gap: 2,
      minWidth: 40,
    },
    averageLetter: {
      ...typography.hero,
      fontSize: 34,
      lineHeight: 38,
      color: colors.textSecondary,
    },
    none: {
      ...typography.body,
      color: colors.textMuted,
    },
  });

export default TierHistogram;

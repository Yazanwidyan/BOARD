import { StyleSheet, View } from "react-native";

import { useMovieCommunity } from "../store/communityStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { TIERS } from "../utils/tiers";
import { t } from "../i18n";
import { Text } from "./AppText";

// "ReelBoard community": how everyone tiered this movie — a bar per tier,
// in the tier's colour, with its share. Totals only (nobody's named).
// Shows nothing until it's loaded, or when nobody has watched it yet.
export const CommunityTiers = ({ movieId, labelStyle }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { data } = useMovieCommunity(movieId);
  if (!data || data.watchedCount + data.watchlistCount === 0) return null;

  const { tiers, tieredCount, watchedCount, watchlistCount } = data;
  const most = Math.max(...TIERS.map((tier) => tiers[tier.key] ?? 0), 1);
  const facts = [
    tieredCount > 0 && t("{count} tiered", { count: tieredCount }),
    t("{count} watched", { count: watchedCount }),
    watchlistCount > 0 && t("{count} saved", { count: watchlistCount }),
  ].filter(Boolean);

  return (
    <>
      <Text style={labelStyle}>{t("ReelBoard community")}</Text>
      {tieredCount > 0 ? (
        <View style={styles.bars}>
          {TIERS.map((tier) => {
            const count = tiers[tier.key] ?? 0;
            return (
              <View key={tier.key} style={styles.barRow}>
                <Text style={[styles.tierKey, { color: tier.color }]}>
                  {tier.key}
                </Text>
                <View style={styles.track}>
                  {count > 0 && (
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${(count / most) * 100}%`,
                          backgroundColor: tier.color,
                        },
                      ]}
                    />
                  )}
                </View>
                <Text style={styles.share}>
                  {Math.round((count / tieredCount) * 100)}%
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.empty}>
          {t("Nobody's tiered it yet — be the first.")}
        </Text>
      )}
      <Text style={styles.facts}>{facts.join(" · ")}</Text>
    </>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    bars: {
      gap: 6,
    },
    barRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    tierKey: {
      ...typography.hero,
      fontSize: 15,
      lineHeight: 20,
      width: 16,
      textAlign: "center",
    },
    track: {
      flex: 1,
      height: 8,
      backgroundColor: colors.card,
      borderRadius: shape.chip,
    },
    fill: {
      height: 8,
    },
    share: {
      ...typography.caption,
      color: colors.textSecondary,
      width: 36,
      textAlign: "right",
    },
    empty: {
      ...typography.body,
      color: colors.textSecondary,
    },
    facts: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
  });

export default CommunityTiers;

import { Sparkles, TrendingDown, TrendingUp } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";
import { BottomSheet } from "./BottomSheet";

// A factor's bar reaches the end of its half at this much pull.
const FULL_PULL = 3;
const BAR_HEIGHT = 6;

// How much a factor moved it, in words (so it's never colour alone).
const strength = (value) => {
  const size = Math.abs(value);
  if (size >= 2) return t("Strong");
  if (size >= 0.8) return t("Some");
  return t("A little");
};

// Why a film is the match it is, from the taste engine (getMovieMatch in
// utils/tasteEngine): the match big, the reasons in your own films' words,
// then every factor that moved it — a bar from the middle, green to the
// right for what pulls it up, red to the left for what pulls it down, with
// an arrow and a word for how much — and what it's all based on.
// `match`: { match, reasons, factors, tieredCount, watchedCount }.
export const TasteMatchSheet = ({ visible, onClose, match, title }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  if (!match) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      size="auto"
      flush
      title={t("{match}% your taste", { match: match.match })}
      subtitle={title}
    >
      {/* The match, as a bar. */}
      <View style={styles.meter}>
        <View style={[styles.meterFill, { width: `${match.match}%` }]} />
      </View>

      {/* Why, in the words of your own films. */}
      <Text style={styles.label}>{t("Why it fits you")}</Text>
      <View style={styles.rows}>
        {match.reasons.map((reason) => (
          <View key={reason} style={styles.reasonRow}>
            <Sparkles size={16} color={colors.success} strokeWidth={2} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>

      {/* What moved it, biggest first. */}
      {match.factors.length > 0 && (
        <>
          <Text style={styles.label}>{t("What moves the match")}</Text>
          <View style={styles.rows}>
            {match.factors.map((factor) => {
              const up = factor.value > 0;
              const share = Math.min(1, Math.abs(factor.value) / FULL_PULL);
              const Arrow = up ? TrendingUp : TrendingDown;
              const tone = up ? colors.success : colors.danger;
              return (
                <View key={factor.key} style={styles.factorRow}>
                  <View style={styles.factorTop}>
                    <Text style={styles.factorLabel}>{t(factor.label)}</Text>
                    <View style={styles.factorAmount}>
                      <Arrow size={14} color={tone} strokeWidth={2.2} />
                      <Text style={styles.factorAmountText}>{strength(factor.value)}</Text>
                    </View>
                  </View>
                  {/* Down to the left of the middle, up to the right. */}
                  <View style={styles.track}>
                    <View style={styles.half}>
                      {!up && (
                        <View
                          style={[
                            styles.fill,
                            styles.fillDown,
                            { width: `${share * 100}%`, backgroundColor: tone },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.midline} />
                    <View style={styles.half}>
                      {up && (
                        <View
                          style={[
                            styles.fill,
                            styles.fillUp,
                            { width: `${share * 100}%`, backgroundColor: tone },
                          ]}
                        />
                      )}
                    </View>
                  </View>
                  {!!factor.reason && (
                    <Text style={styles.factorReason}>{factor.reason}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      <Text style={styles.footnote}>
        {match.tieredCount > 0
          ? t("Based on your {count} tiers and your Taste DNA.", { count: match.tieredCount })
          : t("Based on the {count} films you've watched.", { count: match.watchedCount })}
      </Text>
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    meter: {
      height: BAR_HEIGHT,
      marginHorizontal: spacing.md,
      backgroundColor: colors.surfaceSoft,
      borderRadius: BAR_HEIGHT / 2,
      overflow: "hidden",
    },
    meterFill: {
      height: "100%",
      backgroundColor: colors.success,
      borderRadius: BAR_HEIGHT / 2,
    },
    // Small grey caps, like the app's section labels.
    label: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: colors.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm + 2,
      paddingHorizontal: spacing.md,
    },
    // Full-width rows, a step lighter than the sheet, a hairline apart.
    rows: {
      gap: StyleSheet.hairlineWidth * 2,
    },
    reasonRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      backgroundColor: colors.surfaceSoft,
    },
    reasonText: {
      ...typography.body,
      flex: 1,
      color: colors.textPrimary,
    },
    factorRow: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      backgroundColor: colors.surfaceSoft,
    },
    factorTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    factorLabel: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    factorAmount: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    factorAmountText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    track: {
      flexDirection: "row",
      alignItems: "center",
      height: BAR_HEIGHT,
    },
    half: {
      flex: 1,
      height: BAR_HEIGHT,
      flexDirection: "row",
      backgroundColor: colors.surfaceSoft,
    },
    // The middle: no pull either way.
    midline: {
      width: 2,
      height: BAR_HEIGHT + 6,
      backgroundColor: colors.textMuted,
    },
    fill: {
      height: "100%",
    },
    // Down grows from the middle to the left, up from the middle to the right.
    fillDown: {
      marginStart: "auto",
      borderTopStartRadius: BAR_HEIGHT / 2,
      borderBottomStartRadius: BAR_HEIGHT / 2,
    },
    fillUp: {
      borderTopEndRadius: BAR_HEIGHT / 2,
      borderBottomEndRadius: BAR_HEIGHT / 2,
    },
    factorReason: {
      ...typography.caption,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
    },
  });

export default TasteMatchSheet;

import { Sparkles, TrendingDown, TrendingUp } from "lucide-react-native";
import { Fragment } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";
import { BottomSheet } from "./BottomSheet";

// A factor's bar is full at this much pull.
const FULL_PULL = 3;
const BAR_HEIGHT = 4;

// How much a factor moved it, in words (so it's never colour alone).
const strength = (value) => {
  const size = Math.abs(value);
  if (size >= 2) return t("Strong");
  if (size >= 0.8) return t("Some");
  return t("A little");
};

// The match in a word. Matches run 52–98 (see toMatch in tasteEngine).
const verdict = (match) => {
  if (match >= 88) return t("Made for you");
  if (match >= 78) return t("Strong match");
  if (match >= 66) return t("Worth a look");
  return t("A stretch for you");
};

// Why a film is the match it is, from the taste engine (getMovieMatch in
// utils/tasteEngine):
//
//   the match    the number big, what it means in a word, what it's based
//                on, and a bar
//   pulls it up  what fits you, biggest first — each with its reason
//   holds back   what doesn't
//
// Each factor says how much in a word and a bar, with an arrow — never
// colour alone. With no factors to show, the reasons stand in.
// `match`: { match, reasons, factors, tieredCount, watchedCount }.
export const TasteMatchSheet = ({ visible, onClose, match, title }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  if (!match) return null;

  const ups = match.factors.filter((factor) => factor.value > 0);
  const downs = match.factors.filter((factor) => factor.value < 0);

  const renderFactor = (factor, index) => {
    const up = factor.value > 0;
    const Arrow = up ? TrendingUp : TrendingDown;
    const tone = up ? colors.success : colors.danger;
    const share = Math.max(
      0.08,
      Math.min(1, Math.abs(factor.value) / FULL_PULL),
    );
    return (
      <Fragment key={factor.key}>
        <View style={styles.factor}>
          <View style={styles.factorTop}>
            <Text style={styles.factorLabel}>{t(factor.label)}</Text>
            <View style={styles.factorAmount}>
              <Arrow size={14} color={tone} strokeWidth={2.2} />
              <Text style={styles.factorAmountText}>
                {strength(factor.value)}
              </Text>
            </View>
          </View>
          <View style={styles.bar}>
            <View
              style={[
                styles.barFill,
                { width: `${share * 100}%`, backgroundColor: tone },
              ]}
            />
          </View>
          {!!factor.reason && (
            <Text style={styles.factorReason}>{factor.reason}</Text>
          )}
        </View>
      </Fragment>
    );
  };

  const group = (label, list) =>
    list.length > 0 && (
      <>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.rows}>{list.map(renderFactor)}</View>
      </>
    );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      size="auto"
      flush
      title={t("Taste match")}
      subtitle={title}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* The match: the number, in a word, and what it's based on. */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroNumber}>
              {t("{percent}%", { percent: match.match })}
            </Text>
            <View style={styles.heroText}>
              <Text style={styles.heroVerdict}>{verdict(match.match)}</Text>
              <Text style={styles.heroBasis}>
                {match.tieredCount > 0
                  ? t("Based on your {count} tiers", {
                      count: match.tieredCount,
                    })
                  : t("Based on {count} films you've watched", {
                      count: match.watchedCount,
                    })}
              </Text>
            </View>
          </View>
          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: `${match.match}%` }]} />
          </View>
        </View>

        {match.factors.length > 0 ? (
          <>
            {group(t("Pulls it up"), ups)}
            {group(t("Holds it back"), downs)}
          </>
        ) : (
          <>
            <Text style={styles.label}>{t("Why it fits you")}</Text>
            <View style={styles.rows}>
              {match.reasons.map((reason, index) => (
                <Fragment key={reason}>
                  <View style={styles.reason}>
                    <Sparkles
                      size={16}
                      color={colors.success}
                      strokeWidth={2}
                    />
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                </Fragment>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // The sheet stops at 90% of the screen; past that, this scrolls.
    scroll: {
      paddingBottom: spacing.md,
    },
    hero: {
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    heroNumber: {
      ...typography.display,
      color: colors.success,
      fontVariant: ["tabular-nums"],
    },
    heroText: {
      flex: 1,
      gap: 2,
    },
    heroVerdict: {
      ...typography.bodyBold,
      fontSize: 17,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    heroBasis: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    meter: {
      height: 6,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 3,
      overflow: "hidden",
    },
    meterFill: {
      height: "100%",
      backgroundColor: colors.success,
      borderRadius: 3,
    },
    // Small grey caps, like the app's section labels.
    label: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: colors.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    // Rows straight on the sheet, a hairline apart.
    rows: {
      paddingHorizontal: spacing.md,
    },
    factor: {
      gap: spacing.xs + 2,
      paddingVertical: spacing.sm + 4,
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
    bar: {
      height: BAR_HEIGHT,
      backgroundColor: colors.surfaceSoft,
      borderRadius: BAR_HEIGHT / 2,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: BAR_HEIGHT / 2,
    },
    factorReason: {
      ...typography.caption,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    reason: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm + 2,
      paddingVertical: spacing.sm + 4,
    },
    reasonText: {
      ...typography.body,
      flex: 1,
      color: colors.textPrimary,
    },
  });

export default TasteMatchSheet;

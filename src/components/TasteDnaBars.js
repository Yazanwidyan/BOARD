import { StyleSheet, View } from "react-native";

import { DIMENSIONS } from "../data/vibes";
import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";

// How strong a lean reads, in three steps (and none for balanced).
const STEPS = 3;
// A lean this small reads as balanced.
const LEANS = 0.5;

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Taste DNA as mini meters: six small tiles in two rows of three, one per
// dimension — the word you lean towards ("Dark", "Slow-burning") and a
// tiny three-step meter for how strongly. A balanced one says so, its meter
// empty. `fingerprint`: six 1–5 values (utils/tasteDna), 3 the middle.
export const TasteDnaBars = ({ fingerprint }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  if (!fingerprint) return null;
  return (
    <View style={styles.grid}>
      {DIMENSIONS.map((dimension, index) => {
        const lean = fingerprint[index] - 3;
        const leans = Math.abs(lean) >= LEANS;
        const steps = leans ? Math.max(1, Math.round((Math.abs(lean) / 2) * STEPS)) : 0;
        const word = leans
          ? capitalize(t(lean > 0 ? dimension.high : dimension.low))
          : t("Balanced");
        return (
          <View
            key={dimension.key}
            style={styles.tile}
            accessibilityLabel={
              leans ? `${word}, ${steps} / ${STEPS}` : `${t("Balanced")}: ${t(dimension.low)} / ${t(dimension.high)}`
            }
          >
            <Text style={[styles.word, !leans && styles.wordBalanced]} numberOfLines={2}>
              {word}
            </Text>
            {!leans && (
              <Text style={styles.between} numberOfLines={1}>
                {t(dimension.low)} · {t(dimension.high)}
              </Text>
            )}
            <View style={styles.meter}>
              {Array.from({ length: STEPS }, (_, step) => (
                <View key={step} style={[styles.step, step < steps && styles.stepOn]} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Three to a row, 2px apart.
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 2,
    },
    tile: {
      flexGrow: 1,
      flexBasis: "31%",
      justifyContent: "space-between",
      gap: spacing.sm,
      minHeight: 64,
      padding: spacing.sm + 2,
      backgroundColor: colors.surfaceSoft,
    },
    word: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 16,
      color: colors.textPrimary,
    },
    wordBalanced: {
      color: colors.textSecondary,
    },
    between: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 13,
      color: colors.textMuted,
      marginTop: -spacing.xs,
    },
    meter: {
      flexDirection: "row",
      gap: 3,
    },
    step: {
      width: 14,
      height: 4,
      backgroundColor: colors.border,
    },
    stepOn: {
      backgroundColor: colors.rating,
    },
  });

export default TasteDnaBars;

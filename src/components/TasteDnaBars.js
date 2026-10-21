import { StyleSheet, View } from "react-native";

import { DIMENSIONS } from "../data/vibes";
import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";

// How strong a lean reads, in three steps.
const STEPS = 3;
// A lean this small reads as balanced.
const LEANS = 0.5;
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Your six leanings, strongest first: [{ key, word, steps }] — the word
// for the side you lean towards and how strongly (1–3) — then how many
// are balanced.
export const readTasteDna = (fingerprint) => {
  const leanings = [];
  let balanced = 0;
  DIMENSIONS.forEach((dimension, index) => {
    const lean = fingerprint[index] - 3;
    if (Math.abs(lean) < LEANS) {
      balanced += 1;
      return;
    }
    leanings.push({
      key: dimension.key,
      word: t(lean > 0 ? dimension.high : dimension.low),
      strength: Math.abs(lean),
      steps: Math.max(1, Math.round((Math.abs(lean) / 2) * STEPS)),
    });
  });
  leanings.sort((a, b) => b.strength - a.strength);
  return { leanings, balanced };
};

// Taste DNA as chips: each leaning a chip with a small gold strength mark,
// strongest first, and one chip for the balanced ones. `fingerprint`: six
// 1–5 values (utils/tasteDna), 3 the middle.
export const TasteDnaBars = ({ fingerprint }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  if (!fingerprint) return null;
  const { leanings, balanced } = readTasteDna(fingerprint);

  return (
    <View style={styles.wrap}>
      <View style={styles.chips}>
        {leanings.map((leaning) => (
          <View
            key={leaning.key}
            style={styles.chip}
            accessibilityLabel={`${capitalize(leaning.word)}, ${leaning.steps} / ${STEPS}`}
          >
            <Text style={styles.chipText}>{capitalize(leaning.word)}</Text>
            <View style={styles.meter}>
              {Array.from({ length: STEPS }, (_, step) => (
                <View key={step} style={[styles.step, step < leaning.steps && styles.stepOn]} />
              ))}
            </View>
          </View>
        ))}
        {balanced > 0 && (
          <View style={[styles.chip, styles.chipBalanced]}>
            <Text style={styles.chipBalancedText}>
              {t("{count} balanced", { count: balanced })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.sm + 4,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs + 2,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
      backgroundColor: colors.surfaceSoft,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    meter: {
      flexDirection: "row",
      gap: 2,
    },
    step: {
      width: 4,
      height: 10,
      backgroundColor: colors.border,
    },
    stepOn: {
      backgroundColor: colors.rating,
    },
    chipBalanced: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipBalancedText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });

export default TasteDnaBars;

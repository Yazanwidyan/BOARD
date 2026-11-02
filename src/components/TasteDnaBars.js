import { StyleSheet } from "react-native";

import { DIMENSIONS } from "../data/vibes";
import { t } from "../i18n";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { tasteSentence } from "../utils/tasteWords";
import { Text } from "./AppText";

// How strong a lean reads, in three steps.
const STEPS = 3;
// A lean this small reads as balanced.
const LEANS = 0.5;

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

// Your taste in one plain sentence — "You lean toward dark, mind-bending
// films." — from your two strongest leanings (no dots, no "balanced").
// `fingerprint`: six 1–5 values (utils/tasteDna), 3 the middle. `style`
// for the sentence's text.
export const TasteDnaBars = ({ fingerprint, style }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  if (!fingerprint) return null;
  const { leanings } = readTasteDna(fingerprint);
  return <Text style={[styles.sentence, style]}>{tasteSentence(leanings)}</Text>;
};

const createStyles = (colors) =>
  StyleSheet.create({
    sentence: {
      ...typography.bodyBold,
      fontSize: 17,
      lineHeight: 23,
      color: colors.textPrimary,
    },
  });

export default TasteDnaBars;

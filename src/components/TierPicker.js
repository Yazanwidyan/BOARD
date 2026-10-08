import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { TIERS, getTierInfo } from "../utils/tiers";
import { t } from "../i18n";

// ReelBoard's rating input. Tapping the current tier again clears it.
//
// Default: a tier ladder — six full-width rows, S at the top to F at the
// bottom, each with its coloured letter and what it means. The chosen row
// fills with its colour's tint and gets a check; the others step back.
//
// compact: the original single row of six letter buttons with the meaning
// underneath — for tight spaces like the reward dialog.
export const TierPicker = ({ tier, onChange, compact = false }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const info = getTierInfo(tier);

  const choose = (key) => {
    Haptics.selectionAsync();
    onChange(key === tier ? null : key);
  };

  if (compact) {
    return (
      <View>
        <View style={styles.row}>
          {TIERS.map(({ key, color }) => {
            const selected = key === tier;
            return (
              <Pressable
                key={key}
                style={[
                  styles.tier,
                  { borderColor: selected ? color : `${color}55` },
                  selected && { backgroundColor: color },
                ]}
                onPress={() => choose(key)}
                accessibilityLabel={t("{key} tier", { key })}
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.tierText,
                    { color: selected ? colors.background : color },
                  ]}
                >
                  {key}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.meaning}>
          {info
            ? t("{key} tier · {meaning}", {
                key: info.key,
                meaning: info.meaning,
              })
            : t("Pick a tier for this movie")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.ladder}>
      {TIERS.map(({ key, meaning, color }) => {
        const selected = key === tier;
        const dimmed = tier && !selected;
        return (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.rung,
              selected && {
                backgroundColor: `${color}26`,
                borderColor: color,
              },
              dimmed && styles.rungDimmed,
              pressed && styles.rungPressed,
            ]}
            onPress={() => choose(key)}
            accessibilityRole="button"
            accessibilityLabel={t("{key} tier, {meaning}", {
              key: key,
              meaning: meaning,
            })}
            accessibilityState={{ selected }}
          >
            <View style={[styles.letterBox, { backgroundColor: color }]}>
              <Text style={styles.letter}>{key}</Text>
            </View>
            <Text
              style={[
                styles.rungMeaning,
                selected && styles.rungMeaningSelected,
              ]}
            >
              {meaning}
            </Text>
            {selected && <Check size={18} color={color} strokeWidth={3} />}
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // ---- ladder ----
    ladder: {
      gap: 6,
    },
    rung: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingEnd: spacing.md,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: "transparent",
      backgroundColor: colors.cardElevated,
      overflow: "hidden",
    },
    rungDimmed: {
      opacity: 0.55,
    },
    rungPressed: {
      opacity: 0.8,
    },
    letterBox: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    letter: {
      ...typography.display,
      fontSize: 22,
      lineHeight: 26,
      color: "#161719",
    },
    rungMeaning: {
      ...typography.bodyBold,
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
    },
    rungMeaningSelected: {
      color: colors.textPrimary,
    },

    // ---- compact row ----
    row: {
      flexDirection: "row",
      gap: spacing.xs + 2,
    },
    tier: {
      flex: 1,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.sm,
      borderWidth: 1.5,
    },
    tierText: {
      ...typography.hero,
      fontSize: 22,
      lineHeight: 26,
    },
    meaning: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
  });

export default TierPicker;

import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { TIERS, getTierInfo } from "../utils/tiers";

// Reelboard's rating input: six tier buttons, S → F. Tapping the current
// tier again clears it. The chosen tier's meaning shows underneath so the
// scale explains itself without any numbers.
export const TierPicker = ({ tier, onChange }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const info = getTierInfo(tier);

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
              onPress={() => {
                Haptics.selectionAsync();
                onChange(selected ? null : key);
              }}
              accessibilityLabel={`${key} tier`}
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
        {info ? `${info.key} tier · ${info.meaning}` : "Pick a tier for this movie"}
      </Text>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
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

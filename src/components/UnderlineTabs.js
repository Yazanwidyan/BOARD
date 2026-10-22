import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";

// A row of word tabs, Letterboxd-style: the open one white and underlined,
// a hairline under the whole row; scrolls sideways when they don't fit.
// `tabs`: [{ key, label }] (labels already translated).
export const UnderlineTabs = ({ tabs, value, onChange, style }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.row, style]}
      contentContainerStyle={styles.content}
      accessibilityRole="tablist"
    >
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.text, selected && styles.textOn]} numberOfLines={1}>
              {tab.label}
            </Text>
            <View style={[styles.line, selected && styles.lineOn]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    row: {
      flexGrow: 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    content: {
      paddingHorizontal: spacing.md,
      gap: spacing.lg,
    },
    tab: {
      paddingTop: spacing.xs,
      gap: spacing.sm,
    },
    text: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.segmentText,
    },
    textOn: {
      color: colors.textPrimary,
    },
    line: {
      height: 2,
      borderRadius: 1,
    },
    lineOn: {
      backgroundColor: colors.textPrimary,
    },
  });

export default UnderlineTabs;

import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";

// A row of word tabs, like Home's For you / Friends: a dark track, the open
// one a white pill; scrolls sideways when they don't fit.
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
      <View style={styles.track}>
        {tabs.map((tab) => {
          const selected = tab.key === value;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, selected && styles.tabOn]}
              onPress={() => onChange(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.text, selected && styles.textOn]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    row: {
      flexGrow: 0,
    },
    // At least the row's width, so a few tabs share it out.
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.md,
    },
    // On the page, so the card colour (the dark track would vanish).
    track: {
      flexGrow: 1,
      flexDirection: "row",
      gap: 2,
      padding: 3,
      backgroundColor: colors.card,
      borderRadius: shape.chip,
    },
    tab: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      borderRadius: shape.chip,
    },
    tabOn: {
      backgroundColor: colors.segmentOn,
    },
    text: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.segmentText,
    },
    textOn: {
      color: colors.segmentOnText,
    },
  });

export default UnderlineTabs;

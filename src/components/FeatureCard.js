import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

// A full-width tile — title+subtitle on the left, icon badge pinned to the
// top-right corner — used for Decide's Swipe/Spin/AI entries, stacked one
// under the other.
export const FeatureCard = ({ icon, title, subtitle, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.iconBadge}>{icon}</View>
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: spacing.md,
    },
    textBlock: {
      flex: 1,
    },
    title: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 16,
      marginTop: spacing.xs,
    },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      backgroundColor: "rgba(91, 141, 239, 0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default FeatureCard;

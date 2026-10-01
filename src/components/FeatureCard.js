import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

// A full-width row card with a solid accent badge — used for Decide's
// Swipe/Spin entries so a real, working feature reads as more than a plain
// list item.
export const FeatureCard = ({ icon, title, subtitle, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.iconBadge}>{icon}</View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: spacing.md,
      marginBottom: spacing.sm,
      overflow: "hidden",
    },
    iconBadge: {
      width: 56,
      height: 56,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    text: {
      flex: 1,
      gap: 4,
    },
    title: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 16,
    },
  });

export default FeatureCard;

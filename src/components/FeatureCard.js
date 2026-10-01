import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

// A full-width row card with a solid accent badge and a large translucent
// "ghost" icon bleeding off the corner — used for Decide's Swipe/Spin
// entries (now surfaced as Home's Quick Actions) so a real, working feature
// reads as more than a plain list item.
export const FeatureCard = ({ icon, ghostIcon, title, subtitle, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.ghost}>{ghostIcon}</View>
      <View style={styles.iconBadge}>{icon}</View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
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
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
      overflow: "hidden",
    },
    ghost: {
      position: "absolute",
      right: -18,
      top: -18,
      opacity: 0.06,
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
      marginRight: spacing.sm,
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

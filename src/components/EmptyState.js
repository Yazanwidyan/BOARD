import { StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { PrimaryButton } from "./PrimaryButton";

export const EmptyState = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {icon}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {actionLabel && onAction ? (
          <PrimaryButton
            label={actionLabel}
            onPress={onAction}
            style={styles.action}
          />
        ) : null}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    card: {
      width: "100%",
      alignItems: "center",
      backgroundColor: "transparent",
      borderRadius: radius.sm,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: colors.border,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: spacing.md,
      textAlign: "center",
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      textAlign: "center",
    },
    action: {
      marginTop: spacing.md,
      alignSelf: "center",
    },
  });

export default EmptyState;

import { StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { PrimaryButton } from "./PrimaryButton";

export const ChallengeEmptyCard = ({
  title = "No Active Challenge",
  subtitle = "Create a challenge to earn XP and level up.",
  buttonLabel = "Create a Challenge",
  icon,
  onPress,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <PrimaryButton
        label={buttonLabel}
        icon={icon}
        onPress={onPress}
        style={styles.button}
      />
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
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
      ...typography.subtitle,
      color: colors.textPrimary,
      textAlign: "center",
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    button: {
      marginTop: spacing.md,
      alignSelf: "center",
    },
  });

export default ChallengeEmptyCard;

import { StyleSheet, Text, View } from "react-native";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { EmptyArt } from "./EmptyArt";
import { PrimaryButton } from "./PrimaryButton";

// An empty screen or list: a hand-drawn scene (see EmptyArt — "emptyShelf",
// "noDiscs", "noMatches", "allTiered", "comingSoon"), a title, a line, and
// an optional way forward. `icon` is still accepted in place of `art`.
export const EmptyState = ({
  art,
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
      {art ? (
        <EmptyArt art={art} accent={colors.accent} light={colors.accentLight} />
      ) : (
        icon
      )}
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
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
    },
    title: {
      ...typography.hero,
      fontSize: 22,
      lineHeight: 28,
      color: colors.textPrimary,
      marginTop: spacing.md,
      textAlign: "center",
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      textAlign: "center",
      maxWidth: 300,
    },
    action: {
      marginTop: spacing.lg,
      alignSelf: "center",
      minWidth: 200,
    },
  });

export default EmptyState;

import {
  Bookmark,
  CheckCheck,
  Clapperboard,
  Clock,
  Layers,
  Search,
} from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const RING_SIZE = 76;

// One thin icon per kind of empty — the `art` names are kept from the old
// drawn scenes so callers don't change.
const ART_ICONS = {
  emptyShelf: Bookmark, // nothing saved yet
  noDiscs: Clapperboard, // nothing watched yet
  noMatches: Search, // a search / filter with no results
  allTiered: CheckCheck, // nothing left to do
  comingSoon: Clock,
  noCollections: Layers, // no collections yet
};

// An empty screen or list, Instagram-style: a thin outlined circle with
// one thin icon, a bold title, a grey line, and an optional way forward as
// a plain text action. `icon` is still accepted in place of `art`.
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
  const Icon = ART_ICONS[art];

  return (
    <View style={styles.wrap}>
      {Icon ? (
        <View style={styles.ring}>
          <Icon size={32} color={colors.textPrimary} strokeWidth={1.5} />
        </View>
      ) : (
        icon
      )}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
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
    ring: {
      width: RING_SIZE,
      height: RING_SIZE,
      borderRadius: RING_SIZE / 2,
      borderWidth: 1.5,
      borderColor: colors.textPrimary,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 26,
      letterSpacing: -0.3,
      color: colors.textPrimary,
      marginTop: spacing.md,
      textAlign: "center",
    },
    subtitle: {
      ...typography.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      marginTop: spacing.xs,
      textAlign: "center",
      maxWidth: 280,
    },
    action: {
      marginTop: spacing.md,
      paddingVertical: spacing.xs,
    },
    pressed: {
      opacity: 0.6,
    },
    actionText: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
  });

export default EmptyState;

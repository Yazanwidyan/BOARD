import { ChevronRight, Dices, Layers, Waves } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";

import { t, useIsRTL } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const ICON_BOX = 38;

// One way to decide (or to watch together), as a card: its icon in a small
// rounded square, its name, and a line on what it does. `wide`: across the whole
// row, the icon beside the words and an arrow at the end.
// A full-width list of ways to go: each its icon in a small square, its
// name and a line on what it does, and a › — split by hairlines. `rows`:
// [{ key, Icon, label, hint, onPress }]. Home's decide list and its Watch
// together.
export const ActionList = ({ rows }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const rtl = useIsRTL();
  return (
    <View style={styles.list}>
      {rows.map(({ key, Icon, label, hint, onPress }, index) => (
        <Pressable
          key={key}
          style={({ pressed }) => [
            styles.row,
            index < rows.length - 1 && styles.rowDivider,
            pressed && styles.rowPressed,
          ]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${hint}`}
        >
          <View style={styles.iconBox}>
            <Icon size={20} color={colors.textPrimary} strokeWidth={1.9} />
          </View>
          <View style={styles.wideText}>
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.hint} numberOfLines={1}>
              {hint}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} style={rtl && styles.flipped} />
        </Pressable>
      ))}
    </View>
  );
};

// Home's other ways to decide.
export const QuickPickBento = ({ onSwipe, onWildcard, onSimilar }) => (
  <ActionList
    rows={[
      { key: "swipe", Icon: Layers, label: t("Swipe"), hint: t("Narrow ten down to one"), onPress: onSwipe },
      { key: "wildcard", Icon: Dices, label: t("Wildcard"), hint: t("One film, a surprise"), onPress: onWildcard },
      { key: "similar", Icon: Waves, label: t("More like…"), hint: t("Films like one you love"), onPress: onSimilar },
    ]}
  />
);

const createStyles = (colors) =>
  StyleSheet.create({
    // The grouped list: a full-width band (it cancels the page's margins),
    // square, no edge — rows split by hairlines.
    list: {
      marginHorizontal: -spacing.md,
      backgroundColor: colors.card,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowPressed: {
      backgroundColor: colors.surfaceSoft,
    },
    // The icon in a small rounded square, outlined.
    iconBox: {
      width: ICON_BOX,
      height: ICON_BOX,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: shape.control - 2,
    },
    wideText: {
      flex: 1,
      gap: 2,
    },
    label: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    hint: {
      ...typography.caption,
      lineHeight: 16,
      color: colors.textMuted,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
  });

export default QuickPickBento;

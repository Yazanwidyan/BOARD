import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";

import { t, useIsRTL } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const ICON_BOX = 38;
// The bento: Swipe and Wildcard side by side on top, this tall; More like…
// the full width under them.
const TOP_ROW_HEIGHT = 112;

// A full-width list of ways to go: each its icon in a small square, its
// name and a line on what it does, and a › — split by hairlines. `rows`:
// [{ key, Icon, label, hint, onPress }]. Home's Watch together.
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

// One of the bento's cards — words only: its name, a line on what it
// does, and a ›. Top-row cards keep the › in their bottom corner; `wide`
// puts it at the end of the row.
const Tile = ({ label, hint, onPress, wide = false, styles, colors, rtl }) => {
  const arrow = <ChevronRight size={18} color={colors.textMuted} style={rtl && styles.flipped} />;
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, wide ? styles.wide : styles.tall, pressed && styles.tilePressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
    >
      <View style={[styles.tileText, wide && styles.wideText]}>
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.hint} numberOfLines={2}>
          {hint}
        </Text>
      </View>
      {wide ? arrow : <View style={styles.cornerArrow}>{arrow}</View>}
    </Pressable>
  );
};

// Home's other ways to decide, as a bento: Swipe and Wildcard side by side,
// More like… the wide one under them.
export const QuickPickBento = ({ onSwipe, onWildcard, onSimilar }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const rtl = useIsRTL();
  const shared = { styles, colors, rtl };

  return (
    <View style={styles.bento}>
      <View style={styles.topRow}>
        <Tile {...shared} label={t("Swipe")} hint={t("Narrow ten down to one")} onPress={onSwipe} />
        <Tile {...shared} label={t("Wildcard")} hint={t("One film, a surprise")} onPress={onWildcard} />
      </View>
      <Tile {...shared} wide label={t("More like…")} hint={t("Films like one you love")} onPress={onSimilar} />
    </View>
  );
};

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

    // ---- The bento: Swipe and Wildcard on top, More like… wide under.
    bento: {
      gap: spacing.sm,
    },
    topRow: {
      flexDirection: "row",
      gap: spacing.sm,
      height: TOP_ROW_HEIGHT,
    },
    tile: {
      backgroundColor: colors.card,
      borderRadius: shape.card,
      padding: spacing.md - 2,
    },
    tilePressed: {
      backgroundColor: colors.cardElevated,
    },
    // Top-row tiles: the words up top, the › in the bottom corner.
    tall: {
      flex: 1,
      justifyContent: "space-between",
    },
    cornerArrow: {
      alignSelf: "flex-end",
    },
    wide: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    tileText: {
      gap: 3,
    },
    tileLabel: {
      ...typography.bodyBold,
      fontSize: 17,
      lineHeight: 22,
      color: colors.textPrimary,
    },
  });

export default QuickPickBento;

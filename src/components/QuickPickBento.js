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
export const DecideTile = ({ Icon, iconColor, label, hint, onPress, wide }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const rtl = useIsRTL();
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, wide && styles.tileWide, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
    >
      <View style={[styles.iconBox, iconColor && { backgroundColor: `${iconColor}24` }]}>
        <Icon size={20} color={iconColor ?? colors.textPrimary} strokeWidth={1.9} />
      </View>
      <View style={wide ? styles.wideText : styles.text}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.hint} numberOfLines={2}>
          {hint}
        </Text>
      </View>
      {wide && (
        <ChevronRight size={18} color={colors.textMuted} style={rtl && styles.flipped} />
      )}
    </Pressable>
  );
};

// Home's other ways to decide: Swipe and Wildcard side by side, then
// More like… across — plain cards, no posters.
export const QuickPickBento = ({ onSwipe, onWildcard, onSimilar }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <DecideTile
          Icon={Layers}
          label={t("Swipe")}
          hint={t("Narrow ten down to one")}
          onPress={onSwipe}
        />
        <DecideTile
          Icon={Dices}
          label={t("Wildcard")}
          hint={t("One film, a surprise")}
          onPress={onWildcard}
        />
      </View>
      <DecideTile
        wide
        Icon={Waves}
        label={t("More like…")}
        hint={t("Films like one you love")}
        onPress={onSimilar}
      />
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    grid: {
      gap: spacing.sm,
    },
    row: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    tile: {
      flex: 1,
      gap: spacing.sm + 2,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    tileWide: {
      flex: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    pressed: {
      opacity: 0.75,
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
    text: {
      gap: 2,
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

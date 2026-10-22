import { ChevronRight } from "lucide-react-native";
import { Children, Fragment } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useIsRTL } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";

// The pieces of Settings-style screens: groups of rows under a small
// title, each row an icon, a label (and a hint under it), then what it's
// set to and a chevron when it opens something. Groups are filled bands
// edge to edge with square corners, rows split by a hairline that starts
// after the icon.

const ICON = 20;
const ICON_GAP = spacing.md;

// `inset`: where the hairlines start, for rows that lead with something
// wider than an icon (an avatar).
export const SettingsGroup = ({ title, footnote, inset, children }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {!!title && <Text style={styles.groupTitle}>{title}</Text>}
      <View style={styles.groupBody}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 && (
              <View style={[styles.separator, inset != null && { marginStart: inset }]} />
            )}
            {row}
          </Fragment>
        ))}
      </View>
      {!!footnote && <Text style={styles.footnote}>{footnote}</Text>}
    </View>
  );
};

// `Icon`: a lucide icon. `value`: what it's set to, shown at the end.
// `right`: a control in place of the value (a switch). Rows with
// `onPress` and no `right` get a chevron, unless `destructive`.
const SEPARATOR_START = spacing.md + ICON + ICON_GAP;

export const SettingsRow = ({ Icon, label, hint, value, right, onPress, destructive, accessibilityLabel }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const rtl = useIsRTL();
  const tint = destructive ? colors.danger : colors.textSecondary;
  const showChevron = !!onPress && !right && !destructive;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {Icon && <Icon size={ICON} color={tint} strokeWidth={1.9} />}
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, destructive && { color: colors.danger }]} numberOfLines={1}>
          {label}
        </Text>
        {!!hint && (
          <Text style={styles.rowHint} numberOfLines={2}>
            {hint}
          </Text>
        )}
      </View>
      {!!value && (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      )}
      {right}
      {showChevron && (
        <ChevronRight
          size={18}
          color={colors.textMuted}
          style={rtl && styles.flipped}
        />
      )}
    </Pressable>
  );
};

// A row of choices, the chosen one filled — inside a group, under its
// label. `options`: [{ key, label, Icon? }].
export const SettingsChoice = ({ Icon, label, options, value, onChange }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.choice}>
      <View style={styles.choiceHead}>
        {Icon && <Icon size={ICON} color={colors.textSecondary} strokeWidth={1.9} />}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.segments} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.key === value;
          const OptionIcon = option.Icon;
          return (
            <Pressable
              key={option.key}
              style={[styles.segment, selected && styles.segmentOn]}
              onPress={() => !selected && onChange(option.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              {OptionIcon && (
                <OptionIcon
                  size={16}
                  color={selected ? colors.segmentOnText : colors.segmentText}
                  strokeWidth={2}
                />
              )}
              <Text style={[styles.segmentText, selected && styles.segmentTextOn]} numberOfLines={1}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    group: {
      marginTop: spacing.lg,
    },
    groupTitle: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    groupBody: {
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginStart: SEPARATOR_START,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: ICON_GAP,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
    },
    rowPressed: {
      backgroundColor: colors.cardElevated,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowLabel: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    rowHint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    rowValue: {
      ...typography.body,
      color: colors.textMuted,
      maxWidth: "45%",
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    choice: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      gap: spacing.sm + 2,
    },
    choiceHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: ICON_GAP,
    },
    segments: {
      flexDirection: "row",
      gap: 2,
      padding: 2,
      backgroundColor: colors.segmentTrack,
      borderRadius: 6,
    },
    segment: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 4,
      borderRadius: 7,
    },
    segmentOn: {
      backgroundColor: colors.segmentOn,
    },
    segmentText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.segmentText,
    },
    segmentTextOn: {
      color: colors.segmentOnText,
    },
  });

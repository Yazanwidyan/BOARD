import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const NOTCH_SIZE = 18;
const DASH_COUNT = 22;
const STRIPE_GAP = 11;

// "#RRGGBB" mixed toward another colour by `amount` (0–1).
const mix = (hex, other, amount) => {
  const parse = (value) => {
    const n = parseInt(value.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const a = parse(hex);
  const b = parse(other);
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(a[i] + (b[i] - a[i]) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};

// The ticket's face-down back: thin diagonal security stripes.
const Stripes = ({ width, height, color }) => {
  const lines = [];
  for (let x = -height; x < width; x += STRIPE_GAP) {
    lines.push(
      <Line
        key={x}
        x1={x}
        y1={height}
        x2={x + height}
        y2={0}
        stroke={color}
        strokeWidth={1}
      />,
    );
  }
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      {lines}
    </Svg>
  );
};

// Home's empty challenge slot: the challenge ticket, but face down and
// sealed — a DARE stamp across the back, then the same tear line and stub
// as the real ticket. Tapping it "tears it open" (the challenge generator).
export const SealedChallengeTicket = ({ onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [backSize, setBackSize] = useState(null);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Start a challenge"
    >
      {/* Face-down back with the stamp */}
      <View
        style={styles.back}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setBackSize({ width, height });
        }}
      >
        {backSize && (
          <Stripes
            width={backSize.width}
            height={backSize.height}
            color="rgba(255, 255, 255, 0.07)"
          />
        )}
        <View style={styles.stamp}>
          <Text style={styles.stampText}>DARE</Text>
        </View>
        <Text style={styles.sealedNote}>SEALED · FOR TONIGHT</Text>
      </View>

      {/* Tear line */}
      <View style={styles.tearLine}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.dashes}>
          {Array.from({ length: DASH_COUNT }, (_, index) => (
            <View key={index} style={styles.dash} />
          ))}
        </View>
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      {/* Stub */}
      <View style={styles.stub}>
        <View style={styles.stubText}>
          <Text style={styles.stubTitle}>Tonight&apos;s dare is sealed</Text>
          <Text style={styles.stubSubtitle}>Three to choose from</Text>
        </View>
        <View style={styles.tearButton}>
          <Text style={styles.tearButtonText}>Tear it open</Text>
        </View>
      </View>
    </Pressable>
  );
};

const createStyles = (colors) => {
  const ticket = mix(colors.accent, "#000000", 0.42);
  return StyleSheet.create({
    card: {
      backgroundColor: ticket,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: `${colors.accent}AA`,
      overflow: "hidden",
    },
    pressed: {
      opacity: 0.85,
    },
    back: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.lg,
      gap: spacing.sm + 2,
    },
    // A rubber stamp: double-ruled border, spaced capitals, slight tilt.
    stamp: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 2.5,
      borderColor: colors.accentLight,
      transform: [{ rotate: "-6deg" }],
      shadowColor: colors.accentLight,
      shadowOpacity: 0.5,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
    },
    stampText: {
      ...typography.hero,
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: 8,
      paddingLeft: 8, // balances the trailing letter-spacing
      color: colors.accentLight,
    },
    sealedNote: {
      ...typography.label,
      fontSize: 10,
      letterSpacing: 2,
      color: "rgba(255, 255, 255, 0.55)",
    },
    tearLine: {
      height: NOTCH_SIZE,
      justifyContent: "center",
    },
    notch: {
      position: "absolute",
      width: NOTCH_SIZE,
      height: NOTCH_SIZE,
      borderRadius: NOTCH_SIZE / 2,
      backgroundColor: colors.background,
    },
    notchLeft: {
      left: -NOTCH_SIZE / 2,
    },
    notchRight: {
      right: -NOTCH_SIZE / 2,
    },
    dashes: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginHorizontal: NOTCH_SIZE,
    },
    dash: {
      width: 6,
      height: 1.5,
      borderRadius: 1,
      backgroundColor: "rgba(255, 255, 255, 0.3)",
    },
    stub: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
    },
    stubText: {
      flex: 1,
    },
    stubTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    stubSubtitle: {
      ...typography.caption,
      color: "rgba(255, 255, 255, 0.65)",
      marginTop: 1,
    },
    tearButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: 9,
      borderRadius: radius.pill,
      backgroundColor: colors.selected,
    },
    tearButtonText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.selectedText,
    },
  });
};

export default SealedChallengeTicket;

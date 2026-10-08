import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";

const BULB = 5;
const BULB_GAP = 15;
const BULB_INSET = 7;
const BULB_COLOR = "#FFE7A3";

// Bulb positions around the inside edge of a w × h sign, every BULB_GAP.
const bulbPositions = (width, height) => {
  const spots = [];
  const along = (length) => {
    const usable = length - BULB_INSET * 2 - BULB;
    const count = Math.max(2, Math.floor(usable / BULB_GAP) + 1);
    const step = usable / (count - 1);
    return Array.from(
      { length: count },
      (_, index) => BULB_INSET + index * step,
    );
  };
  const xs = along(width);
  const ys = along(height).slice(1, -1); // corners come from the rows
  xs.forEach((x) => {
    spots.push({ x, y: BULB_INSET });
    spots.push({ x, y: height - BULB_INSET - BULB });
  });
  ys.forEach((y) => {
    spots.push({ x: BULB_INSET, y });
    spots.push({ x: width - BULB_INSET - BULB, y });
  });
  return spots;
};

const BulbLayer = ({ spots, style, styles }) => (
  <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
    {spots.map(({ x, y }) => (
      <View key={`${x}-${y}`} style={[styles.bulb, { left: x, top: y }]} />
    ))}
  </Animated.View>
);

// A cinema marquee sign: the movie's poster blurred behind, a border of
// glowing bulbs that gently alternate (still with Reduce Motion), and a
// spaced-out sign line ("NOW SHOWING · TONIGHT") above whatever's inside.
export const MarqueeSign = ({ label, backdropUri, right, children }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [size, setSize] = useState(null);
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const evenStyle = useAnimatedStyle(() => ({
    opacity: 1 - pulse.value * 0.55,
  }));
  const oddStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.55,
  }));

  const spots = size ? bulbPositions(size.width, size.height) : [];
  const even = spots.filter((_, index) => index % 2 === 0);
  const odd = spots.filter((_, index) => index % 2 === 1);

  return (
    <View
      style={styles.sign}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (!size || size.width !== width || size.height !== height) {
          setSize({ width, height });
        }
      }}
    >
      {backdropUri && (
        <MoviePoster
          uri={backdropUri}
          blurRadius={22}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={["rgba(12, 13, 14, 0.72)", `${colors.card}F2`]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <BulbLayer spots={even} style={evenStyle} styles={styles} />
      <BulbLayer spots={odd} style={oddStyle} styles={styles} />

      <View style={styles.inner}>
        <View style={styles.signRow}>
          <Text style={styles.signText} numberOfLines={1}>
            {label}
          </Text>
          {right}
        </View>
        {children}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    sign: {
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: "rgba(255, 231, 163, 0.35)",
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    bulb: {
      position: "absolute",
      width: BULB,
      height: BULB,
      borderRadius: BULB / 2,
      backgroundColor: BULB_COLOR,
      shadowColor: BULB_COLOR,
      shadowOpacity: 0.9,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 0 },
    },
    inner: {
      padding: spacing.md + 8,
    },
    signRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      marginBottom: spacing.sm + 2,
    },
    signText: {
      ...typography.label,
      flexShrink: 1,
      color: BULB_COLOR,
      letterSpacing: 3,
      textShadowColor: "rgba(255, 231, 163, 0.6)",
      textShadowRadius: 8,
      textShadowOffset: { width: 0, height: 0 },
    },
  });

export default MarqueeSign;

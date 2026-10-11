import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { DIMENSIONS } from "../data/vibes";
import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";

// The six Taste DNA dimensions as sliders: each end labelled ("dark" …
// "light-hearted"), a tick at the middle, and a gold marker where the
// fingerprint sits — the end it leans to is lit. `animate` slides the
// markers out from the middle on mount (off for the shared image, which
// is captured as-is).
const Bar = ({ dimension, value, index, animate, styles, colors }) => {
  const target = (value - 1) / 4;
  const position = useSharedValue(animate ? 0.5 : target);
  useEffect(() => {
    if (!animate) {
      position.value = target;
      return;
    }
    position.value = withDelay(
      200 + index * 80,
      withTiming(target, { duration: 650, easing: Easing.out(Easing.cubic) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  const markerStyle = useAnimatedStyle(() => ({
    left: `${position.value * 100}%`,
  }));
  const lean = value - 3;
  return (
    <View style={styles.row}>
      <View style={styles.labels}>
        <Text style={[styles.end, lean < -0.4 && styles.endOn]}>
          {t(dimension.low)}
        </Text>
        <Text style={[styles.end, lean > 0.4 && styles.endOn]}>
          {t(dimension.high)}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={styles.mid} />
        <Animated.View
          style={[styles.marker, { backgroundColor: colors.rating }, markerStyle]}
        />
      </View>
    </View>
  );
};

export const TasteDnaBars = ({ fingerprint, animate = true }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.bars}>
      {DIMENSIONS.map((dimension, index) => (
        <Bar
          key={dimension.key}
          dimension={dimension}
          value={fingerprint ? fingerprint[index] : 3}
          index={index}
          animate={animate}
          styles={styles}
          colors={colors}
        />
      ))}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    bars: {
      gap: spacing.md,
    },
    row: {
      gap: 6,
    },
    labels: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    end: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
    },
    endOn: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.textPrimary,
    },
    track: {
      height: 6,
      backgroundColor: colors.surfaceSoft,
      justifyContent: "center",
    },
    mid: {
      position: "absolute",
      left: "50%",
      width: 1,
      height: 10,
      marginLeft: -0.5,
      backgroundColor: colors.border,
    },
    marker: {
      position: "absolute",
      width: 14,
      height: 14,
      marginLeft: -7,
    },
  });

export default TasteDnaBars;

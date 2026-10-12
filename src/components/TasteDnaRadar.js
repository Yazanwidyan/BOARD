import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";

import { DIMENSIONS } from "../data/vibes";
import { t } from "../i18n";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { describeFingerprint } from "../utils/tasteEngine";
import { Text } from "./AppText";

// Taste DNA as a radar hexagon: six corners, one per dimension (its "high"
// end — dark, fast, mind-bending, heavy, epic, fantastical), clockwise
// from the top; three guide rings; and your shape filled in gold. A value
// of 1 sits at the centre, 5 at the corner, so a shape pulled towards a
// corner is a taste that leans that way — and a shape hugging the centre on
// one side leans the other way (light-hearted, slow-burning…).
//
// The corners you lean towards most are labelled bright, and (unless
// `caption` is off) a line underneath says it in words — "Leans dark and
// mind-bending". `animate` grows the shape out from the centre on mount
// (off for the shared image, which is captured as-is).
const RINGS = [1 / 3, 2 / 3, 1];
const LABEL_GAP = 14;
const LABEL_SPACE = 44; // room around the hexagon for the corner labels
const MIN_REACH = 0.06; // a 1 still shows a sliver, not a collapsed point

const corner = (index, radius, center) => {
  const angle = ((-90 + index * 60) * Math.PI) / 180;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
};
const points = (list) => list.map(({ x, y }) => `${x},${y}`).join(" ");

export const TasteDnaRadar = ({
  fingerprint,
  size = 260,
  animate = true,
  caption = true,
}) => {
  const colors = useColors();
  const center = size / 2;
  const radius = center - LABEL_SPACE;
  const values = fingerprint ?? DIMENSIONS.map(() => 3);
  const reach = values.map((value) =>
    Math.max(MIN_REACH, (value - 1) / 4),
  );
  // The two strongest leanings towards a corner get the bright label.
  const strongest = values
    .map((value, index) => ({ index, lean: value - 3 }))
    .filter(({ lean }) => lean >= 0.5)
    .sort((a, b) => b.lean - a.lean)
    .slice(0, 2)
    .map(({ index }) => index);

  const grow = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    grow.value = withDelay(
      150,
      withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shapeStyle = useAnimatedStyle(() => ({
    opacity: grow.value,
    transform: [{ scale: 0.2 + grow.value * 0.8 }],
  }));

  const shape = reach.map((value, index) =>
    corner(index, radius * value, center),
  );
  const leanings = describeFingerprint(fingerprint);
  const leanText =
    leanings.length === 2
      ? t("{first} and {second}", { first: t(leanings[0]), second: t(leanings[1]) })
      : leanings.length === 1
        ? t(leanings[0])
        : null;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        {/* The web: rings, spokes, corner labels. */}
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          {RINGS.map((ring) => (
            <Polygon
              key={ring}
              points={points(
                DIMENSIONS.map((_, index) =>
                  corner(index, radius * ring, center),
                ),
              )}
              fill="none"
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          {DIMENSIONS.map((dimension, index) => {
            const end = corner(index, radius, center);
            const label = corner(index, radius + LABEL_GAP, center);
            const anchor =
              label.x > center + 4 ? "start" : label.x < center - 4 ? "end" : "middle";
            const isTop = index === 0;
            const isBottom = index === 3;
            const bright = strongest.includes(index);
            return [
              <Line
                key={`${dimension.key}-spoke`}
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke={colors.border}
                strokeWidth={1}
              />,
              <SvgText
                key={`${dimension.key}-label`}
                x={label.x}
                y={label.y + (isTop ? -2 : isBottom ? 10 : 4)}
                textAnchor={anchor}
                fontSize={11}
                fontFamily={bright ? fonts.bold : fonts.medium}
                fill={bright ? colors.textPrimary : colors.textMuted}
              >
                {t(dimension.high)}
              </SvgText>,
            ];
          })}
        </Svg>

        {/* Your shape, grown out from the centre. */}
        <Animated.View style={[StyleSheet.absoluteFill, shapeStyle]}>
          <Svg width={size} height={size}>
            <Polygon
              points={points(shape)}
              fill={`${colors.rating}38`}
              stroke={colors.rating}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {shape.map((point, index) => (
              <Circle
                key={DIMENSIONS[index].key}
                cx={point.x}
                cy={point.y}
                r={3}
                fill={colors.rating}
              />
            ))}
          </Svg>
        </Animated.View>
      </View>
      {caption && !!leanText && (
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          {t("Leans {leanings}", { leanings: leanText })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
  caption: {
    ...typography.bodyBold,
    fontSize: 13,
    marginTop: 4,
  },
});

export default TasteDnaRadar;

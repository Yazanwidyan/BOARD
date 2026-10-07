import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getTierInfo } from "../utils/tiers";

const SIZE = 64;
const STROKE = 5;

const SHORT_LABEL = {
  imdb: "IMDb",
  rt: "Rotten T.",
  mc: "Metacritic",
};

// A ring that fills clockwise to `fraction` (0–1), the value inside.
const Ring = ({ fraction, color, value, styles, trackColor }) => {
  const r = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={styles.ring}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={
            circumference * (1 - Math.max(0, Math.min(1, fraction)))
          }
          fill="none"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <Text style={[styles.ringValue, { color }]}>{value}</Text>
    </View>
  );
};

// Movie Details' scores as rings: IMDb (out of 10), Rotten Tomatoes and
// Metacritic (out of 100), each filling to its score, then your Reelboard
// tier as a filled tile in its colour (dashed and empty until you tier it).
//
// scores: [{ key, value, color?, fraction? }] — key "reelboard" is the tier.
export const ScoreRings = ({ scores }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.row}>
      {scores.map((score) => {
        if (score.key === "reelboard") {
          const info = getTierInfo(score.value);
          return (
            <View key={score.key} style={styles.item}>
              <View
                style={[
                  styles.tierTile,
                  info ? { backgroundColor: info.color } : styles.tierTileEmpty,
                ]}
              >
                <Text
                  style={[
                    styles.tierLetter,
                    { color: info ? "#161719" : colors.textMuted },
                  ]}
                >
                  {info ? info.key : "–"}
                </Text>
              </View>
              <Text style={styles.label} numberOfLines={1}>
                Your tier
              </Text>
            </View>
          );
        }
        return (
          <View key={score.key} style={styles.item}>
            <Ring
              fraction={score.fraction}
              color={score.color ?? colors.rating}
              value={score.key === "rt" ? `${score.value}%` : score.value}
              styles={styles}
              trackColor={colors.cardElevatedLight}
            />
            <Text style={styles.label} numberOfLines={1}>
              {SHORT_LABEL[score.key] ?? score.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    item: {
      flex: 1,
      alignItems: "center",
      gap: spacing.xs + 2,
    },
    ring: {
      width: SIZE,
      height: SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    ringValue: {
      ...typography.bodyBold,
      fontSize: 16,
    },
    tierTile: {
      width: SIZE,
      height: SIZE,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    tierTileEmpty: {
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.textMuted,
    },
    tierLetter: {
      ...typography.display,
      fontSize: 30,
      lineHeight: 36,
    },
    label: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
  });

export default ScoreRings;

import { Image, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import Svg, { Circle } from "react-native-svg";

import { radius } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { t } from "../i18n";

const RING_STROKE = 5;
const RING_GAP = 4;

// The avatar wrapped in the level-progress ring, with a "LV n" pill sitting
// on the ring's bottom edge — level lives on the person, rank lives in the
// card below.
export const AvatarLevelRing = ({ source, level, avatarSize = 88 }) => {
  const colors = useColors();
  const size = avatarSize + 2 * (RING_GAP + RING_STROKE);
  const ringRadius = (size - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const styles = createStyles(colors, size, avatarSize);

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={ringRadius}
          stroke={colors.surfaceSoft}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={ringRadius}
          stroke={colors.textPrimary}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - level.progress)}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.avatar}>
        <Image source={source} style={styles.avatarImage} />
      </View>
      <View style={styles.levelPill}>
        <Text style={styles.levelPillText}>
          {t("Lv")} {level.level}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (colors, size, avatarSize) =>
  StyleSheet.create({
    wrap: {
      width: size,
      height: size,
      alignItems: "center",
      justifyContent: "center",
    },
    avatar: {
      width: avatarSize,
      height: avatarSize,
      borderRadius: avatarSize / 2,
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    levelPill: {
      position: "absolute",
      bottom: -6,
      paddingHorizontal: 8,
      paddingVertical: 1,
      borderWidth: 2,
      borderColor: colors.background,
      backgroundColor: colors.textPrimary,
    },
    // A small square white tag, like the rank tags on posters.
    levelPillText: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      color: colors.background,
    },
  });

export default AvatarLevelRing;

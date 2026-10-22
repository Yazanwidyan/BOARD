import { Image, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { shape } from "../theme/spacing";
import { t } from "../i18n";
import { Text } from "./AppText";

const RING_STROKE = 5;
const RING_GAP = 4;

// The avatar wrapped in a ring that fills toward your next title, with
// your rank count and title ("23 · Star") on a tag at its bottom edge.
// `title`: getTitle() from utils/ranks. `color`: the ring's (gold unless
// given); `tag: false` leaves the tag off (when it shows elsewhere).
export const AvatarRankRing = ({ source, title, avatarSize = 88, color, tag = true }) => {
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
          stroke={color ?? colors.rating}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - title.progress)}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.avatar}>
        <Image source={source} style={styles.avatarImage} />
      </View>
      {tag && (
        <View style={styles.pill}>
          <Text style={styles.pillText} numberOfLines={1}>
            {title.count} · {t(title.name)}
          </Text>
        </View>
      )}
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
    // A small square gold tag, like the rank tags on posters.
    pill: {
      position: "absolute",
      bottom: -6,
      paddingHorizontal: 7,
      paddingVertical: 1,
      borderWidth: 2,
      borderColor: colors.background,
      backgroundColor: colors.rating,
      borderRadius: shape.chip,
    },
    pillText: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      color: colors.background,
    },
  });

export default AvatarRankRing;

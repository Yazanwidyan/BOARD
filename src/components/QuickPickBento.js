import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import Svg, { Circle, Path } from "react-native-svg";

import { MOVIES } from "../data/movies";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";
import { t } from "../i18n";

// Same alternating slice colors as the real wheel on SpinScreen, so the
// mini preview reads as the thing you're about to open.
const WHEEL_SLICE_COLORS = ["#4A4D53", "#2E3034"];
const WHEEL_SLICES = 8;
const WHEEL_SIZE = 108;

// Highest-rated titles make the decorative posters — computed once at
// module load, the catalog is static.
const SHOWCASE_POSTERS = [...MOVIES]
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 5)
  .map((movie) => movie.poster);
const AI_POSTERS = SHOWCASE_POSTERS.slice(0, 2);
const SWIPE_POSTERS = SHOWCASE_POSTERS.slice(2, 5);

const slicePath = (index, r) => {
  const angle = (2 * Math.PI) / WHEEL_SLICES;
  const start = index * angle - Math.PI / 2;
  const end = start + angle;
  const x1 = r + r * Math.cos(start);
  const y1 = r + r * Math.sin(start);
  const x2 = r + r * Math.cos(end);
  const y2 = r + r * Math.sin(end);
  return `M${r} ${r} L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z`;
};

const MiniWheel = ({ colors }) => {
  const r = WHEEL_SIZE / 2;
  return (
    <View>
      <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
        {Array.from({ length: WHEEL_SLICES }, (_, i) => (
          <Path
            key={i}
            d={slicePath(i, r)}
            fill={WHEEL_SLICE_COLORS[i % WHEEL_SLICE_COLORS.length]}
          />
        ))}
        <Circle cx={r} cy={r} r={10} fill={colors.card} />
      </Svg>
      <Svg width={14} height={12} style={miniWheelPointer}>
        <Path d="M0 0 H14 L7 12 Z" fill={colors.textPrimary} />
      </Svg>
    </View>
  );
};

const miniWheelPointer = {
  position: "absolute",
  top: -6,
  left: WHEEL_SIZE / 2 - 7,
};

// Decide's Quick Pick as a bento: AI as the full-width hero — a filled
// tile with real posters bleeding in from the right — and Swipe / Spin as
// tall tiles that each preview what they do (a fanned poster stack, a
// wheel). Square, edge to edge, 2px apart.
export const QuickPickBento = ({ onAI, onSwipe, onSpin }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.grid}>
      <Pressable style={styles.aiGlow} onPress={onAI}>
        <View style={styles.aiTile}>
          <View style={styles.aiPosters} pointerEvents="none">
            {AI_POSTERS.map((uri, index) => (
              <MoviePoster
                key={uri}
                uri={uri}
                style={[
                  styles.aiPoster,
                  index === 0 ? styles.aiPosterBack : styles.aiPosterFront,
                ]}
              />
            ))}
            {/* Posters fade into the card on their left edge. */}
            <LinearGradient
              colors={[colors.card, `${colors.card}00`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.7, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View style={styles.aiText}>
            <Text style={styles.aiEyebrow}>{t("AI pick")}</Text>
            <Text style={styles.aiTitle}>{t("Let ReelBoard choose")}</Text>
            <Text style={styles.aiSubtitle}>{t("Based on your taste")}</Text>
            <Text style={styles.aiCtaText}>{t("Pick for me")}</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.halfRow}>
        <Pressable style={styles.halfTile} onPress={onSwipe}>
          <View style={styles.preview}>
            {SWIPE_POSTERS.map((uri, index) => (
              <MoviePoster
                key={uri}
                uri={uri}
                style={[styles.fanPoster, FAN_POSITIONS[index]]}
              />
            ))}
          </View>
          <Text style={styles.halfTitle}>{t("Swipe")}</Text>
          <Text style={styles.halfSubtitle}>{t("10 at a time")}</Text>
        </Pressable>

        <Pressable style={styles.halfTile} onPress={onSpin}>
          <View style={styles.preview}>
            <MiniWheel colors={colors} />
          </View>
          <Text style={styles.halfTitle}>{t("Spin")}</Text>
          <Text style={styles.halfSubtitle}>{t("Let fate decide")}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const FAN_POSTER_WIDTH = 62;

// Left / right cards tilt out and sit lower; the middle one is raised and
// drawn last so it's on top.
const FAN_POSITIONS = [
  {
    transform: [{ translateX: -38 }, { translateY: 10 }, { rotate: "-12deg" }],
  },
  { transform: [{ translateX: 38 }, { translateY: 10 }, { rotate: "12deg" }] },
  { transform: [{ translateY: -4 }], zIndex: 1 },
];

const createStyles = (colors) =>
  StyleSheet.create({
    // Edge to edge (cancels the section padding), square, 2px apart.
    grid: {
      gap: 2,
      marginHorizontal: -spacing.md,
    },
    aiGlow: {},
    aiTile: {
      backgroundColor: colors.card,
      padding: spacing.md,
      overflow: "hidden",
      minHeight: 156,
    },
    aiPosters: {
      position: "absolute",
      top: 0,
      end: 0,
      bottom: 0,
      width: 190,
    },
    aiPoster: {
      position: "absolute",
      width: 92,
      aspectRatio: 2 / 3,
    },
    aiPosterBack: {
      top: 10,
      end: 70,
      transform: [{ rotate: "-8deg" }],
      opacity: 0.8,
    },
    aiPosterFront: {
      top: 26,
      end: -10,
      transform: [{ rotate: "7deg" }],
    },
    aiText: {
      maxWidth: "58%",
    },
    aiEyebrow: {
      ...typography.caption,
      color: colors.textMuted,
    },
    aiTitle: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    aiSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    // A plain text action — the whole tile is the button.
    aiCtaText: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    halfRow: {
      flexDirection: "row",
      gap: 2,
    },
    // Flat, solid, square tiles.
    halfTile: {
      flex: 1,
      backgroundColor: colors.card,
      padding: spacing.md,
      overflow: "hidden",
    },
    preview: {
      height: 128,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    fanPoster: {
      position: "absolute",
      width: FAN_POSTER_WIDTH,
      aspectRatio: 2 / 3,
    },
    halfTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    halfSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });

export default QuickPickBento;

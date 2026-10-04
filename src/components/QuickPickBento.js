import { ArrowRight, Sparkles } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { MOVIES } from "../data/movies";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";

// Same alternating slice colors as the real wheel on SpinScreen, so the
// mini preview reads as the thing you're about to open.
const WHEEL_SLICE_COLORS = ["#8D60E2", "#4A4D84"];
const WHEEL_SLICES = 8;
const WHEEL_SIZE = 72;

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
        <Circle cx={r} cy={r} r={7} fill={colors.card} />
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

// Decide's Quick Pick as a bento: AI as the full-width hero (blue, real
// posters leaning in from the right), Swipe and Spin as half tiles that
// each preview what they do — a fanned poster stack and a mini wheel.
export const QuickPickBento = ({ onAI, onSwipe, onSpin }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.grid}>
      <Pressable style={styles.aiTile} onPress={onAI}>
        <View style={styles.aiPosters} pointerEvents="none">
          {AI_POSTERS.map((uri, index) => (
            <MoviePoster
              key={uri}
              uri={uri}
              radius={radius.xs}
              style={[
                styles.aiPoster,
                index === 0 ? styles.aiPosterBack : styles.aiPosterFront,
              ]}
            />
          ))}
        </View>

        <View style={styles.aiText}>
          <View style={styles.aiEyebrowRow}>
            <Sparkles size={12} color={colors.accentContrast} />
            <Text style={styles.aiEyebrow}>AI PICK</Text>
          </View>
          <Text style={styles.aiTitle}>Let BOARD choose</Text>
          <Text style={styles.aiSubtitle}>Based on your taste</Text>
          <View style={styles.aiCta}>
            <Text style={styles.aiCtaText}>Pick for me</Text>
            <ArrowRight size={14} color={colors.accent} />
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
                radius={radius.xs}
                style={[styles.fanPoster, FAN_POSITIONS[index]]}
              />
            ))}
          </View>
          <Text style={styles.halfTitle}>Swipe</Text>
          <Text style={styles.halfSubtitle}>10 at a time</Text>
        </Pressable>

        <Pressable style={styles.halfTile} onPress={onSpin}>
          <View style={styles.preview}>
            <MiniWheel colors={colors} />
          </View>
          <Text style={styles.halfTitle}>Spin</Text>
          <Text style={styles.halfSubtitle}>Let fate decide</Text>
        </Pressable>
      </View>
    </View>
  );
};

const FAN_POSTER_WIDTH = 40;

// Left / right cards tilt out and sit lower; the middle one is raised and
// drawn last so it's on top.
const FAN_POSITIONS = [
  { transform: [{ translateX: -26 }, { translateY: 6 }, { rotate: "-12deg" }] },
  { transform: [{ translateX: 26 }, { translateY: 6 }, { rotate: "12deg" }] },
  { transform: [{ translateY: -2 }], zIndex: 1 },
];

const createStyles = (colors) =>
  StyleSheet.create({
    grid: {
      gap: spacing.sm,
    },
    aiTile: {
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      padding: spacing.md,
      overflow: "hidden",
      minHeight: 140,
    },
    aiPosters: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      width: 150,
    },
    aiPoster: {
      position: "absolute",
      width: 70,
      aspectRatio: 2 / 3,
    },
    aiPosterBack: {
      top: 22,
      right: 54,
      transform: [{ rotate: "-10deg" }],
      opacity: 0.85,
    },
    aiPosterFront: {
      top: 34,
      right: -6,
      transform: [{ rotate: "8deg" }],
    },
    aiText: {
      maxWidth: "58%",
    },
    aiEyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    aiEyebrow: {
      ...typography.label,
      color: "rgba(255, 255, 255, 0.85)",
    },
    aiTitle: {
      ...typography.title,
      color: colors.accentContrast,
      marginTop: spacing.xs,
    },
    aiSubtitle: {
      ...typography.caption,
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: 2,
    },
    aiCta: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.accentContrast,
    },
    aiCtaText: {
      ...typography.label,
      color: colors.accent,
    },
    halfRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    halfTile: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: spacing.md,
      overflow: "hidden",
    },
    preview: {
      height: 86,
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

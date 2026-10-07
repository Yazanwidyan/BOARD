import * as Haptics from "expo-haptics";
import { ArrowUpRight, RotateCw, Shuffle } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { HeaderIconButton, StackHeader } from "../components/ScreenHeader";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { generateRecommendations } from "../services/recommendations";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { useUserStore } from "../store/userStore";
import { colors as styleColors } from "../theme/palettes";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { bucketListIds, formatRuntime } from "../utils/movieFilters";

// Eight slices — big enough that each one carries a readable poster
// instead of a truncated 10px title.
const CANDIDATE_COUNT = 8;
const WHEEL_SIZE = 300;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const RIM_WIDTH = 10;
const HUB_SIZE = 72;
const POSTER_WIDTH = 40;
const POSTER_RING = WHEEL_RADIUS * 0.62;
const FULL_SPINS = 5;
const SPIN_DURATION_MS = 4200;
const SLICE_COLORS = ["#8D60E2", "#4A4D84"];

// 0° = straight up (where the pointer is), increasing clockwise.
const polarToCartesian = (angleDeg, r) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: WHEEL_RADIUS + r * Math.cos(angleRad),
    y: WHEEL_RADIUS + r * Math.sin(angleRad),
  };
};

const describeSlice = (startAngle, endAngle, r) => {
  const start = polarToCartesian(startAngle, r);
  const end = polarToCartesian(endAngle, r);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${WHEEL_RADIUS} ${WHEEL_RADIUS} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
};

// Watchlist first, never something already watched.
const pickCandidates = (preferences, bucketList) =>
  generateRecommendations(
    preferences,
    CANDIDATE_COUNT,
    bucketListIds(bucketList),
    useMovieStore.getState().watched.map((entry) => entry.movieId),
  );

// The wheel itself: slices + a poster riding in each one, all inside the
// rotating view so they turn together. After landing, every poster except
// the winner dims.
const Wheel = ({ candidates, winnerId, rotatorStyle, colors }) => {
  const sliceAngle = 360 / candidates.length;
  const innerRadius = WHEEL_RADIUS - RIM_WIDTH;

  return (
    <Animated.View style={[styles.wheel, rotatorStyle]}>
      <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
        <Circle
          cx={WHEEL_RADIUS}
          cy={WHEEL_RADIUS}
          r={WHEEL_RADIUS - RIM_WIDTH / 2}
          fill="none"
          stroke={colors.card}
          strokeWidth={RIM_WIDTH}
        />
        {candidates.map((movie, index) => (
          <Path
            key={movie.id}
            d={describeSlice(
              index * sliceAngle,
              (index + 1) * sliceAngle,
              innerRadius,
            )}
            fill={SLICE_COLORS[index % SLICE_COLORS.length]}
            stroke={colors.background}
            strokeWidth={2}
          />
        ))}
        {/* Little rim lights at every slice boundary. */}
        {candidates.map((movie, index) => {
          const dot = polarToCartesian(
            index * sliceAngle,
            WHEEL_RADIUS - RIM_WIDTH / 2,
          );
          return (
            <Circle
              key={`dot-${movie.id}`}
              cx={dot.x}
              cy={dot.y}
              r={2.5}
              fill={colors.rating}
            />
          );
        })}
      </Svg>

      {candidates.map((movie, index) => {
        const midAngle = index * sliceAngle + sliceAngle / 2;
        const point = polarToCartesian(midAngle, POSTER_RING);
        const posterHeight = POSTER_WIDTH * 1.5;
        return (
          <View
            key={movie.id}
            pointerEvents="none"
            style={[
              styles.wheelPoster,
              {
                left: point.x - POSTER_WIDTH / 2,
                top: point.y - posterHeight / 2,
                transform: [{ rotate: `${midAngle}deg` }],
                opacity: winnerId && winnerId !== movie.id ? 0.3 : 1,
              },
            ]}
          >
            <MoviePoster
              uri={movie.poster}
              style={{ width: POSTER_WIDTH, height: posterHeight }}
            />
          </View>
        );
      })}
    </Animated.View>
  );
};

export const SpinScreen = ({ navigation }) => {
  const colors = useColors();
  const bucketList = useMovieStore((state) => state.bucketList);
  const pickedMovie = useMovieStore((state) => state.pickedMovie);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const preferences = useUserStore((state) => state.preferences);

  // Same pool as Swipe: saved preferences, watchlist first. Picked once per
  // visit (and again on "New wheel"), never on re-render.
  const initialRef = useRef(null);
  if (!initialRef.current) {
    initialRef.current = pickCandidates(preferences, bucketList);
  }
  const [candidates, setCandidates] = useState(initialRef.current);
  const [phase, setPhase] = useState("idle"); // idle | spinning | landed
  const [winner, setWinner] = useState(null);
  const rotation = useSharedValue(0);
  // Reduce Motion: a short, single-turn spin instead of five fast turns.
  const reduceMotion = useReducedMotion();
  const sliceAngle = 360 / Math.max(1, candidates.length);

  // A light tick each time a slice boundary passes the pointer — the
  // wheel audibly-feels like it's slowing down.
  const tick = () => Haptics.selectionAsync();
  useAnimatedReaction(
    () => Math.floor((((-rotation.value % 360) + 360) % 360) / sliceAngle),
    (current, previous) => {
      if (previous !== null && current !== previous) runOnJS(tick)();
    },
    [sliceAngle],
  );

  const land = (winnerMovie) => {
    setWinner(winnerMovie);
    setPhase("landed");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const spin = () => {
    if (phase === "spinning" || candidates.length === 0) return;
    setPhase("spinning");
    setWinner(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const winnerIndex = Math.floor(Math.random() * candidates.length);
    // Land inside the winning slice (never on a boundary): its center,
    // nudged up to 35% of a slice either way so it doesn't always stop
    // dead-center.
    const center = winnerIndex * sliceAngle + sliceAngle / 2;
    const jitter = (Math.random() - 0.5) * sliceAngle * 0.7;
    // Rotating by R brings angle a to a + R; we want center + jitter at 0
    // (the pointer), at least FULL_SPINS turns past wherever it is now.
    const current = rotation.value;
    const base =
      Math.ceil(current / 360) * 360 + (reduceMotion ? 1 : FULL_SPINS) * 360;
    const target = base - (center + jitter);

    rotation.value = withTiming(
      target,
      {
        duration: reduceMotion ? 1200 : SPIN_DURATION_MS,
        // Fast start, long smooth slowdown — no overshoot or bounce.
        easing: Easing.bezier(0.15, 0.6, 0.2, 1),
      },
      (finished) => {
        if (finished) runOnJS(land)(candidates[winnerIndex]);
      },
    );
  };

  const newWheel = () => {
    if (phase === "spinning") return;
    setCandidates(pickCandidates(preferences, bucketList));
    setWinner(null);
    setPhase("idle");
  };

  const makeTonightsPick = () => {
    if (pickedMovie !== winner.id) togglePickedMovie(winner.id);
    showToast(`${winner.title} is tonight's pick`, { tone: "success" });
  };

  const rotatorStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const eyebrow =
    phase === "spinning"
      ? "SPINNING…"
      : phase === "landed"
        ? "THE WHEEL HAS SPOKEN"
        : `${candidates.length} PICKS ON THE WHEEL`;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StackHeader
        title="Spin"
        onBack={() => navigation.goBack()}
        right={
          <HeaderIconButton
            onPress={newWheel}
            style={phase === "spinning" && styles.disabled}
          >
            <Shuffle size={18} color={colors.textPrimary} />
          </HeaderIconButton>
        }
      />

      {candidates.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.resultTitle}>Nothing to spin yet.</Text>
          <Text style={styles.hint}>
            Loosen your preferences or save a few movies first.
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>

          <View style={styles.wheelWrap}>
            <Wheel
              candidates={candidates}
              winnerId={phase === "landed" ? winner?.id : null}
              rotatorStyle={rotatorStyle}
              colors={colors}
            />
            {/* Pointer — fixed at 12 o'clock, pointing down into the wheel. */}
            <View style={styles.pointer} pointerEvents="none">
              <Svg width={28} height={30}>
                <Path
                  d="M2 2 H26 L14 28 Z"
                  fill={colors.textPrimary}
                  stroke={colors.background}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            {/* Hub doubles as the spin button. */}
            <Pressable
              style={({ pressed }) => [
                styles.hub,
                pressed && styles.hubPressed,
                phase === "spinning" && styles.hubSpinning,
              ]}
              onPress={spin}
              disabled={phase === "spinning"}
            >
              <Text style={styles.hubText}>
                {phase === "landed" ? "AGAIN" : "SPIN"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.resultArea}>
            {phase === "landed" && winner ? (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={styles.result}
              >
                <Pressable
                  style={styles.resultRow}
                  onPress={() =>
                    navigation.navigate("MovieDetails", { movieId: winner.id })
                  }
                >
                  <MoviePoster
                    uri={winner.poster}
                    style={styles.resultPoster}
                  />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle} numberOfLines={2}>
                      {winner.title}
                    </Text>
                    <Text style={styles.resultMeta}>
                      {winner.year} · {formatRuntime(winner.runtime)} ·{" "}
                      {winner.genres[0]}
                    </Text>
                  </View>
                  <ArrowUpRight size={18} color={colors.textSecondary} />
                </Pressable>
                <View style={styles.actions}>
                  <PrimaryButton
                    label={
                      pickedMovie === winner.id
                        ? "Tonight's pick ✓"
                        : "Make it tonight's pick"
                    }
                    variant={
                      pickedMovie === winner.id ? "secondary" : "primary"
                    }
                    disabled={pickedMovie === winner.id}
                    onPress={makeTonightsPick}
                    style={styles.mainAction}
                    contentStyle={styles.actionContent}
                  />
                  <Pressable
                    style={styles.roundButton}
                    onPress={spin}
                    hitSlop={6}
                    accessibilityLabel="Spin again"
                  >
                    <RotateCw size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>
              </Animated.View>
            ) : (
              <Text style={styles.hint}>
                {phase === "spinning"
                  ? "Here it goes…"
                  : "Tap SPIN and let fate pick tonight's movie."}
              </Text>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

// The palette is static (useColors just returns it), so these styles are
// created once at module level and shared with the Wheel component.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: styleColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: styleColors.card,
  },
  disabled: {
    opacity: 0.4,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.label,
    color: styleColors.textSecondary,
    letterSpacing: 2,
  },
  wheelWrap: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  wheel: {
    position: "absolute",
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
  },
  wheelPoster: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.85)",
  },
  pointer: {
    position: "absolute",
    top: -14,
    zIndex: 2,
  },
  hub: {
    width: HUB_SIZE,
    height: HUB_SIZE,
    borderRadius: HUB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: styleColors.textPrimary,
    borderWidth: 4,
    borderColor: styleColors.background,
  },
  hubPressed: {
    transform: [{ scale: 0.94 }],
  },
  hubSpinning: {
    opacity: 0.6,
  },
  hubText: {
    ...typography.label,
    fontSize: 13,
    letterSpacing: 1.5,
    color: styleColors.background,
  },
  resultArea: {
    alignSelf: "stretch",
    minHeight: 150,
    justifyContent: "center",
  },
  hint: {
    ...typography.body,
    color: styleColors.textSecondary,
    textAlign: "center",
  },
  result: {
    gap: spacing.md,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm + 2,
    backgroundColor: styleColors.card,
  },
  resultPoster: {
    width: 56,
    aspectRatio: 2 / 3,
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    ...typography.title,
    color: styleColors.textPrimary,
  },
  resultMeta: {
    ...typography.caption,
    color: styleColors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  mainAction: {
    flex: 1,
  },
  actionContent: {
    paddingVertical: 10,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: styleColors.card,
  },
});

export default SpinScreen;

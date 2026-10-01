import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";

import { BackButton } from "../components/BackButton";
import { MoviePoster } from "../components/MoviePoster";
import { generateRecommendations } from "../services/recommendations";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { useUserStore } from "../store/userStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { bucketListIds } from "../utils/movieFilters";

// Same size, same filtered pool as Swipe (see PreferencesScreen's
// SWIPE_SIZE) — Swipe and Spin are the same underlying pick, just two
// different reveals on top of it: browse-and-eliminate vs. an actual
// spinning wheel that lands on one.
const CANDIDATE_COUNT = 10;
const WHEEL_SIZE = 300;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const FULL_SPINS = 6;
const SPIN_DURATION_MS = 3800;
const SETTLE_PAUSE_MS = 700;
const SLICE_COLORS = ["#8D60E2", "#4A4D84"];

// 0° = straight up, increasing clockwise — the whole wheel is built and
// reasoned about in this "clock face" convention, matching where the
// pointer sits.
const polarToCartesian = (angleDeg, r = WHEEL_RADIUS) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: WHEEL_RADIUS + r * Math.cos(angleRad),
    y: WHEEL_RADIUS + r * Math.sin(angleRad),
  };
};

const describeSlice = (startAngle, endAngle) => {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${WHEEL_RADIUS} ${WHEEL_RADIUS} L ${start.x} ${start.y} A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
};

const truncateTitle = (title, max = 16) =>
  title.length > max ? `${title.slice(0, max - 1)}…` : title;

const Wheel = ({ candidates, rotatorStyle }) => {
  const sliceAngle = 360 / candidates.length;
  const labelPoint = (angleDeg) =>
    polarToCartesian(angleDeg, WHEEL_RADIUS * 0.62);

  return (
    <Animated.View style={rotatorStyle}>
      <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
        {candidates.map((movie, index) => (
          <Path
            key={movie.id}
            d={describeSlice(index * sliceAngle, (index + 1) * sliceAngle)}
            fill={SLICE_COLORS[index % SLICE_COLORS.length]}
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth={1}
          />
        ))}
        {candidates.map((movie, index) => {
          const midAngle = index * sliceAngle + sliceAngle / 2;
          const label = labelPoint(midAngle);
          return (
            <SvgText
              key={movie.id}
              x={label.x}
              y={label.y}
              fill="#FFFFFF"
              fontSize={10}
              fontWeight="700"
              textAnchor="middle"
              transform={`rotate(${midAngle}, ${label.x}, ${label.y})`}
            >
              {truncateTitle(movie.title)}
            </SvgText>
          );
        })}
        <Circle cx={WHEEL_RADIUS} cy={WHEEL_RADIUS} r={22} fill="#131321" />
      </Svg>
    </Animated.View>
  );
};

export const SpinScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const bucketList = useMovieStore((state) => state.bucketList);
  const preferences = useUserStore((state) => state.preferences);
  const startSession = useSessionStore((state) => state.startSession);
  const chooseFinal = useSessionStore((state) => state.chooseFinal);

  // Reads whatever preferences are already saved (genres/rating/decade/
  // runtime from the Preferences screen) rather than asking again — Spin's
  // whole appeal is being instant, with no screen in between.
  const candidatesRef = useRef(null);
  if (!candidatesRef.current) {
    candidatesRef.current = generateRecommendations(
      preferences,
      CANDIDATE_COUNT,
      bucketListIds(bucketList),
    );
  }
  const candidates = candidatesRef.current;

  const [settled, setSettled] = useState(false);
  const [winner, setWinner] = useState(null);
  const rotation = useSharedValue(0);

  // useFocusEffect re-invokes this callback whenever ITS OWN identity
  // changes, not just on real focus/blur — an inline arrow function here
  // gets a new identity on every re-render, and since the spin logic below
  // calls setSettled/setWinner (which cause a re-render), that was
  // restarting the whole spin from rotation 0 over and over, which is
  // exactly what looked like "lands, then respins, then shows the winner
  // immediately." Wrapping it in useCallback with a stable (empty)
  // dependency list makes it fire once per genuine focus, not per render.
  const runSpin = useCallback(() => {
    setSettled(false);
    setWinner(null);
    rotation.value = 0;

    if (candidates.length === 0) return;

    const winnerIndex = Math.floor(Math.random() * candidates.length);
    const sliceAngle = 360 / candidates.length;
    // The wheel is drawn with slice `i`'s center at angle i*sliceAngle
    // (clockwise from top). Rotating the wheel by R moves that point to
    // (i*sliceAngle + R) mod 360 — solving for R landing it under the
    // fixed top pointer (angle 0) gives this.
    const targetAngle = winnerIndex * sliceAngle;
    const finalRotation = FULL_SPINS * 360 - targetAngle;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const handleSettle = () => {
      const winnerMovie = candidates[winnerIndex];
      setWinner(winnerMovie);
      setSettled(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        startSession(candidates);
        chooseFinal(winnerMovie);
        navigation.replace("Swipe");
      }, SETTLE_PAUSE_MS);
    };

    rotation.value = withTiming(
      finalRotation,
      {
        duration: SPIN_DURATION_MS,
        // A long, strong deceleration tail — spins fast at first, then
        // visibly slows into the landing, like a real wheel losing
        // momentum rather than a linear or bouncy stop.
        easing: Easing.bezier(0.12, 0.66, 0.15, 1),
      },
      (finished) => {
        if (finished) runOnJS(handleSettle)();
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(runSpin);

  const rotatorStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.body}>
        <Text style={styles.eyebrow}>
          {settled ? "IT'S A MATCH" : "SPINNING..."}
        </Text>

        <View style={styles.wheelWrap}>
          <View style={styles.pointer} />
          {candidates.length > 0 && (
            <Wheel candidates={candidates} rotatorStyle={rotatorStyle} />
          )}
        </View>

        {settled && winner && (
          <Animated.View
            entering={FadeIn.duration(220)}
            style={styles.resultRow}
          >
            <MoviePoster
              uri={winner.poster}
              radius={radius.sm}
              shadow
              style={styles.resultPoster}
            />
            <Text style={styles.title} numberOfLines={2}>
              {winner.title}
            </Text>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.md,
    },
    body: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      gap: spacing.xl,
    },
    eyebrow: {
      ...typography.label,
      color: colors.textSecondary,
      letterSpacing: 2,
    },
    wheelWrap: {
      width: WHEEL_SIZE,
      height: WHEEL_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    pointer: {
      position: "absolute",
      top: -4,
      zIndex: 2,
      width: 0,
      height: 0,
      borderLeftWidth: 12,
      borderRightWidth: 12,
      borderTopWidth: 18,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: colors.accentLight,
    },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    resultPoster: {
      width: 72,
      aspectRatio: 2 / 3,
    },
    title: {
      ...typography.title,
      flex: 1,
      color: colors.textPrimary,
    },
  });

export default SpinScreen;

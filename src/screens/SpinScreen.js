import { useFocusEffect } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { MoviePoster } from "../components/MoviePoster";
import { MOVIES } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { shuffle } from "../utils/shuffle";

const CANDIDATE_COUNT = 8;
const SPIN_START_DELAY_MS = 60;
const SPIN_MAX_DELAY_MS = 320;
const SPIN_DELAY_STEP_MS = 22;
const SETTLE_PAUSE_MS = 550;

export const SpinScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const bucketList = useMovieStore((state) => state.bucketList);
  const startSession = useSessionStore((state) => state.startSession);
  const chooseFinal = useSessionStore((state) => state.chooseFinal);

  // Spin from the watchlist when there's enough to choose from, otherwise a
  // random sample of the full catalog — same "don't fabricate, use what's
  // real" rule as everywhere else in this pass.
  const candidatesRef = useRef(null);
  if (!candidatesRef.current) {
    const pool =
      bucketList.length >= 2
        ? bucketList
            .map((id) => MOVIES.find((movie) => movie.id === id))
            .filter(Boolean)
        : MOVIES;
    candidatesRef.current = shuffle(pool).slice(0, CANDIDATE_COUNT);
  }
  const candidates = candidatesRef.current;

  const [activeIndex, setActiveIndex] = useState(0);
  const [settled, setSettled] = useState(false);
  const scale = useSharedValue(1);

  useFocusEffect(
    // Re-runs the whole reveal fresh every time this screen is focused
    // (including navigating back into it), rather than only on first mount.
    () => {
      let cancelled = false;
      let index = 0;
      let delay = SPIN_START_DELAY_MS;

      const tick = () => {
        if (cancelled) return;
        index = (index + 1) % candidates.length;
        setActiveIndex(index);
        delay = Math.min(SPIN_MAX_DELAY_MS, delay + SPIN_DELAY_STEP_MS);

        if (delay >= SPIN_MAX_DELAY_MS) {
          setSettled(true);
          scale.value = withSequence(
            withTiming(1.12, { duration: 160 }),
            withTiming(1, { duration: 160 }),
          );
          const winner = candidates[index];
          setTimeout(() => {
            if (cancelled) return;
            startSession(candidates);
            chooseFinal(winner);
            navigation.replace("Swipe");
          }, SETTLE_PAUSE_MS);
          return;
        }

        setTimeout(tick, delay);
      };

      const timer = setTimeout(tick, delay);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    },
  );

  const posterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const activeMovie = candidates[activeIndex];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.body}>
        <Text style={styles.eyebrow}>
          {settled ? "IT'S A MATCH" : "SPINNING..."}
        </Text>
        {activeMovie && (
          <Animated.View style={posterStyle}>
            <MoviePoster
              uri={activeMovie.poster}
              radius={radius.sm}
              shadow
              style={styles.poster}
            />
          </Animated.View>
        )}
        {activeMovie && (
          <Text style={styles.title} numberOfLines={2}>
            {activeMovie.title}
          </Text>
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
      gap: spacing.md,
    },
    eyebrow: {
      ...typography.label,
      color: colors.textSecondary,
      letterSpacing: 2,
    },
    poster: {
      width: 220,
      aspectRatio: 2 / 3,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
      textAlign: "center",
    },
  });

export default SpinScreen;

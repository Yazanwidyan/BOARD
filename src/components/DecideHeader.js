import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOVIES } from "../data/movies";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { shuffle } from "../utils/shuffle";
import { MoviePoster } from "./MoviePoster";

const POSTER_WIDTH = 28;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const POSTER_GAP = 2;
const MARQUEE_COUNT = 18;
// Per poster, so the drift speed stays the same whatever the count.
const MS_PER_POSTER = 1400;

// Decide's own header — the other tabs' plain bar, plus a "Surprise me"
// text action (one tap to a pick) and a slim marquee of posters drifting
// along the bottom edge, 2px apart, like a cinema sign full of options.
//
// The strip is the list drawn twice side by side and slid left by exactly
// one copy's width on a linear loop, so the jump back to the start lands
// on an identical frame — a seamless, endless scroll.
const Marquee = ({ movies, styles }) => {
  const offset = useSharedValue(0);
  const loopWidth = movies.length * (POSTER_WIDTH + POSTER_GAP);
  // Reduce Motion: the strip stays still.
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    offset.value = withRepeat(
      withTiming(-loopWidth, {
        duration: movies.length * MS_PER_POSTER,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View style={styles.marqueeClip} pointerEvents="none">
      <Animated.View style={[styles.marqueeRow, style]}>
        {[...movies, ...movies].map((movie, index) => (
          <MoviePoster
            key={`${movie.id}-${index}`}
            uri={movie.poster}
            style={styles.marqueePoster}
          />
        ))}
      </Animated.View>
    </View>
  );
};

export const DecideHeader = ({ onSurprise, onMeasure }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  // Picked once per mount: well-known titles, in a random order.
  const [movies] = useState(() =>
    shuffle(MOVIES.slice(0, 60)).slice(0, MARQUEE_COUNT),
  );

  return (
    <View
      style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      onLayout={(event) => onMeasure?.(event.nativeEvent.layout.height)}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Decide</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.surprise,
            pressed && styles.surprisePressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSurprise();
          }}
        >
          <Text style={styles.surpriseText}>Surprise me</Text>
        </Pressable>
      </View>
      <Marquee movies={movies} styles={styles} />
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Same layering rules as the shared header: above the scroll content
    // on iOS (zIndex) and Android (elevation above any card's).
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      elevation: 16,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingBottom: spacing.sm,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    titleBlock: {
      flex: 1,
    },
    title: {
      ...typography.display,
      fontSize: 24,
      lineHeight: 30,
      letterSpacing: -0.6,
      color: colors.textPrimary,
    },
    // A plain text action, like the app's other header actions.
    surprise: {
      paddingVertical: spacing.sm,
    },
    surprisePressed: {
      opacity: 0.6,
    },
    surpriseText: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    marqueeClip: {
      marginTop: spacing.sm + 2,
      height: POSTER_HEIGHT,
      overflow: "hidden",
    },
    marqueeRow: {
      flexDirection: "row",
      gap: POSTER_GAP,
      paddingLeft: POSTER_GAP,
    },
    marqueePoster: {
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
    },
  });

export default DecideHeader;

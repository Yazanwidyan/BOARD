import * as Haptics from "expo-haptics";
import { Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
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
const POSTER_GAP = 6;
const MARQUEE_COUNT = 18;
// Per poster, so the drift speed stays the same whatever the count.
const MS_PER_POSTER = 1400;

// Decide's own header — unlike the other tabs' plain bars. Card-colored
// like them, but with a "Surprise me" button (one tap to a pick) and a
// slim marquee of posters drifting along the bottom edge, like a cinema
// sign full of options.
//
// The strip is the list drawn twice side by side and slid left by exactly
// one copy's width on a linear loop, so the jump back to the start lands
// on an identical frame — a seamless, endless scroll.
const Marquee = ({ movies, styles }) => {
  const offset = useSharedValue(0);
  const loopWidth = movies.length * (POSTER_WIDTH + POSTER_GAP);

  useEffect(() => {
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
          <Text style={styles.subtitle}>
            Can&apos;t choose? We&apos;ve got you.
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.surprise,
            pressed && styles.surprisePressed,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSurprise();
          }}
        >
          <Sparkles size={15} color={colors.accentContrast} />
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
      backgroundColor: colors.card,
      borderBottomWidth: 1,
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
      ...typography.title,
      fontSize: 20,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 1,
    },
    surprise: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    surprisePressed: {
      transform: [{ scale: 0.95 }],
    },
    surpriseText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.accentContrast,
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
      opacity: 0.85,
    },
  });

export default DecideHeader;

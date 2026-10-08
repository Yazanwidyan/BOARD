import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Text } from "./AppText";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { useStretchyBackdropStyle } from "../utils/scrollEffects";
import { MoviePoster } from "./MoviePoster";
import { t } from "../i18n";

// Home's top banner, streaming-app style: full width, the movie's poster
// blurred behind and fading into the page, the poster on the left, a
// small label, a big title, one line of meta, an optional reason, and the
// actions underneath. Without a poster (the welcome) it's just the text.
//
// Sits inside Home's padded section, so it cancels that padding to reach
// the screen edges.
//
// Pass the page's `scrollY` and it answers the pull-to-refresh: pull down
// and the blurred backdrop stretches up with you while the poster grows a
// little (anchored at its bottom edge); scroll on and the backdrop drifts
// behind the page.
const POSTER_WIDTH = 116;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const POSTER_PULL_SCALE = 0.14; // the most the poster grows on a full pull
const POSTER_PULL_DISTANCE = 140;

export const HomeHero = ({
  posterUri,
  eyebrow,
  title,
  meta,
  reason,
  actions,
  onPress,
  onDismiss,
  scrollY,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [height, setHeight] = useState(0);
  const stillScroll = useSharedValue(0);
  const backdropStyle = useStretchyBackdropStyle(
    scrollY ?? stillScroll,
    scrollY ? height : 0,
  );
  const posterStyle = useAnimatedStyle(() => {
    const pull = scrollY ? Math.max(0, -scrollY.value) : 0;
    const scale =
      1 +
      interpolate(
        pull,
        [0, POSTER_PULL_DISTANCE],
        [0, POSTER_PULL_SCALE],
        Extrapolation.CLAMP,
      );
    // Grow from the bottom edge, so it rises rather than spreading down.
    return {
      transform: [
        { translateY: (-(scale - 1) * POSTER_HEIGHT) / 2 },
        { scale },
      ],
    };
  });

  return (
    <Pressable
      style={[styles.hero, !scrollY && styles.clip]}
      onPress={onPress}
      disabled={!onPress}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
    >
      {posterUri && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, backdropStyle]}
        >
          <Image
            source={{ uri: posterUri }}
            blurRadius={22}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[
              `${colors.background}40`,
              `${colors.background}B3`,
              colors.background,
            ]}
            locations={[0, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {onDismiss && (
        <Pressable
          style={styles.dismiss}
          onPress={onDismiss}
          hitSlop={10}
          accessibilityLabel={t("Remove")}
        >
          <X size={22} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
      )}

      <View style={styles.row}>
        {posterUri && (
          <Animated.View style={posterStyle}>
            <MoviePoster uri={posterUri} shadow style={styles.poster} />
          </Animated.View>
        )}
        <View style={styles.text}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title} numberOfLines={3}>
            {title}
          </Text>
          {!!meta && (
            <Text style={styles.meta} numberOfLines={2}>
              {meta}
            </Text>
          )}
          {reason}
        </View>
      </View>
      {actions && <View style={styles.actions}>{actions}</View>}
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    hero: {
      marginHorizontal: -spacing.md,
      marginTop: -spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    // Without the pull effect, keep the backdrop inside the banner. With
    // it, the backdrop has to be free to stretch past the top.
    clip: {
      overflow: "hidden",
    },
    // A flat ✕ like the header icons (no circle).
    dismiss: {
      position: "absolute",
      top: spacing.md,
      end: spacing.md,
      zIndex: 2,
      width: 32,
      height: 32,
      alignItems: "flex-end",
      justifyContent: "flex-start",
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.md,
    },
    poster: {
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
    },
    text: {
      flex: 1,
      paddingEnd: spacing.lg,
    },
    eyebrow: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    title: {
      ...typography.display,
      fontSize: 28,
      lineHeight: 33,
      letterSpacing: -0.6,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
  });

export default HomeHero;

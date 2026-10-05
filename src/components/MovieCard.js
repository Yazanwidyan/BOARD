import { LinearGradient } from "expo-linear-gradient";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { formatRuntime } from "../utils/movieFilters";
import { RatingBadge } from "./RatingBadge";

const SWIPE_OUT_DURATION = 260;

// Cards behind the top one are scaled down and lifted upward (negative Y),
// so the front card covers their lower half and only a rounded sliver of
// each peeks out above it — a fanned "deck" look instead of a single faint
// card behind. Each layer steps down by the same fixed amount, so moving
// from the front card to the back of a full 10-card stack reads as one
// smooth, even gradient rather than a big initial jump that tapers off.
const STACK_LIFT_STEP = 18;
const STACK_SCALE_STEP = 0.035;
const STACK_MIN_SCALE = 0.6;
const STACK_TINT_STEP = 0.06;
const STACK_MAX_TINT = 0.55;

const getStackOffset = (index) => {
  if (index === 0) return { scale: 1, lift: 0, tint: 0 };
  return {
    scale: Math.max(STACK_MIN_SCALE, 1 - STACK_SCALE_STEP * index),
    lift: -STACK_LIFT_STEP * index,
    tint: Math.min(STACK_MAX_TINT, index * STACK_TINT_STEP),
  };
};

export const MovieCard = forwardRef(
  (
    {
      movie,
      cardWidth,
      cardHeight,
      index = 0,
      active = false,
      onSwipeLeft,
      onSwipeRight,
      onPress,
      swipeX,
    },
    ref,
  ) => {
    const { width } = useWindowDimensions();
    const swipeThreshold = width * 0.28;
    const stackOffset = getStackOffset(index);
    const isFront = index === 0;

    // The active card can be driven by a shared value owned by the screen
    // (so it can mirror the drag for UI that lives outside the card, like a
    // stamp above the stack) instead of always tracking its own local one.
    const localTranslateX = useSharedValue(0);
    const translateX = swipeX ?? localTranslateX;
    const translateY = useSharedValue(0);
    const stackScale = useSharedValue(stackOffset.scale);
    const stackLift = useSharedValue(stackOffset.lift);
    const [isExiting, setIsExiting] = useState(false);
    const hasExited = useRef(false);

    useEffect(() => {
      stackScale.value = withTiming(stackOffset.scale, { duration: 220 });
      stackLift.value = withTiming(stackOffset.lift, { duration: 220 });
    }, [stackOffset.scale, stackOffset.lift, stackScale, stackLift]);

    const handleSwipeLeft = () => onSwipeLeft?.(movie);
    const handleSwipeRight = () => onSwipeRight?.(movie);

    // Shared by the drag gesture's onEnd and the imperative `triggerSwipe`
    // (used by the on-screen like/dislike buttons), so both paths play the
    // exact same exit animation and completion callback.
    const runExit = useCallback(
      (isRight) => {
        setIsExiting(true);
        const destinationX = (isRight ? 1 : -1) * width * 1.5;
        translateX.value = withTiming(
          destinationX,
          { duration: SWIPE_OUT_DURATION },
          (finished) => {
            "worklet";
            if (finished && !hasExited.current) {
              hasExited.current = true;
              if (isRight) {
                runOnJS(handleSwipeRight)();
              } else {
                runOnJS(handleSwipeLeft)();
              }
            }
          },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
      },
      [width, translateX],
    );

    useImperativeHandle(
      ref,
      () => ({
        triggerSwipe: (direction) => {
          if (!active || isExiting) return;
          runExit(direction === "right");
        },
      }),
      [active, isExiting, runExit],
    );

    const pan = Gesture.Pan()
      .enabled(active && !isExiting)
      .onUpdate((event) => {
        translateX.value = event.translationX;
        translateY.value = event.translationY * 0.35;
      })
      .onEnd((event) => {
        const swipedRight =
          event.translationX > swipeThreshold || event.velocityX > 900;
        const swipedLeft =
          event.translationX < -swipeThreshold || event.velocityX < -900;

        if (swipedRight || swipedLeft) {
          runOnJS(runExit)(swipedRight);
        } else {
          translateX.value = withTiming(0, { duration: 220 });
          translateY.value = withTiming(0, { duration: 220 });
        }
      });

    const tap = Gesture.Tap()
      .enabled(active && !isExiting)
      .maxDistance(10)
      .onEnd(() => {
        if (onPress) {
          runOnJS(onPress)();
        }
      });

    const composedGesture = Gesture.Exclusive(pan, tap);

    const cardStyle = useAnimatedStyle(() => {
      const rotate = interpolate(
        translateX.value,
        [-width, 0, width],
        [-14, 0, 14],
        Extrapolation.CLAMP,
      );
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value + stackLift.value },
          { rotate: `${rotate}deg` },
          { scale: stackScale.value },
        ],
      };
    });

    return (
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.cardWrapper,
            { width: cardWidth, height: cardHeight },
            cardStyle,
          ]}
        >
          <View style={styles.card}>
            <Image
              source={{ uri: movie.poster }}
              style={styles.image}
              resizeMode="cover"
            />

            {/* A shaded left edge fading back into the poster, a thin
              highlight line marking the case's fold, and a soft sheen along
              the top — together read as the front face of a boxed case
              catching light, not a flat sheet. */}
            <LinearGradient
              pointerEvents="none"
              colors={[
                "rgba(0, 0, 0, 0.55)",
                "rgba(0, 0, 0, 0.08)",
                "transparent",
              ]}
              locations={[0, 0.6, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.spine}
            />
            <View pointerEvents="none" style={styles.spineHighlight} />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255, 255, 255, 0.16)", "transparent"]}
              style={styles.topSheen}
            />

            {!isFront && (
              <View
                pointerEvents="none"
                style={[
                  styles.backTint,
                  { backgroundColor: `rgba(2,0,2,${stackOffset.tint})` },
                ]}
              />
            )}

            {isFront && (
              <>
                <LinearGradient
                  colors={[
                    "transparent",
                    "rgba(2,0,2,0.55)",
                    colors.background,
                  ]}
                  locations={[0.4, 0.75, 1]}
                  style={styles.gradient}
                />

                <View style={styles.chips}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      {formatRuntime(movie.runtime)}
                    </Text>
                  </View>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{movie.genres[0]}</Text>
                  </View>
                </View>

                <View style={styles.info}>
                  <Text style={styles.eyebrow} numberOfLines={1}>
                    DIRECTED BY {movie.director.toUpperCase()}
                  </Text>
                  <Text style={styles.title} numberOfLines={2}>
                    {movie.title.toUpperCase()}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{movie.year}</Text>
                    <Text style={styles.dot}>{"·"}</Text>
                    <RatingBadge rating={movie.rating} size="sm" />
                  </View>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    );
  },
);

MovieCard.displayName = "MovieCard";

const styles = StyleSheet.create({
  // Carries the shadow (kept off the clipping `card` view below, since
  // `overflow: hidden` + `elevation` on the same Android view can silently
  // break rendering) so the card visibly lifts off the stack like a box.
  cardWrapper: {
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  spine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 34,
  },
  spineHighlight: {
    position: "absolute",
    left: 22,
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  topSheen: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 60,
  },
  backTint: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  chips: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  chipText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textPrimary,
  },
  info: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  eyebrow: {
    ...typography.label,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  title: {
    ...typography.hero,
    fontSize: 24,
    marginTop: 4,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  metaText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  dot: {
    color: colors.textSecondary,
  },
});

export default MovieCard;

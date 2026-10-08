import { Check, X } from "lucide-react-native";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

const EXIT_DURATION = 280;
const SETTLE_DURATION = 220;
// The card waiting behind the front one: a touch smaller and dimmer, so it
// grows into place when the front card leaves.
const BEHIND_SCALE = 0.94;
const BEHIND_OPACITY = 0.45;

// One movie in Swipe's story mode: a big poster, square corners. Swipe up to
// keep (it flies up and away), down to pass (it drops off the bottom), tap
// for details. "Keep" / "Pass" fade in on the poster as you drag. The screen
// drives the same exits from its buttons through the ref (`trigger`).
//
// Each card owns its movement, and the same card instance moves from
// "behind" to "front" — so nothing flashes or pops between movies.
export const StorySwipeCard = forwardRef(
  ({ movie, width, height, front = false, onKeep, onPass, onPress }, ref) => {
    const translateY = useSharedValue(0);
    const exitOpacity = useSharedValue(1);
    const depth = useSharedValue(front ? 1 : 0); // 0 = behind, 1 = front
    const exiting = useRef(false);
    const threshold = height * 0.22;

    useEffect(() => {
      depth.value = withTiming(front ? 1 : 0, { duration: SETTLE_DURATION });
    }, [front, depth]);

    const finish = useCallback(
      (keep) => {
        if (keep) onKeep?.(movie);
        else onPass?.(movie);
      },
      [movie, onKeep, onPass],
    );

    const exit = useCallback(
      (keep) => {
        if (exiting.current) return;
        exiting.current = true;
        const timing = {
          duration: EXIT_DURATION,
          easing: Easing.in(Easing.quad),
        };
        translateY.value = withTiming((keep ? -1 : 1) * height * 1.3, timing);
        exitOpacity.value = withTiming(0, timing, (finished) => {
          "worklet";
          if (finished) runOnJS(finish)(keep);
        });
      },
      [height, translateY, exitOpacity, finish],
    );

    useImperativeHandle(
      ref,
      () => ({
        trigger: (direction) => {
          if (front) exit(direction === "keep");
        },
      }),
      [front, exit],
    );

    const pan = Gesture.Pan()
      .enabled(front)
      .activeOffsetY([-12, 12])
      .failOffsetX([-24, 24])
      .onUpdate((event) => {
        translateY.value = event.translationY;
      })
      .onEnd((event) => {
        const keep = event.translationY < -threshold || event.velocityY < -900;
        const pass = event.translationY > threshold || event.velocityY > 900;
        if (keep || pass) {
          runOnJS(exit)(keep);
        } else {
          translateY.value = withTiming(0, { duration: SETTLE_DURATION });
        }
      });

    const tap = Gesture.Tap()
      .enabled(front)
      .maxDistance(10)
      .onEnd(() => {
        if (onPress) runOnJS(onPress)();
      });

    const gesture = Gesture.Exclusive(pan, tap);

    const cardStyle = useAnimatedStyle(() => {
      const scale = interpolate(depth.value, [0, 1], [BEHIND_SCALE, 1]);
      const tilt = interpolate(
        translateY.value,
        [-height, 0, height],
        [-3, 0, 3],
        Extrapolation.CLAMP,
      );
      return {
        opacity:
          exitOpacity.value *
          interpolate(depth.value, [0, 1], [BEHIND_OPACITY, 1]),
        transform: [
          { translateY: translateY.value },
          { rotate: `${tilt}deg` },
          { scale },
        ],
      };
    });

    const keepStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateY.value,
        [-threshold, -12],
        [1, 0],
        Extrapolation.CLAMP,
      ),
    }));
    const passStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateY.value,
        [12, threshold],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    }));

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.card, { width, height }, cardStyle]}>
          <MoviePoster uri={movie.poster} style={StyleSheet.absoluteFill} />
          {front && (
            <>
              <Animated.View
                pointerEvents="none"
                style={[styles.label, styles.labelTop, keepStyle]}
              >
                <Check size={18} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.labelText}>{t("Keep")}</Text>
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[styles.label, styles.labelBottom, passStyle]}
              >
                <X size={18} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.labelText}>{t("Pass")}</Text>
              </Animated.View>
            </>
          )}
        </Animated.View>
      </GestureDetector>
    );
  },
);

StorySwipeCard.displayName = "StorySwipeCard";

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    overflow: "hidden",
    backgroundColor: "#202124",
  },
  // A dark bar across the poster with the word — on images, so fixed white.
  label: {
    position: "absolute",
    start: 0,
    end: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm + 2,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  labelTop: {
    top: 0,
  },
  labelBottom: {
    bottom: 0,
  },
  labelText: {
    ...typography.bodyBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
});

export default StorySwipeCard;

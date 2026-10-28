import * as Haptics from "expo-haptics";
import { Check, X } from "lucide-react-native";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

const EXIT_DURATION = 280;
const SETTLE_DURATION = 220;
// The card waiting behind the front one: a touch smaller and dimmer, so it
// grows into place when the front card leaves.
const BEHIND_SCALE = 0.94;
const BEHIND_OPACITY = 0.45;
// The words on the green / red bars.
const INK = "#0C0C0C";

// One movie in Swipe's story mode: a big poster, square corners. Swipe right
// to keep (it flies off to the right), left to pass (off to the left) — the
// same as Home's deck — tap for details. "Keep" (green) / "Pass" (red) fade
// in on the poster as you drag, with a tick the moment the drag is far
// enough to count. The screen drives the same exits from its buttons
// through the ref (`trigger`), and can follow the drag through `drag` (a
// shared value: 0 at rest, 1 at the keep line, -1 at the pass line, beyond
// as it flies off) — Swipe uses it for the green / red glows at the
// screen's sides.
//
// Each card owns its movement, and the same card instance moves from
// "behind" to "front" — so nothing flashes or pops between movies.
export const StorySwipeCard = forwardRef(
  ({ movie, width, height, front = false, onKeep, onPass, onPress, drag }, ref) => {
    const colors = useColors();
    const translateX = useSharedValue(0);
    // True while a finger is on the card (not while it flies off).
    const dragging = useSharedValue(false);
    const exitOpacity = useSharedValue(1);
    const depth = useSharedValue(front ? 1 : 0); // 0 = behind, 1 = front
    const exiting = useRef(false);
    const threshold = width * 0.28;

    useEffect(() => {
      depth.value = withTiming(front ? 1 : 0, { duration: SETTLE_DURATION });
    }, [front, depth]);

    const finish = useCallback(
      (keep) => {
        if (drag) drag.value = withTiming(0, { duration: SETTLE_DURATION });
        if (keep) onKeep?.(movie);
        else onPass?.(movie);
      },
      [movie, onKeep, onPass, drag],
    );

    // The front card's drag, for the screen's glows.
    useAnimatedReaction(
      () => (front ? translateX.value / threshold : null),
      (progress) => {
        if (progress != null && drag) drag.value = progress;
      },
      [front, threshold, drag],
    );
    // A tick when a drag crosses the keep or pass line (either way).
    useAnimatedReaction(
      () => {
        if (!dragging.value) return 0;
        if (translateX.value > threshold) return 1;
        if (translateX.value < -threshold) return -1;
        return 0;
      },
      (side, previous) => {
        if (previous != null && side !== previous && side !== 0) {
          runOnJS(Haptics.selectionAsync)();
        }
      },
      [threshold],
    );

    const exit = useCallback(
      (keep) => {
        if (exiting.current) return;
        exiting.current = true;
        const timing = {
          duration: EXIT_DURATION,
          easing: Easing.in(Easing.quad),
        };
        translateX.value = withTiming((keep ? 1 : -1) * width * 1.5, timing);
        exitOpacity.value = withTiming(0, timing, (finished) => {
          "worklet";
          if (finished) runOnJS(finish)(keep);
        });
      },
      [width, translateX, exitOpacity, finish],
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
      .activeOffsetX([-12, 12])
      .failOffsetY([-24, 24])
      .onBegin(() => {
        dragging.value = true;
      })
      .onUpdate((event) => {
        translateX.value = event.translationX;
      })
      .onFinalize(() => {
        dragging.value = false;
      })
      .onEnd((event) => {
        const keep = event.translationX > threshold || event.velocityX > 900;
        const pass = event.translationX < -threshold || event.velocityX < -900;
        if (keep || pass) {
          runOnJS(exit)(keep);
        } else {
          translateX.value = withTiming(0, { duration: SETTLE_DURATION });
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
        translateX.value,
        [-width, 0, width],
        [-10, 0, 10],
        Extrapolation.CLAMP,
      );
      return {
        opacity:
          exitOpacity.value *
          interpolate(depth.value, [0, 1], [BEHIND_OPACITY, 1]),
        transform: [
          { translateX: translateX.value },
          { rotate: `${tilt}deg` },
          { scale },
        ],
      };
    });

    const keepStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [12, threshold],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    }));
    const passStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [-threshold, -12],
        [1, 0],
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
                style={[styles.label, styles.labelTop, { backgroundColor: `${colors.success}D9` }, keepStyle]}
              >
                <Check size={18} color={INK} strokeWidth={2.6} />
                <Text style={styles.labelText}>{t("Keep")}</Text>
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[styles.label, styles.labelBottom, { backgroundColor: `${colors.danger}D9` }, passStyle]}
              >
                <X size={18} color={INK} strokeWidth={2.6} />
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
    backgroundColor: "#14181C",
  },
  // A bar across the poster with the word — green for keep, red for pass
  // (set where it's drawn); the word and icon a near-black ink on it.
  label: {
    position: "absolute",
    start: 0,
    end: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm + 2,
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
    color: INK,
  },
});

export default StorySwipeCard;

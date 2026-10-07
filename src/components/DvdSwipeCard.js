import { LinearGradient } from "expo-linear-gradient";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
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

const PASS_DURATION = 260;
const KEEP_DURATION = 380;
const HINGE = 14;
const FRAME = 5;

// Cases behind the front one sit a little smaller and higher, so their
// tops peek out above it like a stack pulled off the shelf.
const STACK_LIFT_STEP = 14;
const STACK_SCALE_STEP = 0.04;
const STACK_MIN_SCALE = 0.7;
const STACK_TINT_STEP = 0.08;
const STACK_MAX_TINT = 0.6;

const getStackOffset = (index) => {
  if (index === 0) return { scale: 1, lift: 0, tint: 0 };
  return {
    scale: Math.max(STACK_MIN_SCALE, 1 - STACK_SCALE_STEP * index),
    lift: -STACK_LIFT_STEP * index,
    tint: Math.min(STACK_MAX_TINT, index * STACK_TINT_STEP),
  };
};

// One movie in the Swipe "video store run", as a big DVD case: black case,
// hinge with ridges down the left, the poster as the cover, a gloss across
// it. Drag right to Keep — it drops down into the basket at the bottom of
// the screen (`keepDropY` away) — or left to Pass, sliding back off to the
// shelf. Tap opens the movie. The screen can drive the same exits from its
// buttons through the ref (`triggerSwipe`).
export const DvdSwipeCard = forwardRef(
  (
    {
      movie,
      cardWidth,
      cardHeight,
      index = 0,
      active = false,
      keepDropY = 400,
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

    const localTranslateX = useSharedValue(0);
    const translateX = swipeX ?? localTranslateX;
    const translateY = useSharedValue(0);
    const exitScale = useSharedValue(1);
    const exitOpacity = useSharedValue(1);
    const stackScale = useSharedValue(stackOffset.scale);
    const stackLift = useSharedValue(stackOffset.lift);
    const [isExiting, setIsExiting] = useState(false);
    const hasExited = useRef(false);

    useEffect(() => {
      stackScale.value = withTiming(stackOffset.scale, { duration: 220 });
      stackLift.value = withTiming(stackOffset.lift, { duration: 220 });
    }, [stackOffset.scale, stackOffset.lift, stackScale, stackLift]);

    const finish = useCallback(
      (isKeep) => {
        if (hasExited.current) return;
        hasExited.current = true;
        if (isKeep) onSwipeRight?.(movie);
        else onSwipeLeft?.(movie);
      },
      [movie, onSwipeLeft, onSwipeRight],
    );

    const runExit = useCallback(
      (isKeep) => {
        setIsExiting(true);
        if (isKeep) {
          // Into the basket: back to centre, down, shrinking away.
          const timing = {
            duration: KEEP_DURATION,
            easing: Easing.in(Easing.quad),
          };
          translateX.value = withTiming(0, timing);
          translateY.value = withTiming(keepDropY, timing);
          exitScale.value = withTiming(0.18, timing);
          exitOpacity.value = withTiming(0, timing, (finished) => {
            "worklet";
            if (finished) runOnJS(finish)(true);
          });
        } else {
          // Back to the shelf: off to the left.
          translateX.value = withTiming(
            -width * 1.5,
            { duration: PASS_DURATION },
            (finished) => {
              "worklet";
              if (finished) runOnJS(finish)(false);
            },
          );
        }
      },
      [
        width,
        keepDropY,
        translateX,
        translateY,
        exitScale,
        exitOpacity,
        finish,
      ],
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
        translateY.value = event.translationY * 0.3;
      })
      .onEnd((event) => {
        const keep =
          event.translationX > swipeThreshold || event.velocityX > 900;
        const pass =
          event.translationX < -swipeThreshold || event.velocityX < -900;
        if (keep || pass) {
          runOnJS(runExit)(keep);
        } else {
          translateX.value = withTiming(0, { duration: 220 });
          translateY.value = withTiming(0, { duration: 220 });
        }
      });

    const tap = Gesture.Tap()
      .enabled(active && !isExiting)
      .maxDistance(10)
      .onEnd(() => {
        if (onPress) runOnJS(onPress)();
      });

    const gesture = Gesture.Exclusive(pan, tap);

    const cardStyle = useAnimatedStyle(() => {
      const rotate = interpolate(
        translateX.value,
        [-width, 0, width],
        [-12, 0, 12],
        Extrapolation.CLAMP,
      );
      return {
        opacity: exitOpacity.value,
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value + stackLift.value },
          { rotate: `${rotate}deg` },
          { scale: stackScale.value * exitScale.value },
        ],
      };
    });

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.wrapper,
            { width: cardWidth, height: cardHeight },
            cardStyle,
          ]}
        >
          <View style={styles.case}>
            {/* Hinge with two ridges */}
            <View style={styles.hinge}>
              <View style={styles.ridge} />
              <View style={styles.ridge} />
            </View>
            <View style={styles.cover}>
              <Image
                source={{ uri: movie.poster }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>
            {/* Gloss across the plastic */}
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.65, y: 0.5 }}
              style={styles.gloss}
            />
            {index > 0 && (
              <View
                pointerEvents="none"
                style={[
                  styles.tint,
                  { backgroundColor: `rgba(2, 0, 2, ${stackOffset.tint})` },
                ]}
              />
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    );
  },
);

DvdSwipeCard.displayName = "DvdSwipeCard";

const styles = StyleSheet.create({
  // Shadow lives on the wrapper; the case below clips.
  wrapper: {
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  case: {
    flex: 1,
    flexDirection: "row",
    padding: FRAME,
    paddingLeft: 0,
    borderRadius: 6,
    backgroundColor: "#0D0D12",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  hinge: {
    width: HINGE,
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingVertical: 8,
  },
  ridge: {
    width: 1.5,
    height: "100%",
    borderRadius: 1,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  cover: {
    flex: 1,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  gloss: {
    ...StyleSheet.absoluteFillObject,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default DvdSwipeCard;

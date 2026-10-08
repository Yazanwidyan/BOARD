import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// How far you pull (px past the top) for the title to fill completely —
// about where iOS's pull-to-refresh fires.
const PULL_FULL = 100;
// Pulling ticks like a ratchet: one light tick per step on the way down
// (not on the way back up), then a firmer tap at the full pull.
const PULL_STEPS = 6;
const FILL_MS = 220; // the quick fill when you let go
const SETTLE_MS = 260;
const DIM_OPACITY = 0.28;
const SPIN_MS = 900; // one turn of the logo while refreshing
// How long the logo takes to ease to a stop once a refresh ends — exported
// so a screen can wait for the spin to finish before showing new content.
export const SPIN_STOP_MS = 600;

// Pull-to-refresh, Threads-style: the header title is the indicator.
//
//   resting     the title as normal
//   pulling     it unfills right to left in step with your pull — fully
//               dim when the pull is far enough to refresh; a light tick
//               per step as you pull, a firmer tap at the full pull
//   let go      it fills straight back up, left to right, in a blink — the
//               logo spinning (useRefreshSpin) is the loading indicator
//
// The title is drawn twice: a dim copy underneath (measured for its width),
// and a bright copy on top, clipped to the lit segment [start, end] (0–1 of
// that width). It always runs left to right, in every language.
// Pulling past the top only happens on iOS; Android shows the loop while
// it refreshes.
export const RefreshFillTitle = ({ scrollY, refreshing, children }) => {
  const width = useSharedValue(0);
  const start = useSharedValue(0);
  const end = useSharedValue(1);
  const isRefreshing = useSharedValue(refreshing);
  const wasFull = useSharedValue(false);
  // After a refresh the page springs back up from where it was held; that
  // isn't a pull, so the title ignores it until the page is back at the top.
  const settling = useSharedValue(false);
  const wasRefreshing = useRef(refreshing);

  const lastStep = useSharedValue(0);
  const stepTick = () => Haptics.selectionAsync();
  const fullTap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  // The pull drives the fill (unless a refresh loop owns it).
  useAnimatedReaction(
    () => (scrollY ? Math.max(0, -scrollY.value) : 0),
    (pull, previous) => {
      if (isRefreshing.value) return;
      if (settling.value) {
        if (pull === 0) settling.value = false;
        return;
      }
      if (pull > 0) {
        const progress = Math.min(1, pull / PULL_FULL);
        // The lit part shrinks from the right: [0, 1 - progress].
        start.value = 0;
        end.value = 1 - progress;
        if (progress >= 1 && !wasFull.value) {
          wasFull.value = true;
          lastStep.value = PULL_STEPS;
          runOnJS(fullTap)();
        } else if (progress < 1) {
          wasFull.value = false;
          const step = Math.floor(progress * PULL_STEPS);
          if (step > lastStep.value) runOnJS(stepTick)();
          lastStep.value = step;
        }
      } else if (previous != null && previous > 0) {
        // Let go without refreshing: light back up smoothly, no flash.
        wasFull.value = false;
        lastStep.value = 0;
        start.value = withTiming(0, { duration: SETTLE_MS });
        end.value = withTiming(1, { duration: SETTLE_MS });
      }
    },
    [scrollY],
  );

  // Let go and it refreshes: fill straight back up, left to right.
  useEffect(() => {
    isRefreshing.value = refreshing;
    // Only when a refresh has just ended — not on first render.
    if (wasRefreshing.current && !refreshing) settling.value = true;
    wasRefreshing.current = refreshing;
    if (refreshing) {
      wasFull.value = false;
      lastStep.value = 0;
      start.value = 0;
      end.value = withTiming(1, {
        duration: FILL_MS,
        easing: Easing.out(Easing.cubic),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  // The lit window, and the bright copy shifted back inside it so the two
  // copies line up exactly.
  // Physical left, so the sweep goes left → right whatever the layout
  // direction.
  const windowStyle = useAnimatedStyle(() => ({
    left: start.value * width.value,
    width: Math.max(0, (end.value - start.value) * width.value),
  }));
  const brightStyle = useAnimatedStyle(() => ({
    left: -start.value * width.value,
    width: width.value,
  }));

  return (
    <View style={styles.wrap}>
      <View
        style={styles.dim}
        onLayout={(event) => {
          width.value = event.nativeEvent.layout.width;
        }}
      >
        {children}
      </View>
      <Animated.View
        pointerEvents="none"
        style={[styles.window, windowStyle]}
      >
        <Animated.View style={[styles.bright, brightStyle]}>
          {children}
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Sized to the title itself, not the space around it — the fill runs
  // across the letters, not across empty header.
  wrap: {
    alignSelf: "flex-start",
  },
  // A little room at the end, so an italic title's last letter (which
  // leans past its box) isn't clipped in the bright copy.
  dim: {
    opacity: DIM_OPACITY,
    paddingEnd: 4,
  },
  window: {
    position: "absolute",
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  bright: {
    position: "absolute",
    top: 0,
    bottom: 0,
    paddingEnd: 4,
  },
});

// The logo's spin while refreshing — a reel turning. Returns one rotation
// (degrees) that both copies of the title read, so they turn in sync. When
// the refresh ends it doesn't snap: it eases on round to the next full turn
// and stops upright.
export const useRefreshSpin = (refreshing) => {
  const rotation = useSharedValue(0);
  useEffect(() => {
    if (refreshing) {
      rotation.value = withRepeat(
        withTiming(rotation.value + 360, {
          duration: SPIN_MS,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
      return;
    }
    cancelAnimation(rotation);
    const next = Math.ceil(rotation.value / 360) * 360;
    if (next === rotation.value) return;
    rotation.value = withTiming(
      next,
      { duration: SPIN_STOP_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) rotation.value = 0;
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);
  return rotation;
};

// Wraps the logo so it turns with useRefreshSpin's rotation.
export const SpinningLogo = ({ rotation, children }) => {
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
};

export default RefreshFillTitle;

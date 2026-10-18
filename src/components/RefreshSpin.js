import { useEffect } from "react";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// Pull-to-refresh in a header with the ReelBoard logo: the logo turns like
// a reel while refreshing — that's the whole indicator (the title stays as
// it is).
const SPIN_MS = 900; // one turn of the logo while refreshing
// How long the logo takes to ease to a stop once a refresh ends — exported
// so a screen can wait for the spin to finish before showing new content.
export const SPIN_STOP_MS = 600;

// The logo's rotation (degrees). When the refresh ends it doesn't snap: it
// eases on round to the next full turn and stops upright.
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

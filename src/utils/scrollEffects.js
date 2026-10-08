import {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

// Scroll-driven effects shared by the screens with a hero at the top.
// Each takes the screen's scrollY (a shared value fed by its
// useAnimatedScrollHandler) and returns an animated style.

// How much slower than the page a backdrop moves while scrolling up.
const PARALLAX = 0.45;

// A backdrop at the very top of a scroll view: pull past the top and it
// stretches with you, its top edge pinned to the screen (scaled about its
// centre, then shifted up by half the growth — together they keep the top
// edge exactly at the screen's top); scroll up and it drifts behind the
// page at under half speed and dims a little. Pulling only goes past the
// top on iOS (the bounce); Android gets the parallax.
export const useStretchyBackdropStyle = (scrollY, height) =>
  useAnimatedStyle(() => {
    const y = scrollY.value;
    if (!height) return {};
    if (y < 0) {
      return {
        opacity: 1,
        transform: [{ translateY: y / 2 }, { scale: 1 + -y / height }],
      };
    }
    return {
      opacity: interpolate(y, [0, height], [1, 0.5], Extrapolation.CLAMP),
      transform: [{ translateY: y * PARALLAX }, { scale: 1 }],
    };
  }, [height]);

// The hero's foreground (a poster, a title block): as it scrolls away it
// lags a little, fades, and (unless `scale: false`, for left-aligned text
// that would visibly shift) shrinks a touch — going back under the bar.
export const useHeroFadeStyle = (scrollY, distance, { scale = true } = {}) =>
  useAnimatedStyle(() => {
    const y = Math.max(scrollY.value, 0);
    if (!distance) return {};
    return {
      opacity: interpolate(y, [0, distance], [1, 0.25], Extrapolation.CLAMP),
      transform: [
        {
          scale: scale
            ? interpolate(y, [0, distance], [1, 0.92], Extrapolation.CLAMP)
            : 1,
        },
        { translateY: y * 0.18 },
      ],
    };
  }, [distance, scale]);

// Pins a bar that lives inside the scroll content (a tab row, a filter
// row) once it reaches `stickTop` on screen. `contentY` is the bar's
// measured offset within the scroll content; `headerOffset` (optional) is
// how far a hide-on-scroll header has slid up, so the bar follows it.
export const useStickyStyle = ({
  scrollY,
  contentY,
  stickTop,
  headerOffset,
}) =>
  useAnimatedStyle(() => {
    if (contentY == null) return {};
    const top = stickTop - (headerOffset ? headerOffset.value : 0);
    const onScreen = contentY - scrollY.value;
    return {
      transform: [{ translateY: Math.max(0, top - onScreen) }],
    };
  }, [contentY, stickTop]);

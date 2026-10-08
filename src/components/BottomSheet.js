import { X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "./AppText";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { useLayoutDirection } from "../i18n";

// Plain eased timing, no springs — the sheet glides into place without
// overshooting.
const OPEN_TIMING = { duration: 280, easing: Easing.out(Easing.cubic) };
const SNAP_BACK_TIMING = { duration: 180, easing: Easing.out(Easing.cubic) };
const CLOSE_DURATION = 220;
const DISMISS_FRACTION = 0.25;
const DISMISS_VELOCITY = 900;
const MAX_AUTO_FRACTION = 0.9;

// The app's one bottom sheet (Reanimated + Gesture Handler).
//
// - size: "auto" fits its content (up to 90% of the screen) — for short
//   things like a genre picker; "half" / "full" give a fixed height for
//   sheets whose content is a scrolling list (anything with flex: 1 inside
//   needs one of these, since "auto" has no height to fill).
// - title / subtitle render the shared header (with a close button); the
//   whole header is the drag handle, not just the grabber.
// - footer is pinned under the content, above the home indicator — for a
//   sheet's main action ("Apply", "Done").
//
// Slides in on an eased timing; the backdrop's opacity follows the sheet's position,
// so dragging it down fades the backdrop with it instead of the backdrop
// popping in/out on its own.
export const BottomSheet = ({
  visible,
  onClose,
  children,
  title,
  subtitle,
  footer,
  size = "full",
}) => {
  const colors = useColors();
  const direction = useLayoutDirection();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // "full" isn't a computed number: the overlay reserves the safe area at
  // the top (paddingTop below) and a full sheet just fills what's left. A
  // computed height (window height − inset) could exceed the real space —
  // e.g. once the keyboard opens — and push the sheet's top up behind the
  // status bar.
  const isFixed = size === "full" || size === "half";
  const sizeStyle =
    size === "full"
      ? { flex: 1 }
      : size === "half"
        ? { height: Math.round(windowHeight * 0.55) }
        : { maxHeight: windowHeight * MAX_AUTO_FRACTION };

  const [isMounted, setIsMounted] = useState(visible);
  // Starts off-screen by a full window height, so it works before the
  // sheet's real (auto) height has been measured.
  const translateY = useSharedValue(windowHeight);
  const sheetHeight = useSharedValue(windowHeight);

  // Whether the sheet should still be up, read when a close finishes.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const unmountIfClosed = () => {
    if (!visibleRef.current) setIsMounted(false);
  };

  // The Modal is unmounted when the close ends, even if the animation was
  // cut short (a drag, a quick reopen/close, the system share sheet…). It
  // used to wait for `finished` — an interrupted close then left an
  // invisible full-screen Modal behind that swallowed every touch and
  // froze the app. Reopening in the meantime keeps it (visibleRef).
  const close = () => {
    translateY.value = withTiming(
      sheetHeight.value + insets.bottom,
      { duration: CLOSE_DURATION },
      () => {
        runOnJS(unmountIfClosed)();
      },
    );
  };

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      translateY.value = withTiming(0, OPEN_TIMING);
      return undefined;
    }
    if (!isMounted) return undefined;
    close();
    // Backstop in case the animation callback never runs at all.
    const timer = setTimeout(unmountIfClosed, CLOSE_DURATION + 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // No dragging while it's closing — that's what used to interrupt the
  // close animation.
  const pan = Gesture.Pan()
    .enabled(!!visible)
    .onUpdate((event) => {
      // A little resistance when pulled up past fully-open.
      translateY.value =
        event.translationY >= 0 ? event.translationY : event.translationY / 6;
    })
    .onEnd((event) => {
      if (
        event.translationY > sheetHeight.value * DISMISS_FRACTION ||
        event.velocityY > DISMISS_VELOCITY
      ) {
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, SNAP_BACK_TIMING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, sheetHeight.value],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  if (!isMounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Modals are their own layer: carry the language's direction. */}
      <View style={{ flex: 1, direction }}>
        {/* Padding on both platforms: with Android's edge-to-edge window
          (Expo's default) the keyboard no longer resizes the app, so the
          sheet has to make room itself there too. */}
        <KeyboardAvoidingView
          style={[styles.overlay, { paddingTop: insets.top + spacing.sm }]}
          behavior="padding"
        >
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>

          <Animated.View
            onLayout={(event) => {
              sheetHeight.value = event.nativeEvent.layout.height;
            }}
            style={[styles.sheet, sizeStyle, sheetStyle]}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.header}>
                <View style={styles.grabber} />
                {title ? (
                  <View style={styles.titleRow}>
                    <View style={styles.titleText}>
                      <Text style={styles.title} numberOfLines={1}>
                        {title}
                      </Text>
                      {!!subtitle && (
                        <Text style={styles.subtitle} numberOfLines={2}>
                          {subtitle}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      style={styles.closeButton}
                      onPress={onClose}
                      hitSlop={8}
                    >
                      <X size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </GestureDetector>

            <View style={[styles.content, isFixed && styles.contentFill]}>
              {children}
            </View>

            {footer ? (
              <View
                style={[
                  styles.footer,
                  { paddingBottom: insets.bottom + spacing.sm },
                ]}
              >
                {footer}
              </View>
            ) : (
              !isFixed && <View style={{ height: insets.bottom }} />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      backgroundColor: "rgba(2, 0, 2, 0.6)",
    },
    // flexShrink lets a fixed-height ("full" / "half") sheet give up height
    // to the keyboard: the KeyboardAvoidingView pads the bottom by the
    // keyboard's height, and without this the sheet kept its full height
    // and was pushed up off the top of the screen instead of shrinking.
    sheet: {
      flexShrink: 1,
      minHeight: 0,
      backgroundColor: colors.cardElevated,
      borderTopStartRadius: 0,
      borderTopEndRadius: 0,
      borderTopWidth: 1,
      borderStartWidth: 1,
      borderEndWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    header: {
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
    },
    grabber: {
      alignSelf: "center",
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.cardElevatedLight,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    titleText: {
      flex: 1,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSoft,
    },
    content: {
      paddingTop: spacing.md,
      paddingHorizontal: spacing.md,
    },
    contentFill: {
      flex: 1,
    },
    footer: {
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.cardElevated,
    },
  });

export default BottomSheet;

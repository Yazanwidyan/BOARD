import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const OPEN_SPRING = { damping: 24, stiffness: 240, mass: 0.9 };
const SNAP_BACK_SPRING = { damping: 22, stiffness: 300 };
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
// Opens on a spring; the backdrop's opacity follows the sheet's position,
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
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const fullHeight = windowHeight - insets.top - spacing.sm;
  const fixedHeight =
    size === "full"
      ? fullHeight
      : size === "half"
        ? Math.round(windowHeight * 0.55)
        : undefined;

  const [isMounted, setIsMounted] = useState(visible);
  // Starts off-screen by a full window height, so it works before the
  // sheet's real (auto) height has been measured.
  const translateY = useSharedValue(windowHeight);
  const sheetHeight = useSharedValue(fixedHeight ?? windowHeight);

  const close = () => {
    translateY.value = withTiming(
      sheetHeight.value + insets.bottom,
      { duration: CLOSE_DURATION },
      (finished) => {
        if (finished) runOnJS(setIsMounted)(false);
      },
    );
  };

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      translateY.value = withSpring(0, OPEN_SPRING);
    } else if (isMounted) {
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = Gesture.Pan()
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
        translateY.value = withSpring(0, SNAP_BACK_SPRING);
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
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          style={[
            styles.sheet,
            fixedHeight
              ? { height: fixedHeight }
              : { maxHeight: windowHeight * MAX_AUTO_FRACTION },
            sheetStyle,
          ]}
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

          <View style={[styles.content, fixedHeight && styles.contentFill]}>
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
            !fixedHeight && <View style={{ height: insets.bottom }} />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
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
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.08)",
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
      backgroundColor: "rgba(255, 255, 255, 0.18)",
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

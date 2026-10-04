import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

export const HEADER_BAR_HEIGHT = 52;

// How far the large title scrolls before the compact bar is fully in —
// roughly the large title's own height.
const COLLAPSE_START = 24;
const COLLAPSE_END = 64;

// "Live headers", shared by every tab: a large left-aligned title (with an
// optional eyebrow above and a live status line below) that scrolls away
// with the content, and a fixed compact bar (always opaque) that fades in
// a card-colored surface, divider and centered title as it does. The bar's actions are visible in both
// states. Usage:
//
//   const { scrollY, onScroll } = useCollapsingHeader();
//   <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}
//     contentContainerStyle={{ paddingTop: useHeaderInset() }}>
//     <LargeTitle title="Library" subtitle="48 watched" />
//     ...
//   </Animated.ScrollView>
//   <HeaderBar title="Library" scrollY={scrollY} right={...} />
export const useCollapsingHeader = () => {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  return { scrollY, onScroll };
};

// Top padding a screen's scroll content needs so the large title starts
// just below the (initially transparent) bar.
export const useHeaderInset = () => {
  const insets = useSafeAreaInsets();
  return insets.top + HEADER_BAR_HEIGHT;
};

export const LargeTitle = ({ eyebrow, title, subtitle, style }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={[styles.largeTitle, style]}>
      {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

// The round icon button every tab's header actions use.
export const HeaderIconButton = ({ onPress, children, style }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <Pressable style={[styles.iconButton, style]} onPress={onPress} hitSlop={6}>
      {children}
    </Pressable>
  );
};

export const HeaderBar = ({ title, scrollY, left, right }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  const surfaceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [COLLAPSE_START, COLLAPSE_END],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [COLLAPSE_START + 16, COLLAPSE_END],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [COLLAPSE_START, COLLAPSE_END],
          [6, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.bar,
        { paddingTop: insets.top, height: insets.top + HEADER_BAR_HEIGHT },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.barSurface, surfaceStyle]}
      />
      <View style={styles.side} pointerEvents="box-none">
        {left}
      </View>
      <Animated.Text
        style={[styles.barTitle, titleStyle]}
        numberOfLines={1}
        pointerEvents="none"
      >
        {title}
      </Animated.Text>
      <View style={[styles.side, styles.sideRight]} pointerEvents="box-none">
        {right}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    largeTitle: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    eyebrow: {
      ...typography.label,
      color: colors.accentLight,
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    // Android draws any view with `elevation` above siblings that have
    // none, regardless of render order — so cards with elevation (the
    // Showtime poster glow, the rank gem glow, poster shadows) were
    // painting over this bar as they scrolled under it. A higher elevation
    // (with its shadow color cleared, so it adds no visible shadow) keeps
    // the bar on top; zIndex does the same on iOS.
    bar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      elevation: 100,
      shadowColor: "transparent",
      // Painted on the bar itself (not a separate absolutely positioned
      // child) so it's always there under the actions and title.
      backgroundColor: colors.background,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
    },
    // The bar's own background is the page color (so at rest the large
    // title still reads as sitting on the plain background, and content
    // never shows through once it slides under); this card-colored surface
    // + divider fades in on top on scroll so the collapsed bar reads as a
    // distinct header.
    barSurface: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    // Both sides share a fixed minimum width so the title stays truly
    // centered whether one side has two buttons and the other has none.
    side: {
      minWidth: 88,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    sideRight: {
      justifyContent: "flex-end",
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    barTitle: {
      ...typography.subtitle,
      flex: 1,
      textAlign: "center",
      color: colors.textPrimary,
    },
  });

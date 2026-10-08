import { ChevronDown, X } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { BackButton } from "./BackButton";
import { t } from "../i18n";

export const HEADER_BAR_HEIGHT = 52;
// The hairline under a header fades in over this much scroll — at the very
// top the bar melts into the page; once anything goes under it, it's a bar.
const BORDER_FADE_DISTANCE = 16;
const SNAP_DURATION = 200;

// Every tab's header: a fixed-height bar in the page colour, the title on
// the left and actions on the right. Anything more than a title (a live
// status line, a search field, tab chips) lives at the top of the page
// instead, in <PageIntro>.
//
// With `hideOnScroll` the bar slides up out of the way as you scroll down
// and comes straight back the moment you scroll up. Only its row moves; a
// status-bar-tall strip stays put so nothing scrolls under the clock.
// Bars hanging off the header (Library's chips) follow it with
// `header.followStyle`; bars inside the content pin under it with
// useStickyStyle(…, headerOffset: header.offset).
//
// Usage:
//   const header = useDockHeader({ hideOnScroll: true });
//   <Animated.ScrollView onScroll={header.onScroll} scrollEventThrottle={16}
//     contentContainerStyle={{ paddingTop: header.contentInset }}>
//     <PageIntro subtitle="…">{controls}</PageIntro>
//   …
//   <DockHeader {...header.props} title="Library" right={…} />
export const useDockHeader = ({ hideOnScroll = false } = {}) => {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  // 0 = fully shown … HEADER_BAR_HEIGHT = slid away.
  const offset = useSharedValue(0);
  const lastY = useSharedValue(0);

  // When the scroll stops, settle a half-hidden bar one way or the other —
  // and always show it near the top, where there's nothing to make room for.
  const settle = (y) => {
    "worklet";
    if (!hideOnScroll) return;
    const hide = y > HEADER_BAR_HEIGHT && offset.value > HEADER_BAR_HEIGHT / 2;
    offset.value = withTiming(hide ? HEADER_BAR_HEIGHT : 0, {
      duration: SNAP_DURATION,
    });
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const delta = y - lastY.value;
      lastY.value = y;
      scrollY.value = y;
      if (!hideOnScroll) return;
      // Ignore the bounce past either end (iOS), so it can't flicker.
      const maxY = event.contentSize.height - event.layoutMeasurement.height;
      if (y <= 0) {
        offset.value = 0;
      } else if (y < maxY) {
        offset.value = Math.min(
          Math.max(offset.value + delta, 0),
          HEADER_BAR_HEIGHT,
        );
      }
    },
    onEndDrag: (event) => settle(event.contentOffset.y),
    onMomentumEnd: (event) => settle(event.contentOffset.y),
  });

  const followStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -offset.value }],
  }));

  return {
    scrollY,
    offset,
    onScroll,
    followStyle,
    contentInset: insets.top + HEADER_BAR_HEIGHT + spacing.md,
    // Where the header bar ends. Screens with pull-to-refresh start their
    // scroll view here (not under the bar), so the refresh spinner shows
    // just below the header instead of hidden behind it.
    barBottom: insets.top + HEADER_BAR_HEIGHT,
    props: { scrollY, offset },
  };
};

// For pushed pages with a <StackHeader>: the scroll position, handed to
// the header (`scrollY`) so its hairline fades in once you scroll.
export const useStackHeaderScroll = () => {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  return { scrollY, onScroll };
};

// The hairline under a header: always on without a scroll position, else
// faded in as the page starts to scroll.
const HeaderHairline = ({ scrollY, styles }) => {
  const style = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(
          scrollY.value,
          [0, BORDER_FADE_DISTANCE],
          [0, 1],
          Extrapolation.CLAMP,
        )
      : 1,
  }));
  return <Animated.View pointerEvents="none" style={[styles.hairline, style]} />;
};

// The round icon button every tab's header actions use.
export const HeaderIconButton = ({
  onPress,
  children,
  style,
  accessibilityLabel,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <Pressable
      style={[styles.iconButton, style]}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Pressable>
  );
};

// Title (with an optional small `eyebrow` line above it, e.g. Home's
// greeting) on the left, actions on the right — no centered title.
// `onPressTitle` turns the title into a switcher (with a ▾), and
// `subtitle` adds a small line under it — Library uses both.
// `scrollY` / `offset` come in through useDockHeader's props.
export const DockHeader = ({
  title,
  logo,
  italicTitle = false,
  eyebrow,
  subtitle,
  onPressTitle,
  right,
  scrollY,
  offset,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset ? -offset.value : 0 }],
  }));
  // The row fades as it slides, so it's gone before it reaches the clock.
  const rowStyle = useAnimatedStyle(() => ({
    opacity: offset
      ? interpolate(
          offset.value,
          [0, HEADER_BAR_HEIGHT * 0.6],
          [1, 0],
          Extrapolation.CLAMP,
        )
      : 1,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { paddingTop: insets.top, height: insets.top + HEADER_BAR_HEIGHT },
        barStyle,
      ]}
    >
      <Animated.View style={[styles.barRow, rowStyle]}>
        <View style={styles.leftTitleBlock}>
          {!!eyebrow && (
            <Text style={styles.leftEyebrow} numberOfLines={1}>
              {eyebrow}
            </Text>
          )}
          {onPressTitle ? (
            <Pressable
              onPress={onPressTitle}
              hitSlop={8}
              style={styles.titleButton}
              accessibilityRole="button"
              accessibilityLabel={t("{title}, switch section", {
                title: title,
              })}
            >
              <Text
                style={[styles.title, subtitle && styles.titleWithSubtitle]}
                numberOfLines={1}
              >
                {title}
              </Text>
              <ChevronDown
                size={18}
                color={colors.textSecondary}
                strokeWidth={2.4}
              />
            </Pressable>
          ) : (
            <View style={styles.titleRow}>
              {logo}
              <Text
                style={[
                  eyebrow ? styles.leftTitle : styles.title,
                  subtitle && styles.titleWithSubtitle,
                  styles.titleShrink,
                  italicTitle && styles.titleItalic,
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>
          )}
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </Animated.View>
      <HeaderHairline scrollY={scrollY} styles={styles} />
    </Animated.View>
  );
};

// The header for pages pushed on top of the tabs (Settings, Badges, Spin,
// the challenge generator…): the same bar, left title and right actions as
// the tab headers, plus a leading back button — or a ✕ for modal-style
// flows (`close`). It sits in normal layout flow, not absolute.
//
// Pass `scrollY` (from useStackHeaderScroll) and the hairline fades in as
// the page scrolls. `titleRevealAt` hides the title until the page has
// scrolled that far — for pages with their own big title at the top, so
// the bar picks the title up as that one scrolls away.
export const StackHeader = ({
  title,
  onBack,
  close = false,
  right,
  scrollY,
  titleRevealAt,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  const titleStyle = useAnimatedStyle(() => {
    if (!scrollY || titleRevealAt == null) return {};
    const progress = interpolate(
      scrollY.value,
      [titleRevealAt - 24, titleRevealAt],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * 8 }],
    };
  }, [titleRevealAt]);

  return (
    <View style={[styles.stackBar, { paddingTop: insets.top + spacing.sm }]}>
      {/* Equal-width sides keep the title centred on the screen. */}
      <View style={styles.stackSide}>
        {close ? (
          <HeaderIconButton onPress={onBack}>
            <X size={22} strokeWidth={1.75} color={colors.textPrimary} />
          </HeaderIconButton>
        ) : (
          <BackButton onPress={onBack} />
        )}
      </View>
      <Animated.View style={[styles.stackTitleWrap, titleStyle]}>
        <Text style={styles.stackTitle} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>
      <View style={[styles.stackSide, styles.stackSideRight]}>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      <HeaderHairline scrollY={scrollY} styles={styles} />
    </View>
  );
};

// The top of a tab's page: optional eyebrow, a large title (Home only), the
// live status line, and any controls (passed as children).
export const PageIntro = ({ eyebrow, title, subtitle, children }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.intro}>
      {!!eyebrow && <Text style={styles.introEyebrow}>{eyebrow}</Text>}
      {!!title && <Text style={styles.introTitle}>{title}</Text>}
      {!!subtitle && <Text style={styles.introSubtitle}>{subtitle}</Text>}
      {children ? (
        <View style={(eyebrow || title || subtitle) && styles.introControls}>
          {children}
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Above the scroll content on both platforms: zIndex for iOS, and on
    // Android an elevation higher than any card's, since Android draws
    // elevated views above non-elevated siblings regardless of order.
    bar: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      zIndex: 100,
      elevation: 16,
      // Instagram-style: the page's own colour, a hairline underneath.
      backgroundColor: colors.background,
    },
    barRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
    },
    hairline: {
      position: "absolute",
      start: 0,
      end: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    title: {
      ...typography.display,
      fontSize: 24,
      lineHeight: 30,
      letterSpacing: -0.6,
      color: colors.textPrimary,
    },
    stackBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: colors.background,
      zIndex: 10,
    },
    stackSide: {
      width: 64,
      flexDirection: "row",
      alignItems: "center",
    },
    stackSideRight: {
      justifyContent: "flex-end",
    },
    stackTitleWrap: {
      flex: 1,
    },
    stackTitle: {
      ...typography.title,
      fontSize: 18,
      letterSpacing: -0.3,
      textAlign: "center",
      color: colors.textPrimary,
    },
    titleButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
    },
    titleWithSubtitle: {
      fontSize: 19,
      lineHeight: 23,
    },
    subtitle: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 15,
      color: colors.textMuted,
    },
    // Title with an optional logo in front (Home's ReelBoard mark).
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    titleShrink: {
      flexShrink: 1,
    },
    // Sora has no italic face, so the slant is a skew — same on iOS and
    // Android.
    titleItalic: {
      transform: [{ skewX: "-6deg" }],
    },
    leftTitleBlock: {
      flex: 1,
      marginEnd: spacing.sm,
    },
    leftEyebrow: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    leftTitle: {
      ...typography.subtitle,
      fontSize: 17,
      color: colors.textPrimary,
      marginTop: 1,
    },
    // Plain icons, no circle behind them.
    iconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    intro: {
      paddingHorizontal: spacing.md,
    },
    introEyebrow: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    introTitle: {
      ...typography.display,
      color: colors.textPrimary,
    },
    introSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    introControls: {
      marginTop: spacing.md,
    },
  });

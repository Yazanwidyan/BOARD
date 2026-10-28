import { createContext, useContext } from "react";
import { ChevronDown, X } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";
import { Wordmark } from "./Wordmark";
import { BackButton } from "./BackButton";
import { SpinningLogo, useRefreshSpin } from "./RefreshSpin";

export const HEADER_BAR_HEIGHT = 40;
// The wordmark's size in Home's header.
const WORDMARK_SIZE = 28;
// A centred title keeps this clear on each side, for the buttons there.
const TITLE_SIDE_ROOM = 92;
// An `overlay` header (over Home's backdrop) turns solid over this much
// scroll.
const OVERLAY_FADE_DISTANCE = 90;
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
// the header (`scrollY`) for `titleRevealAt`.
export const useStackHeaderScroll = () => {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  return { scrollY, onScroll };
};

// An overlay header's background: none at the top of the page — the
// backdrop under it shows — fading in to the page colour as you scroll.
const OverlayFill = ({ scrollY, styles }) => {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY?.value ?? 0,
      [0, OVERLAY_FADE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.overlayFill, style]} />
  );
};

// Inner pages' headers (StackHeader) draw their buttons round and filled,
// like Movie details'; tab headers keep them flat.
const RoundHeaderButtons = createContext(false);

// The icon button every header's actions use. `badge`: a count for a red
// dot on its corner (nothing when 0; "9+" past 9). `round`: a filled
// circle, as on inner pages — on by default inside a StackHeader.
export const HeaderIconButton = ({
  onPress,
  children,
  style,
  accessibilityLabel,
  badge = 0,
  round,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const inInnerHeader = useContext(RoundHeaderButtons);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.iconButton,
        (round ?? inInnerHeader) && styles.iconButtonRound,
        pressed && styles.iconButtonPressed,
        style,
      ]}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
      {badge > 0 && (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{badge > 9 ? "9+" : `${badge}`}</Text>
        </View>
      )}
    </Pressable>
  );
};

// Title (with an optional small `eyebrow` line above it, e.g. Home's
// greeting) centred, every action on the right — `left`'s, then
// `right`'s. `back`: a back button, on the left. `wordmark`:
// the title is the app's name — set in its own face (Home).
// `onPressTitle` turns the title into a switcher (with a ▾), and
// `subtitle` adds a small line under it — Library uses the first.
// `scrollY` / `offset` come in through useDockHeader's props. Pass
// `refreshing` (on a page with pull-to-refresh) and the logo, if there is
// one, spins while it refreshes — see RefreshSpin. `overlay`: see-through
// at the top of the page (for a backdrop that reaches up under it), solid
// once you scroll.
export const DockHeader = ({
  title,
  logo,
  eyebrow,
  subtitle,
  onPressTitle,
  back,
  left,
  right,
  wordmark = false,
  scrollY,
  offset,
  refreshing,
  overlay = false,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  // The logo turns like a reel while refreshing.
  const logoRotation = useRefreshSpin(!!refreshing);

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
        overlay && styles.barOverlay,
        { paddingTop: insets.top, height: insets.top + HEADER_BAR_HEIGHT },
        barStyle,
      ]}
    >
      {overlay && <OverlayFill scrollY={scrollY} styles={styles} />}
      <Animated.View style={[styles.barRow, rowStyle]}>
        {/* The title, centred across the whole bar (clear of the buttons
            either side); back on the left, the actions on the right. */}
        <View style={styles.centerTitle} pointerEvents="box-none">
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
              {logo && refreshing !== undefined ? (
                <SpinningLogo rotation={logoRotation}>{logo}</SpinningLogo>
              ) : (
                logo
              )}
              {wordmark ? (
                <Wordmark size={WORDMARK_SIZE} style={styles.titleWordmark}>
                  {title}
                </Wordmark>
              ) : (
                <Text
                  style={[
                    eyebrow ? styles.leftTitle : styles.title,
                    subtitle && styles.titleWithSubtitle,
                    styles.titleShrink,
                  ]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              )}
            </View>
          )}
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {back}
        <View style={styles.spacer} />
        {(left || right) && (
          <View style={styles.actions}>
            {left}
            {right}
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

// The header for pages pushed on top of the tabs (Settings, Badges, Spin,
// the challenge generator…): the same bar, centred title and right actions
// as the tab headers, plus a leading back button — or a ✕ for modal-style
// flows (`close`). It sits in normal layout flow, not absolute.
//
// Pass `scrollY` (from useStackHeaderScroll) with `titleRevealAt`, which
// hides the title until the page has
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
    <RoundHeaderButtons.Provider value>
      <View style={[styles.stackBar, { paddingTop: insets.top + spacing.xs }]}>
        {/* Back (or ✕) on the left, the title centred, actions on the
            right — all round, filled buttons, like Movie details'. */}
        <View style={styles.stackLeading}>
          {close ? (
            <HeaderIconButton onPress={onBack} accessibilityLabel={t("Close")}>
              <X size={20} strokeWidth={2} color={colors.textPrimary} />
            </HeaderIconButton>
          ) : (
            <BackButton onPress={onBack} floating />
          )}
        </View>
        <Animated.View
          style={[styles.stackTitleWrap, titleStyle]}
          pointerEvents="none"
        >
          <Text style={styles.stackTitle} numberOfLines={1}>
            {title}
          </Text>
        </Animated.View>
        <View style={styles.spacer} />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </RoundHeaderButtons.Provider>
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
      // Near-black, darker than the page.
      backgroundColor: colors.headerBackground,
    },
    barOverlay: {
      backgroundColor: "transparent",
    },
    overlayFill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.headerBackground,
    },
    barRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    // Bold, on the left.
    title: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 26,
      letterSpacing: -0.3,
      color: colors.textPrimary,
    },
    stackBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      // A little room under the round buttons.
      paddingBottom: spacing.sm + 2,
      backgroundColor: colors.headerBackground,
      zIndex: 10,
    },
    stackLeading: {
      flexDirection: "row",
      alignItems: "center",
    },
    // Centred over the whole bar, clear of the round buttons either side.
    stackTitleWrap: {
      position: "absolute",
      start: TITLE_SIDE_ROOM,
      end: TITLE_SIDE_ROOM,
      bottom: spacing.sm + 2,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    spacer: {
      flex: 1,
    },
    stackTitle: {
      ...typography.title,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.3,
      color: colors.textPrimary,
      textAlign: "center",
    },
    titleButton: {
      flexDirection: "row",
      alignItems: "center",
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
    // The wordmark (components/Wordmark), centred on the logo beside it.
    titleWordmark: {
      letterSpacing: 0.8,
      color: colors.textPrimary,
    },
    // The title, centred across the bar, clear of the buttons either side.
    centerTitle: {
      position: "absolute",
      top: 0,
      bottom: 0,
      start: TITLE_SIDE_ROOM,
      end: TITLE_SIDE_ROOM,
      alignItems: "center",
      justifyContent: "center",
    },
    // Every action, together on the right.
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginStart: spacing.sm,
    },
    leftEyebrow: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    leftTitle: {
      ...typography.subtitle,
      fontSize: 17,
      lineHeight: 23,
      color: colors.textPrimary,
      marginTop: 1,
    },
    // Plain icons, no circle behind them.
    iconButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    // Inner pages: a filled circle, like Movie details' buttons.
    iconButtonRound: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.cardElevated,
    },
    iconButtonPressed: {
      opacity: 0.7,
    },
    // Ringed in the page colour so it stands off the icon.
    badge: {
      position: "absolute",
      top: 3,
      end: 2,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.danger,
      borderWidth: 2,
      borderColor: colors.background,
    },
    badgeText: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 13,
      color: "#FFFFFF",
      fontVariant: ["tabular-nums"],
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

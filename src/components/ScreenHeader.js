import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { createContext, useContext } from "react";
import { ChevronDown, X } from "lucide-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
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
import { useProfileStore } from "../store/profileStore";
import { spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";
import { Wordmark } from "./Wordmark";
import { BackButton } from "./BackButton";
import { SpinningLogo, useRefreshSpin } from "./RefreshSpin";

// Tall enough for the large title, as in Apple Music.
export const HEADER_BAR_HEIGHT = 56;
// The tab headers sit this much up into the status bar's area — the clock
// row leaves room under its icons — so the large title is close under it.
const HEADER_TOP_TUCK = 5;
// Where a tab header starts: just under the status bar, tucked up.
const headerTop = (insets) => Math.max(insets.top - HEADER_TOP_TUCK, 0);
// The wordmark's size in Home's header.
const WORDMARK_SIZE = 28;
// A centred title keeps this clear on each side, for the buttons there.
const TITLE_SIDE_ROOM = 92;
// The avatar at the end of a tab's header.
const AVATAR = 42;
// Its colours when there's no photo, behind your initials.
const AVATAR_COLORS = ["#7FD3C2", "#F2A45E"];
// The header is see-through; once the page scrolls (over this much), a
// shade fades in behind it — the page colour, thinning out a little below
// the bar — so what scrolls under it stays out of the way of the title.
const SHADE_FADE_DISTANCE = 24;
const SHADE_TAIL = 28;
const SNAP_DURATION = 200;

// Every tab's header: a fixed-height bar in the page colour, the title on
// the left and actions on the right. Anything more than a title (a live
// status line, a search field, tab chips) lives at the top of the page
// instead, in <PageIntro>.
//
// As the page scrolls, the bar scrolls away with it, its title and
// buttons fading out — gone once the page has moved the bar's height —
// and back as you return to the top, like a large title. `pinned` (a page
// with a bar fixed under the header: Discover's Browse / Reels, Profile's
// tabs): the row only fades, and the bar stays, so there's no gap above
// that one. With `hideOnScroll` the bar slides up out of the way as you
// scroll down anywhere and comes straight back the moment you scroll up.
// Only its row moves; a status-bar-tall strip stays put so nothing scrolls
// under the clock.
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
export const useDockHeader = ({ hideOnScroll = false, pinned = false } = {}) => {
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
      if (!hideOnScroll) {
        // Away with the page, as far as the bar is tall.
        offset.value = Math.min(Math.max(y, 0), HEADER_BAR_HEIGHT);
        return;
      }
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
    contentInset: headerTop(insets) + HEADER_BAR_HEIGHT + spacing.underHeader,
    // Where the header bar ends. Screens with pull-to-refresh start their
    // scroll view here (not under the bar), so the refresh spinner shows
    // just below the header instead of hidden behind it.
    barBottom: headerTop(insets) + HEADER_BAR_HEIGHT,
    props: { scrollY, offset, pinned },
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

// The header's shade: nothing at the top of the page, fading in as it
// scrolls — the page colour, nearly solid behind the title and thinning to
// nothing just below the bar.
const HeaderShade = ({ scrollY, height, colors, styles }) => {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY?.value ?? 0, [0, SHADE_FADE_DISTANCE], [0, 1], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.shade, { height: height + SHADE_TAIL }, style]}>
      <LinearGradient
        colors={[`${colors.background}F2`, `${colors.background}C7`, `${colors.background}00`]}
        locations={[0, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
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

// Your photo — or your initials on a soft gradient — at the end of a tab's
// header, opening Profile, as in Apple Music.
const HeaderAvatar = ({ styles }) => {
  const navigation = useNavigation();
  const avatarUri = useProfileStore((state) => state.avatarUri);
  const displayName = useProfileStore((state) => state.displayName);
  const initials = (displayName || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return (
    <Pressable
      onPress={() => navigation.navigate("Profile")}
      hitSlop={4}
      style={({ pressed }) => pressed && styles.iconButtonPressed}
      accessibilityRole="button"
      accessibilityLabel={t("Profile")}
    >
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
      ) : (
        <LinearGradient colors={AVATAR_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
};

// Apple Music's header: a large title on the left (with an optional small
// `eyebrow` line above it), the actions together in a rounded capsule on
// the right — `left`'s, then `right`'s — and your avatar after them
// (`avatar`, on by default; Profile turns it off) — `left`'s, then
// `right`'s. `back`: a back button, on the left. `wordmark`:
// the title is the app's name — set in its own face (Home).
// `onPressTitle` turns the title into a switcher (with a ▾), and
// `subtitle` adds a small line under it — Library uses the first.
// `scrollY` / `offset` come in through useDockHeader's props. Pass
// `refreshing` (on a page with pull-to-refresh) and the logo, if there is
// one, spins while it refreshes — see RefreshSpin. The bar itself is
// see-through, a shade fading in behind it as the page scrolls
// (HeaderShade).
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
  avatar = true,
  pinned = false,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  // The logo turns like a reel while refreshing.
  const logoRotation = useRefreshSpin(!!refreshing);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset && !pinned ? -offset.value : 0 }],
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
        { paddingTop: headerTop(insets), height: headerTop(insets) + HEADER_BAR_HEIGHT },
        barStyle,
      ]}
    >
      <HeaderShade scrollY={scrollY} height={headerTop(insets) + HEADER_BAR_HEIGHT} colors={colors} styles={styles} />
      <Animated.View style={[styles.barRow, rowStyle]}>
        {/* Back, then the large title; the actions and avatar at the end. */}
        {back}
        <View style={styles.titleBlock}>
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
                style={[styles.largeTitle, subtitle && styles.largeTitleSmall, styles.titleShrink]}
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
                    styles.largeTitle,
                    (eyebrow || subtitle) && styles.largeTitleSmall,
                    styles.titleShrink,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
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
        {(left || right) && (
          <View style={styles.capsule}>
            {left}
            {right}
          </View>
        )}
        {avatar && <HeaderAvatar styles={styles} />}
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
      // See-through: the shade behind it does the work.
      backgroundColor: "transparent",
    },
    shade: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
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
    // The large title, on the left, taking the room the actions leave.
    titleBlock: {
      flex: 1,
      justifyContent: "center",
    },
    largeTitle: {
      fontFamily: fonts.extraBold,
      fontSize: 30,
      lineHeight: 36,
      letterSpacing: -0.6,
      color: colors.textPrimary,
    },
    largeTitleSmall: {
      fontSize: 24,
      lineHeight: 29,
    },
    // Every action, together in a rounded capsule (a circle for one).
    capsule: {
      flexDirection: "row",
      alignItems: "center",
      height: AVATAR,
      minWidth: AVATAR,
      justifyContent: "center",
      paddingHorizontal: 3,
      gap: spacing.xs,
      marginStart: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: AVATAR / 2,
    },
    avatar: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      alignItems: "center",
      justifyContent: "center",
      marginStart: spacing.sm,
      overflow: "hidden",
    },
    avatarText: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: "#FFFFFF",
    },
    leftEyebrow: {
      ...typography.caption,
      color: colors.textSecondary,
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

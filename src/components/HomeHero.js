import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Text } from "./AppText";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";
import { t } from "../i18n";

// Home's top banner, like a movie's page: the film's backdrop (a still,
// softened; or, without one, its poster blurred) behind it all — the title
// or logo (left) and poster (right) high up, then `details` (why it's the
// pick) and the actions — fading into the page at the bottom. Without a poster (the welcome) it's just the text.
//
// Pass the page's `scrollY` and the backdrop answers a pull to refresh: it
// stretches up into the gap the pull opens above it, its top edge held at
// the top of the page. Scrolling the other way, it just scrolls.
const POSTER_WIDTH = 104;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
// The film's title art fits inside this box, keeping its shape.
const LOGO_MAX_HEIGHT = 72;
// The still is softened behind the words, so they read on it.
const BACKDROP_BLUR = 24;

export const HomeHero = ({
  posterUri,
  backdropUri,
  logo,
  eyebrow,
  title,
  meta,
  reason,
  details,
  actions,
  onPress,
  onDismiss,
  scrollY,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  // The backdrop's part of the banner (measured), which it fills.
  const [height, setHeight] = useState(0);
  // The movie's own title art (TMDB's) in place of the title — dark mode
  // only, as most logos are white; the plain title if it doesn't load.
  const [logoFailed, setLogoFailed] = useState(false);
  const textWidth = width - spacing.md * 3 - (posterUri ? POSTER_WIDTH : 0);
  const logoSize =
    colors.isDark && logo?.url && logo.aspect > 0 && !logoFailed
      ? (() => {
          const logoWidth = Math.min(textWidth, LOGO_MAX_HEIGHT * logo.aspect);
          return { width: logoWidth, height: logoWidth / logo.aspect };
        })()
      : null;
  const backdropHeight = height || width;
  const stillScroll = useSharedValue(0);
  const pull = scrollY ?? stillScroll;
  // Pulled down by g: grow by g (scaled about the centre) and move up by
  // half of it, so the top edge stays where the page starts.
  const stretchStyle = useAnimatedStyle(() => {
    const y = pull.value;
    if (y >= 0) return { transform: [{ translateY: 0 }, { scale: 1 }] };
    return { transform: [{ translateY: y / 2 }, { scale: 1 - y / backdropHeight }] };
  }, [backdropHeight]);

  const row = (
    // The words on the left, the poster on the right.
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={[styles.eyebrow, posterUri && styles.shadowed]}>{eyebrow}</Text>
        {logoSize ? (
          <Image
            source={{ uri: logo.url }}
            style={[logoSize, styles.logo]}
            resizeMode="contain"
            onError={() => setLogoFailed(true)}
            accessible
            accessibilityRole="header"
            accessibilityLabel={title}
          />
        ) : (
          <Text style={[styles.title, posterUri && styles.shadowed]} numberOfLines={3}>
            {title}
          </Text>
        )}
        {!!meta && (
          <Text style={[styles.meta, posterUri && styles.shadowed]} numberOfLines={2}>
            {meta}
          </Text>
        )}
        {reason}
      </View>
      {posterUri && <MoviePoster uri={posterUri} shadow style={styles.poster} />}
    </View>
  );

  return (
    <Pressable style={styles.hero} onPress={onPress} disabled={!onPress}>
      {posterUri ? (
        // The title and poster, on the backdrop.
        <View
          style={[styles.onImage, { paddingTop: Math.round(width * 0.06) }]}
          onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
        >
          <Animated.View pointerEvents="none" style={[styles.backdrop, stretchStyle]}>
            <Image
              source={{ uri: backdropUri ?? posterUri }}
              blurRadius={backdropUri ? BACKDROP_BLUR : 22}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
            />
            {/* The softened still behind it all: a light shade at the top
                for the ✕, a touch more down the banner for the words and
                buttons, then into the page at the very bottom. */}
            <LinearGradient
              colors={[
                `${colors.background}66`,
                `${colors.background}26`,
                `${colors.background}59`,
                `${colors.background}B3`,
                colors.background,
              ]}
              locations={[0, 0.3, 0.7, 0.9, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {onDismiss && (
            <Pressable
              style={styles.dismiss}
              onPress={onDismiss}
              hitSlop={10}
              accessibilityLabel={t("Remove")}
            >
              <X size={22} color={colors.textPrimary} strokeWidth={1.75} />
            </Pressable>
          )}
          {row}
          {details}
          {actions && <View style={styles.actions}>{actions}</View>}
        </View>
      ) : (
        <>
          {row}
          {details}
          {actions && <View style={styles.actions}>{actions}</View>}
        </>
      )}
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Edge to edge (it cancels Home's section padding). Not clipped, so the
    // backdrop can stretch up past it on a pull — the page's scroll view
    // keeps it below the tabs.
    hero: {
      marginHorizontal: -spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    // On the backdrop: the full width, the still showing above the title
    // and poster, everything down to the buttons on it, and a little room
    // under them for the fade.
    onImage: {
      marginHorizontal: -spacing.md,
      marginTop: -spacing.md,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    logo: {
      marginTop: spacing.sm,
    },
    shadowed: {
      textShadowColor: "rgba(0, 0, 0, 0.65)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 8,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    // A flat ✕ like the header icons (no circle).
    dismiss: {
      position: "absolute",
      top: spacing.sm + 2,
      end: spacing.md,
      zIndex: 2,
      width: 32,
      height: 32,
      alignItems: "flex-end",
      justifyContent: "flex-start",
    },
    // The words and the poster level at the top.
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
    },
    // A thin light frame lifts it off the backdrop.
    poster: {
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
      borderWidth: 1.5,
      borderColor: "rgba(255, 255, 255, 0.28)",
    },
    text: {
      flex: 1,
      paddingTop: spacing.xs,
    },
    // Small capitals, like a film page's credits line.
    eyebrow: {
      ...typography.label,
      fontSize: 12,
      letterSpacing: 1,
      color: colors.textMuted,
    },
    title: {
      ...typography.hero,
      fontSize: 26,
      lineHeight: 32,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    meta: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 18,
      letterSpacing: 0.8,
      color: colors.textSecondary,
      marginTop: spacing.sm + 2,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
  });

export default HomeHero;

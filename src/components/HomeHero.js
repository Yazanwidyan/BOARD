import { LinearGradient } from "expo-linear-gradient";
import { Clover, Sparkles, Star, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Text } from "./AppText";

import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { t } from "../i18n";

// The card's height for its width.
const CARD_RATIO = 0.82;
// The film's title art fits inside this box, keeping its shape.
const LOGO_MAX_HEIGHT = 76;
// On a pull to refresh the still zooms in a little, inside the card.
const PULL_ZOOM = 0.18;
const PULL_DISTANCE = 160;
// The eyebrow's pill: a strong red, white on it (5 : 1).
const EYEBROW_RED = "#D62828";

// Home's top card: the film's still filling an edge-to-edge card, darkened from
// the left, with a small label, the title (or the film's logo), one line of
// meta, why it fits you and how well — then the actions under the card and,
// when there are several to step through, dots for which one this is.
// Without an image (the welcome) it's the same card, plain.
//
// The ✦ while it's thinking: breathing in and out.
const ThinkingMark = ({ color }) => {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 550 }), -1, true);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
    transform: [{ scale: 0.85 + pulse.value * 0.3 }, { rotate: `${pulse.value * 20}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <Sparkles size={30} color={color} strokeWidth={1.8} />
    </Animated.View>
  );
};

// (Why a film fits you isn't said here — that's on its page, in the taste
// match.) `eyebrow`: the card's name, in a red pill at its top-left, with
// `eyebrowIcon` (a lucide icon, in white). `rated`: its age rating, boxed
// after `meta`. `description`: what it's about, three lines. `match`: how
// well it fits your taste (0–100). `tag`: { text, color? } —
// why it's here ("From your watchlist", "Next in a collection"), beside
// the match.
// `thinking`: a line to show over the card while the next one's being
// found (the ✦ pulses over the dimmed card), or null.
export const HomeHero = ({
  posterUri,
  backdropUri,
  logo,
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  meta,
  rated,
  description,
  match,
  tag,
  actions,
  onPress,
  onDismiss,
  scrollY,
  thinking = null,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  // Edge to edge.
  const cardWidth = width;
  const tagColor = tag?.color ?? colors.textPrimary;
  const image = backdropUri ?? posterUri;
  // The movie's own title art (TMDB's) in place of the title — dark mode
  // only, as most logos are white; the plain title if it doesn't load.
  const [logoFailed, setLogoFailed] = useState(false);
  const logoSize =
    colors.isDark && logo?.url && logo.aspect > 0 && !logoFailed
      ? (() => {
          const logoWidth = Math.min(cardWidth * 0.68, LOGO_MAX_HEIGHT * logo.aspect);
          return { width: logoWidth, height: logoWidth / logo.aspect };
        })()
      : null;

  const stillScroll = useSharedValue(0);
  const pull = scrollY ?? stillScroll;
  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale:
          1 +
          interpolate(-pull.value, [0, PULL_DISTANCE], [0, PULL_ZOOM], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View>
      <Pressable
        // At least this tall; taller when there's more to say.
        style={[
          styles.card,
          image && { minHeight: Math.round(cardWidth * CARD_RATIO) },
          (!!eyebrow || !!onDismiss) && styles.cardWithTop,
        ]}
        onPress={onPress}
        disabled={!onPress}
      >
        {image && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, zoomStyle]}>
            <Image
              source={{ uri: image }}
              blurRadius={backdropUri ? 0 : 18}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
        {image && (
          <>
            {/* Dark from the left, where the words are… */}
            <LinearGradient
              pointerEvents="none"
              colors={[`${colors.background}F2`, `${colors.background}99`, `${colors.background}00`]}
              locations={[0, 0.45, 0.85]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {/* …and up from the bottom. */}
            <LinearGradient
              pointerEvents="none"
              colors={[`${colors.background}00`, `${colors.background}B3`]}
              locations={[0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
          </>
        )}

        {/* The card's name, stuck in its top-left corner. */}
        {!!eyebrow && (
          <View style={styles.eyebrowTab}>
            {EyebrowIcon && <EyebrowIcon size={13} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />}
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          </View>
        )}

        {onDismiss && (
          <Pressable
            style={styles.dismiss}
            onPress={onDismiss}
            hitSlop={10}
            accessibilityLabel={t("Remove")}
          >
            <X size={18} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        )}

        <View style={styles.words}>
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
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          )}
          {(!!meta || !!rated) && (
            <View style={styles.metaRow}>
              {!!meta && (
                <Text style={styles.meta} numberOfLines={1}>
                  {meta}
                </Text>
              )}
              {!!rated && (
                <View style={styles.rated}>
                  <Text style={styles.ratedText}>{rated}</Text>
                </View>
              )}
            </View>
          )}
          {!!description && (
            <Text style={styles.description} numberOfLines={3}>
              {description}
            </Text>
          )}
          {(match != null || tag) && (
            <View style={styles.chips}>
              {match != null && (
                <View style={styles.match}>
                  <Clover size={14} color={colors.success} strokeWidth={2.2} />
                  <Text style={styles.matchText}>{t("{match}% match", { match })}</Text>
                </View>
              )}
              {tag && (
                <View style={[styles.tag, { backgroundColor: `${tagColor}2E` }]}>
                  <Star size={13} color={tagColor} fill={tagColor} />
                  <Text style={[styles.tagText, { color: tagColor }]} numberOfLines={1}>
                    {tag.text}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* The buttons, inside the card at its foot. */}
        {actions && <View style={styles.actions}>{actions}</View>}

        {!!thinking && (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(200)}
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.thinking]}
          >
            <ThinkingMark color={colors.textPrimary} />
            <Animated.View key={thinking} entering={FadeIn.duration(180)}>
              <Text style={styles.thinkingText}>{thinking}</Text>
            </Animated.View>
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      justifyContent: "flex-end",
      padding: spacing.md + 2,
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    // Room for the eyebrow and the ✕, so tall words never run under them.
    cardWithTop: {
      paddingTop: spacing.md * 2 + 30,
    },
    // A small round ✕ on the image.
    dismiss: {
      position: "absolute",
      // Level with the eyebrow.
      top: spacing.md - 2,
      end: spacing.sm + 2,
      zIndex: 2,
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      borderRadius: shape.chip,
    },
    words: {
      maxWidth: "72%",
      gap: 4,
    },
    // The card's name ("Suggested for tonight"): small white capitals with
    // its icon, in a red pill set in from the top-left corner.
    eyebrowTab: {
      position: "absolute",
      top: spacing.md + 2,
      start: spacing.md + 2,
      zIndex: 2,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      backgroundColor: EYEBROW_RED,
      borderRadius: shape.chip,
    },
    eyebrow: {
      ...typography.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 1.1,
      textTransform: "uppercase",
      color: "#FFFFFF",
    },
    title: {
      ...typography.display,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    logo: {
      marginVertical: 4,
    },
    // Year · genre · length, then its age rating in a small box.
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    meta: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    rated: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      borderRadius: 4,
    },
    ratedText: {
      ...typography.bodyBold,
      fontSize: 10,
      lineHeight: 13,
      color: colors.textSecondary,
    },
    // What it's about, in three lines.
    description: {
      ...typography.body,
      fontSize: 12.5,
      lineHeight: 17,
      color: colors.textSecondary,
      marginTop: 4,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.sm,
    },
    // Why it's here, beside the match.
    tag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: shape.control - 4,
      maxWidth: "100%",
    },
    // Tinted by the tag's colour, set inline.
    tagText: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 14,
    },
    match: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      alignSelf: "flex-start",
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      backgroundColor: colors.successSoft,
      borderRadius: shape.control - 4,
    },
    matchText: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      color: colors.success,
    },
    // While it's finding the next one: the card dimmed, the ✦ and a line.
    thinking: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm + 2,
      backgroundColor: `${colors.background}D9`,
    },
    thinkingText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    // Inside the card, at its foot: the main button, then round actions
    // with their names under them.
    actions: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
  });

export default HomeHero;

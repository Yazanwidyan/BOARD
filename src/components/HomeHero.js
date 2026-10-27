import { LinearGradient } from "expo-linear-gradient";
import { Crown, Layers, Sparkles, TrendingUp, X } from "lucide-react-native";
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
import { describeForecast } from "../utils/ranks";
import { describeSagaStep } from "../utils/tonightPick";

// The card's height for its width.
const CARD_RATIO = 0.82;
// The film's title art fits inside this box, keeping its shape.
const LOGO_MAX_HEIGHT = 64;
// On a pull to refresh the still zooms in a little, inside the card.
const PULL_ZOOM = 0.18;
const PULL_DISTANCE = 160;

// Home's top card: the film's still filling a rounded card, darkened from
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

// `match`: how well it fits your taste (0–100). `tag`: { text, color? } —
// why it's here ("From your watchlist", "Finishes a collection"), beside
// the match. `saga` and `forecast` (utils/tonightPick) add a slate line each
// for what it does for a collection and for your ranks.
// `thinking`: a line to show over the card while the next one's being
// found (the ✦ pulses over the dimmed card), or null.
export const HomeHero = ({
  posterUri,
  backdropUri,
  logo,
  eyebrow,
  title,
  meta,
  reason,
  match,
  tag,
  saga,
  forecast,
  actions,
  onPress,
  onDismiss,
  scrollY,
  thinking = null,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  // What it does for a collection, and for your ranks — a line each.
  const sagaLine = describeSagaStep(saga);
  const isRankStep = saga?.type === "rank";
  const rankLine = forecast ? describeForecast(forecast) : null;
  const earnsRank = (forecast?.gained?.length ?? 0) > 0;
  const cardWidth = width - spacing.md * 2;
  const image = backdropUri ?? posterUri;
  // The movie's own title art (TMDB's) in place of the title — dark mode
  // only, as most logos are white; the plain title if it doesn't load.
  const [logoFailed, setLogoFailed] = useState(false);
  const logoSize =
    colors.isDark && logo?.url && logo.aspect > 0 && !logoFailed
      ? (() => {
          const logoWidth = Math.min(cardWidth * 0.62, LOGO_MAX_HEIGHT * logo.aspect);
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
        style={[styles.card, image && { minHeight: Math.round(cardWidth * CARD_RATIO) }]}
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
          {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
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
          {!!meta && (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          )}
          {!!reason && (
            <Text style={styles.reason} numberOfLines={2}>
              {reason}
            </Text>
          )}
          {(match != null || tag) && (
            <View style={styles.chips}>
              {match != null && (
                <View style={styles.match}>
                  <Text style={styles.matchText}>{t("{match}% match", { match })}</Text>
                </View>
              )}
              {tag && (
                <View style={styles.tag}>
                  <Text style={[styles.tagText, tag.color && { color: tag.color }]} numberOfLines={1}>
                    {tag.text}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* What it does for a collection and your ranks: the card's full
            width, under the words. */}
        {(!!sagaLine || !!rankLine) && (
          <View style={styles.notes}>
            {!!sagaLine && (
              <View style={styles.note}>
                {isRankStep ? (
                  <Crown size={13} color={colors.rating} strokeWidth={2} style={styles.noteIcon} />
                ) : (
                  <Layers size={13} color={colors.rating} strokeWidth={2} style={styles.noteIcon} />
                )}
                <Text style={styles.noteText}>
                  {sagaLine}
                </Text>
              </View>
            )}
            {!!rankLine && (
              <View style={styles.note}>
                {earnsRank ? (
                  <Crown size={13} color={colors.rating} strokeWidth={2} style={styles.noteIcon} />
                ) : (
                  <TrendingUp size={13} color={colors.rating} strokeWidth={2} style={styles.noteIcon} />
                )}
                <Text style={styles.noteText}>
                  {rankLine}
                </Text>
              </View>
            )}
          </View>
        )}

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

      {actions && <View style={styles.actions}>{actions}</View>}

    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      justifyContent: "flex-end",
      padding: spacing.md + 2,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
    },
    // A small round ✕ on the image.
    dismiss: {
      position: "absolute",
      top: spacing.sm + 2,
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
    eyebrow: {
      ...typography.label,
      fontSize: 11,
      letterSpacing: 1,
      color: colors.textSecondary,
    },
    title: {
      ...typography.display,
      fontSize: 30,
      lineHeight: 34,
      letterSpacing: -0.6,
      color: colors.textPrimary,
    },
    logo: {
      marginVertical: 4,
    },
    meta: {
      ...typography.caption,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    reason: {
      ...typography.body,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      marginTop: 2,
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
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      borderRadius: shape.control - 4,
      maxWidth: "100%",
    },
    tagText: {
      ...typography.bodyBold,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textPrimary,
    },
    // What it does for a collection or your ranks, in slate.
    notes: {
      marginTop: 2,
    },
    // A line with its icon; long lines wrap, the icon by the first.
    note: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      marginTop: 4,
    },
    noteText: {
      ...typography.caption,
      lineHeight: 16,
      color: colors.rating,
      flexShrink: 1,
      // Past the words' column the image is brighter: a soft shadow keeps
      // the line readable.
      textShadowColor: "rgba(0, 0, 0, 0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    noteIcon: {
      marginTop: 1.5,
    },
    match: {
      alignSelf: "flex-start",
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      backgroundColor: colors.successSoft,
      borderRadius: shape.control - 4,
    },
    matchText: {
      ...typography.bodyBold,
      fontSize: 12,
      lineHeight: 16,
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
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
  });

export default HomeHero;

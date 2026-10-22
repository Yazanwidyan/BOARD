import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Text } from "./AppText";

import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { t } from "../i18n";

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
// `match`: how well it fits your taste (0–100). `pages`: { count, index }.
export const HomeHero = ({
  posterUri,
  backdropUri,
  logo,
  eyebrow,
  title,
  meta,
  reason,
  match,
  actions,
  pages,
  onPress,
  onDismiss,
  scrollY,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
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
        style={[styles.card, image && { height: Math.round(cardWidth * CARD_RATIO) }]}
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
          {match != null && (
            <View style={styles.match}>
              <Text style={styles.matchText}>{t("{match}% match", { match })}</Text>
            </View>
          )}
        </View>
      </Pressable>

      {actions && <View style={styles.actions}>{actions}</View>}

      {pages && pages.count > 1 && (
        <View style={styles.dots} accessible accessibilityLabel={`${pages.index + 1} / ${pages.count}`}>
          {Array.from({ length: pages.count }, (_, index) => (
            <View key={index} style={[styles.dot, index === pages.index && styles.dotOn]} />
          ))}
        </View>
      )}
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
    match: {
      alignSelf: "flex-start",
      marginTop: spacing.sm,
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
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
      marginTop: spacing.md,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.cardElevatedLight,
    },
    dotOn: {
      backgroundColor: colors.textSecondary,
    },
  });

export default HomeHero;

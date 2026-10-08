import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";
import { t } from "../i18n";

// Home's top banner, streaming-app style: full width, the movie's poster
// blurred behind and fading into the page, the poster on the left, a
// small label, a big title, one line of meta, an optional reason, and the
// actions underneath. Without a poster (the welcome) it's just the text.
//
// Sits inside Home's padded section, so it cancels that padding to reach
// the screen edges.
export const HomeHero = ({
  posterUri,
  eyebrow,
  title,
  meta,
  reason,
  actions,
  onPress,
  onDismiss,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.hero} onPress={onPress} disabled={!onPress}>
      {posterUri && (
        <>
          <Image
            source={{ uri: posterUri }}
            blurRadius={22}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[
              `${colors.background}40`,
              `${colors.background}B3`,
              colors.background,
            ]}
            locations={[0, 0.65, 1]}
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
          <X size={22} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
      )}

      <View style={styles.row}>
        {posterUri && (
          <MoviePoster uri={posterUri} shadow style={styles.poster} />
        )}
        <View style={styles.text}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title} numberOfLines={3}>
            {title}
          </Text>
          {!!meta && (
            <Text style={styles.meta} numberOfLines={2}>
              {meta}
            </Text>
          )}
          {reason}
        </View>
      </View>
      {actions && <View style={styles.actions}>{actions}</View>}
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    hero: {
      marginHorizontal: -spacing.md,
      marginTop: -spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      overflow: "hidden",
    },
    // A flat ✕ like the header icons (no circle).
    dismiss: {
      position: "absolute",
      top: spacing.md,
      end: spacing.md,
      zIndex: 2,
      width: 32,
      height: 32,
      alignItems: "flex-end",
      justifyContent: "flex-start",
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.md,
    },
    poster: {
      width: 116,
      aspectRatio: 2 / 3,
    },
    text: {
      flex: 1,
      paddingEnd: spacing.lg,
    },
    eyebrow: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    title: {
      ...typography.display,
      fontSize: 28,
      lineHeight: 33,
      letterSpacing: -0.6,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
  });

export default HomeHero;

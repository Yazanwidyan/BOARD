import { useFocusEffect } from "@react-navigation/native";
import { X } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { clearTierNudge, getTierNudge } from "../services/notifications";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { isRated } from "../utils/tiers";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

const POSTER = 46;

// The morning-after question, on Home: "How was Inception?" — Tier it, or
// ✕. The same one the notification asks (services/notifications), here
// for everyone, notifications on or not: from the day after you watched
// it, until it's tiered or dismissed.
export const TierNudgeCard = ({ navigation, style }) => {
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const watched = useMovieStore((state) => state.watched);
  const [nudge, setNudge] = useState(null);

  // Read again each time Home comes back into view.
  useFocusEffect(
    useCallback(() => {
      let live = true;
      getTierNudge().then((value) => live && setNudge(value));
      return () => {
        live = false;
      };
    }, []),
  );

  if (!nudge) return null;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const entry = watched.find((item) => item.movieId === nudge.movieId);
  const movie = getMovieById(nudge.movieId);
  if (nudge.at >= startOfToday || !entry || isRated(entry) || !movie) return null;

  const dismiss = () => {
    setNudge(null);
    clearTierNudge();
  };

  return (
    <View style={[styles.card, style]}>
      <MoviePoster uri={movie.poster} style={styles.poster} />
      <View style={styles.words}>
        <Text style={styles.title} numberOfLines={1}>
          {t("How was {title}?", { title: movie.title })}
        </Text>
        <Text style={styles.hint} numberOfLines={1}>
          {t("Tier it while it's fresh — it sharpens your picks.")}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.tierButton, pressed && styles.pressed]}
        onPress={() => navigation.navigate("TierMovie", { movieId: movie.id })}
        accessibilityRole="button"
      >
        <Text style={styles.tierText}>{t("Tier it")}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        onPress={dismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("Dismiss")}
      >
        <X size={16} color={colors.textSecondary} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      padding: spacing.sm + 2,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    poster: {
      width: POSTER,
      height: POSTER * 1.5,
    },
    words: {
      flex: 1,
    },
    title: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    tierButton: {
      height: 32,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      borderRadius: shape.chip,
      backgroundColor: colors.brand,
    },
    tierText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.brandText,
    },
    close: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.75,
    },
  });

export default TierNudgeCard;

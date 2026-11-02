import { useFocusEffect } from "@react-navigation/native";
import { X } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { logEvent } from "../services/events";
import { clearTierNudge, getTierNudge, scheduleTierNudge } from "../services/notifications";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { giveWatchedFeedback } from "../utils/achievementFeedback";
import { isRated } from "../utils/tiers";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

const POSTER = 46;

// The morning-after question, on Home — the same one the notification
// asks (services/notifications), here for everyone, notifications on or
// not, from the day after:
//   tonight's pick   "Did you watch Inception?" [Tier it] [Didn't watch it]
//                    → didn't: "Still on for tonight?" [Yes, tonight]
//                      [Pick something else]
//   a watched film   "How was Inception?" [Tier it]
// ✕ dismisses it; it goes once the film is tiered.
export const TierNudgeCard = ({ navigation, style }) => {
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const watched = useMovieStore((state) => state.watched);
  const [nudge, setNudge] = useState(null);
  // After "Didn't watch it": asking whether it's still on.
  const [stillOn, setStillOn] = useState(false);

  // Read again each time Home comes back into view.
  useFocusEffect(
    useCallback(() => {
      let live = true;
      getTierNudge().then((value) => {
        if (!live) return;
        setNudge(value);
        setStillOn(false);
      });
      return () => {
        live = false;
      };
    }, []),
  );

  if (!nudge) return null;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const entry = watched.find((item) => item.movieId === nudge.movieId);
  const movie = getMovieById(nudge.movieId);
  const isPick = nudge.kind === "pick";
  if (nudge.at >= startOfToday || !movie) return null;
  if (isPick ? !!entry : !entry || isRated(entry)) return null;

  const dismiss = () => {
    setNudge(null);
    clearTierNudge();
  };
  // Watched it: it's logged, and the Watched moment leads to its tier.
  const watchedIt = () => {
    logEvent("nudge_watched");
    const { watched: watchedBefore, toggleWatched } = useMovieStore.getState();
    toggleWatched(movie.id);
    giveWatchedFeedback(movie.id, watchedBefore);
    setNudge(null);
  };
  const didntWatch = () => {
    logEvent("nudge_not_watched");
    setStillOn(true);
  };
  // Still tonight's: ask again tomorrow if it slips again.
  const keepForTonight = () => {
    const { pickedMovie, setPickedMovie } = useMovieStore.getState();
    if (pickedMovie !== movie.id) setPickedMovie(movie.id);
    scheduleTierNudge(movie.id, "pick");
    setNudge(null);
  };
  const pickAnother = () => {
    useMovieStore.getState().clearPickedMovie();
    dismiss();
  };

  const title = stillOn
    ? t("Still on for tonight?")
    : isPick
      ? t("Did you watch {title}?", { title: movie.title })
      : t("How was {title}?", { title: movie.title });
  const hint = stillOn
    ? movie.title
    : isPick
      ? t("Tier it, or tell us you didn't — your next pick gets sharper.")
      : t("Tier it while it's fresh — it sharpens your picks.");
  const actions = stillOn
    ? [
        { key: "yes", label: t("Yes, tonight"), onPress: keepForTonight, main: true },
        { key: "other", label: t("Pick something else"), onPress: pickAnother },
      ]
    : isPick
      ? [
          { key: "tier", label: t("Tier it"), onPress: watchedIt, main: true },
          { key: "no", label: t("Didn't watch it"), onPress: didntWatch },
        ]
      : [
          {
            key: "tier",
            label: t("Tier it"),
            onPress: () => navigation.navigate("TierMovie", { movieId: movie.id }),
            main: true,
          },
        ];

  return (
    <View style={[styles.card, style]}>
      <View style={styles.top}>
        <MoviePoster uri={movie.poster} style={styles.poster} />
        <View style={styles.words}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.hint} numberOfLines={2}>
            {hint}
          </Text>
        </View>
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
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            style={({ pressed }) => [styles.button, action.main ? styles.buttonMain : styles.buttonQuiet, pressed && styles.pressed]}
            onPress={action.onPress}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, action.main && styles.buttonMainText]} numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      padding: spacing.sm + 2,
      gap: spacing.sm + 2,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    top: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
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
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    button: {
      flex: 1,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.sm,
      borderRadius: shape.chip,
    },
    buttonMain: {
      backgroundColor: colors.brand,
    },
    buttonQuiet: {
      borderWidth: 1,
      borderColor: colors.outline,
    },
    buttonText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textPrimary,
    },
    buttonMainText: {
      color: colors.brandText,
    },
    close: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
    },
    pressed: {
      opacity: 0.75,
    },
  });

export default TierNudgeCard;

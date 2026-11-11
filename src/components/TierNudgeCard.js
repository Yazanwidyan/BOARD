import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { logEvent } from "../services/events";
import { logPickOutcome } from "../services/pickLog";
import { clearTierNudge, getTierNudge, scheduleTierNudge } from "../services/notifications";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { tierWithFeedback } from "../utils/achievementFeedback";
import { isRated } from "../utils/tiers";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

const POSTER = 46;
// The one-tap answers, and the tiers they give.
const QUICK = [
  { tier: "A", label: "Loved it" },
  { tier: "C", label: "It was fine" },
  { tier: "D", label: "Not for me" },
];

// The morning-after question, on Home (and Notifications) — the same one
// the notification asks (services/notifications), here for everyone,
// notifications on or not, from the day after. One tap answers it:
//   tonight's pick   "Did you watch Inception?" [Loved it] [It was fine]
//                    [Not for me] — watched and tiered (A / C / D) at once;
//                    under them "Exact tier" (the slider) and "Didn't
//                    watch it" → "Still on for tonight?" [Yes, tonight]
//                    [Pick something else]
//   a watched film   "How was Inception?" — the same three, and "Exact
//                    tier".
// ✕ dismisses it; it goes once the film is tiered. How it was answered
// (one tap, the slider, dismissed) goes to the launch numbers.
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
  const close = () => {
    logEvent("nudge_dismissed");
    if (isPick) logPickOutcome(movie.id, "dismissed");
    dismiss();
  };
  // Logged as watched first, when it was tonight's pick — quietly: the
  // answer is the tier.
  const markWatched = () => {
    if (!isPick) return;
    logEvent("nudge_watched");
    useMovieStore.getState().toggleWatched(movie.id);
  };
  // One tap: watched (if it was the pick) and tiered.
  const answer = (tier) => {
    Haptics.selectionAsync();
    logEvent("nudge_quick");
    markWatched();
    tierWithFeedback(movie.id, tier);
    setNudge(null);
  };
  // The full slider, for an exact tier.
  const exactTier = () => {
    logEvent("nudge_slider");
    markWatched();
    setNudge(null);
    navigation.navigate("TierMovie", { movieId: movie.id });
  };
  const didntWatch = () => {
    logEvent("nudge_not_watched");
    logPickOutcome(movie.id, "not_watched");
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
      ? t("One tap — or tell us you didn't. Your next pick gets sharper.")
      : t("One tap while it's fresh — it sharpens your picks.");
  const actions = stillOn
    ? [
        { key: "yes", label: t("Yes, tonight"), onPress: keepForTonight, main: true },
        { key: "other", label: t("Pick something else"), onPress: pickAnother },
      ]
    : QUICK.map(({ tier, label }) => ({ key: tier, label: t(label), onPress: () => answer(tier), answer: true }));
  // Quieter, under the answers: the exact tier, and (for the pick) "I
  // didn't watch it".
  const links = stillOn
    ? []
    : [
        { key: "exact", label: t("Exact tier"), onPress: exactTier },
        ...(isPick ? [{ key: "no", label: t("Didn't watch it"), onPress: didntWatch }] : []),
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
          onPress={close}
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
            style={({ pressed }) => [
              styles.button,
              action.answer ? styles.buttonAnswer : action.main ? styles.buttonMain : styles.buttonQuiet,
              pressed && styles.pressed,
            ]}
            onPress={action.onPress}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, action.main && styles.buttonMainText]} numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {links.length > 0 && (
        <View style={styles.links}>
          {links.map((link) => (
            <Pressable key={link.key} onPress={link.onPress} hitSlop={8} accessibilityRole="button">
              <Text style={styles.linkText}>{link.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
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
    // A one-tap answer: filled, quieter than a main button — three of them
    // side by side.
    buttonAnswer: {
      backgroundColor: colors.cardElevated,
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
    // "Exact tier", "Didn't watch it": quiet words under the answers.
    links: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.lg,
    },
    linkText: {
      ...typography.caption,
      fontFamily: typography.bodyBold.fontFamily,
      color: colors.textSecondary,
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

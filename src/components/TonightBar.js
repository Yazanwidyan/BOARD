import { Check, X } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { TAB_BAR_CLEARANCE, shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { giveWatchedFeedback } from "../utils/achievementFeedback";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

// The bar's height, with its gap above the tabs.
export const TONIGHT_BAR_HEIGHT = 64;

// What the tab screens leave free at the bottom: the tabs, and Tonight's
// bar when there's a pick.
export const useTabBarClearance = () => {
  const picked = useMovieStore((state) => !!state.pickedMovie);
  return TAB_BAR_CLEARANCE + (picked ? TONIGHT_BAR_HEIGHT : 0);
};

// Tonight's pick, docked above the tabs like a player's "now playing" — on
// every tab until it's watched: its poster and title (tap for its page),
// Watched (the dialog that follows is the confirmation) and ✕ to drop it
// and choose again.
export const TonightBar = ({ navigation }) => {
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const clearPickedMovie = useMovieStore((state) => state.clearPickedMovie);
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const movie = pickedMovieId ? getMovieById(pickedMovieId) : null;
  if (!movie) return null;

  const markWatched = () => {
    const { watched: watchedBefore, bucketList: bucketListBefore } = useMovieStore.getState();
    toggleWatched(movie.id);
    giveWatchedFeedback(movie.id, watchedBefore, bucketListBefore);
  };

  return (
    <Animated.View
      key={movie.id}
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      style={styles.wrap}
    >
      <Pressable
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
        onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
        accessibilityRole="button"
        accessibilityLabel={`${t("Tonight")}: ${movie.title}`}
      >
        <MoviePoster uri={movie.poster} style={styles.poster} />
        <View style={styles.words}>
          <Text style={styles.eyebrow}>{t("Tonight")}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {movie.title}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.watched, pressed && styles.pressed]}
          onPress={markWatched}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("Watched")}
        >
          <Check size={16} color={colors.brandText} strokeWidth={2.6} />
          <Text style={styles.watchedText}>{t("Watched")}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          onPress={clearPickedMovie}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("Back to choosing")}
        >
          <X size={18} color={colors.textSecondary} strokeWidth={2.2} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
    },
    bar: {
      height: TONIGHT_BAR_HEIGHT - spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingStart: spacing.sm,
      paddingEnd: spacing.xs,
      backgroundColor: colors.cardElevated,
      borderRadius: shape.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.75,
    },
    poster: {
      width: 30,
      height: 45,
    },
    words: {
      flex: 1,
    },
    eyebrow: {
      ...typography.micro,
      color: colors.textSecondary,
    },
    title: {
      ...typography.bodyBold,
      lineHeight: 19,
      color: colors.textPrimary,
    },
    watched: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      height: 32,
      paddingHorizontal: spacing.sm + 2,
      backgroundColor: colors.brand,
      borderRadius: shape.control,
    },
    watchedText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.brandText,
    },
    close: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default TonightBar;

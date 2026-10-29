import { Dices, Layers } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { MixArt } from "../components/MixRail";
import { MoviePoster } from "../components/MoviePoster";
import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useSessionStore } from "../store/sessionStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";

const COVER = 236;
const POSTER_WIDTH = 46;

// A mix (utils/mixes) on its own page, laid out like an Apple Music
// playlist: its artwork, its name and label, two buttons side by side —
// sort the pile (Swipe), or let it pick one for you — and the films, each
// opening its page.
export const MixScreen = ({ navigation, route }) => {
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const headerScroll = useStackHeaderScroll();
  const startSession = useSessionStore((state) => state.startSession);
  const { title, titleIsName, eyebrow, hint, tint, movieIds } = route.params;
  const movies = movieIds.map((id) => getMovieById(id)).filter(Boolean);
  const name = titleIsName ? title : t(title);

  const sort = () => {
    startSession(movies);
    navigation.navigate("Swipe");
  };
  const surprise = () => {
    const movie = movies[Math.floor(Math.random() * movies.length)];
    if (movie) navigation.navigate("MovieDetails", { movieId: movie.id });
  };

  return (
    <View style={styles.container}>
      <StackHeader
        title={name}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
        titleRevealAt={COVER + spacing.xl + 24}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        <View style={styles.hero}>
          <View style={styles.cover}>
            <MixArt mix={{ movies, tint, title, titleIsName, hint }} width={COVER} height={COVER} />
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.eyebrow}>{t(eyebrow)}</Text>
        </View>

        {/* Two buttons, as Play and Shuffle are on a playlist. */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={sort}
            accessibilityRole="button"
            accessibilityLabel={t("Sort this pile")}
          >
            <Layers size={18} color={colors.brand} strokeWidth={2.2} />
            <Text style={styles.actionText}>{t("Sort this pile")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={surprise}
            accessibilityRole="button"
            accessibilityLabel={t("Pick one for me")}
          >
            <Dices size={18} color={colors.brand} strokeWidth={2.2} />
            <Text style={styles.actionText}>{t("Pick one for me")}</Text>
          </Pressable>
        </View>

        {movies.map((movie, index) => (
          <Pressable
            key={movie.id}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
            accessibilityRole="button"
            accessibilityLabel={movie.title}
          >
            <MoviePoster uri={movie.poster} style={styles.poster} />
            {/* A hairline under the words, not the poster, as in a list of songs. */}
            <View style={[styles.rowWords, index < movies.length - 1 && styles.rowRule]}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {movie.title}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {[movie.year, movie.genres?.[0] && t(movie.genres[0]), movie.runtime ? formatRuntime(movie.runtime) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
          </Pressable>
        ))}
      </Animated.ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    hero: {
      alignItems: "center",
      paddingTop: spacing.md,
      paddingHorizontal: spacing.md,
    },
    cover: {
      marginBottom: spacing.md,
      shadowColor: "#000000",
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    title: {
      fontFamily: fonts.display,
      fontSize: 25,
      lineHeight: 31,
      textAlign: "center",
      color: colors.textPrimary,
    },
    eyebrow: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.brand,
      marginTop: 2,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    action: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 46,
      backgroundColor: colors.buttonFill,
      borderRadius: shape.card,
    },
    actionText: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.brand,
    },
    pressed: {
      opacity: 0.75,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingStart: spacing.md,
    },
    poster: {
      width: POSTER_WIDTH,
      height: POSTER_WIDTH * 1.5,
    },
    rowWords: {
      flex: 1,
      alignSelf: "stretch",
      justifyContent: "center",
      gap: 2,
      paddingEnd: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    rowRule: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowTitle: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    rowMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });

export default MixScreen;

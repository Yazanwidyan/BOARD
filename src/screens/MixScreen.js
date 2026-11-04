import { ChevronLeft, Dices, Layers } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { FilmRow } from "../components/FilmRow";
import { MixArt } from "../components/MixRail";
import { DockHeader, HeaderIconButton, useDockHeader } from "../components/ScreenHeader";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { t, useIsRTL } from "../i18n";
import { useSessionStore } from "../store/sessionStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";

const COVER = 220;

// A mix from Home's "Top picks for you" (utils/mixes) on its own page, laid
// out like an Apple Music playlist: its artwork, its name, its label, how
// many films and how long they'd take; two buttons side by side — sort the
// pile (Swipe), the main one, or let it pick one for you — and the films
// as every list's rows (components/FilmRow: your tier, or a bookmark).
export const MixScreen = ({ navigation, route }) => {
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const header = useDockHeader();
  const startSession = useSessionStore((state) => state.startSession);
  const { title, titleIsName, eyebrow, hint, tint, movieIds } = route.params;
  const movies = movieIds.map((id) => getMovieById(id)).filter(Boolean);
  const name = titleIsName ? title : t(title);
  const minutes = movies.reduce((sum, movie) => sum + (movie.runtime ?? 0), 0);

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
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: header.barBottom, paddingBottom: insets.bottom + spacing.xl }}
      >
        <View style={styles.hero}>
          <View style={styles.cover}>
            <MixArt mix={{ movies, tint, title, titleIsName, hint }} width={COVER} height={COVER} />
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.eyebrow}>{t(eyebrow)}</Text>
          <Text style={styles.stats}>
            {[t("{count} films", { count: movies.length }), minutes > 0 ? formatRuntime(minutes) : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>

        {/* Two buttons, as Play and Shuffle are on a playlist. */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.action, styles.actionMain, pressed && styles.pressed]}
            onPress={sort}
            accessibilityRole="button"
          >
            <Layers size={18} color={colors.selectedText} strokeWidth={2.2} />
            <Text style={[styles.actionText, styles.actionMainText]}>{t("Sort this pile")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={surprise}
            accessibilityRole="button"
          >
            <Dices size={18} color={colors.textPrimary} strokeWidth={2.2} />
            <Text style={styles.actionText}>{t("Pick one for me")}</Text>
          </Pressable>
        </View>

        {movies.map((movie, index) => (
          <FilmRow
            key={movie.id}
            movie={movie}
            onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
            last={index === movies.length - 1}
          />
        ))}
      </Animated.ScrollView>
      <DockHeader
        {...header.props}
        title={name}
        centered
        avatar={false}
        back={
          <HeaderIconButton round onPress={() => navigation.goBack()} accessibilityLabel={t("Back")}>
            <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2} style={rtl && styles.flipped} />
          </HeaderIconButton>
        }
      />
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    hero: {
      alignItems: "center",
      paddingTop: spacing.sm,
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
    stats: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    // Sort is the main one, filled; Pick one sits beside it, outlined.
    action: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 46,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: shape.card,
    },
    actionMain: {
      backgroundColor: colors.selected,
      borderColor: colors.selected,
    },
    actionText: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    actionMainText: {
      color: colors.selectedText,
    },
    pressed: {
      opacity: 0.75,
    },
  });

export default MixScreen;

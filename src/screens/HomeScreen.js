import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Clapperboard, Dices } from "lucide-react-native";
import { useColors } from "../theme/useColors";
import { typography } from "../theme/typography";
import { radius, spacing, TAB_BAR_CLEARANCE } from "../theme/spacing";
import { PrimaryButton } from "../components/PrimaryButton";
import { MoviePoster } from "../components/MoviePoster";
import { RatingBadge } from "../components/RatingBadge";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { MOVIES, getMovieById } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";

const RAIL_MOVIES = MOVIES.slice(0, 12);

export const HomeScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const sessionActive = useSessionStore((state) => state.sessionActive);
  const phase = useSessionStore((state) => state.phase);
  const roundNumber = useSessionStore((state) => state.roundNumber);
  const roundMovies = useSessionStore((state) => state.roundMovies);
  const roundIndex = useSessionStore((state) => state.roundIndex);

  const pickedMovie = pickedMovieId ? getMovieById(pickedMovieId) : null;
  const remaining = roundMovies.length - roundIndex;
  const continueLabel = phase === "swiping" ? `${remaining} left in Round ${roundNumber}` : "Tap to continue";

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>URWatch</Text>
        </View>

        {pickedMovie ? (
          <Pressable
            onPress={() =>
              navigation.navigate("MovieDetails", { movieId: pickedMovie.id })
            }
            style={styles.pickedCard}
          >
            <MoviePoster
              uri={pickedMovie.poster}
              radius={0}
              style={styles.pickedPoster}
            />
            <LinearGradient
              colors={[
                "transparent",
                "rgba(2, 0, 2, 0.1)",
                "rgba(2, 0, 2, 0.55)",
                "rgba(2, 0, 2, 0.92)",
              ]}
              locations={[0.35, 0.55, 0.8, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.pickedGradient}
            />
            <View style={styles.pickedInfo}>
              <View style={styles.pickedEyebrowRow}>
                <Clapperboard size={13} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.pickedEyebrow}>TONIGHT&apos;S PICK</Text>
              </View>
              <Text style={styles.pickedTitle} numberOfLines={2}>
                {pickedMovie.title}
              </Text>
              <View style={styles.pickedMetaRow}>
                <Text style={styles.pickedMeta}>{pickedMovie.year}</Text>
                <RatingBadge rating={pickedMovie.rating} size="sm" />
              </View>
              <PrimaryButton
                label="Mark as Watched"
                onPress={() => toggleWatched(pickedMovie.id)}
                style={styles.pickedButton}
              />
            </View>
          </Pressable>
        ) : sessionActive ? (
          <Pressable
            onPress={() => navigation.navigate("Swipe")}
            style={styles.continueCard}
          >
            <View style={styles.continueIconBadge}>
              <Dices size={20} color={colors.background} strokeWidth={2.2} />
            </View>
            <View style={styles.continueInfo}>
              <Text style={styles.continueTitle}>Continue narrowing down</Text>
              <Text style={styles.continueMeta}>{continueLabel}</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.promptCard}>
            <View style={styles.continueIconBadge}>
              <Dices size={20} color={colors.background} strokeWidth={2.2} />
            </View>
            <Text style={styles.promptTitle}>No pick for tonight yet</Text>
            <Text style={styles.promptSubtitle}>
              Tap the dice in the tab bar to shuffle 10 movies and swipe your
              way to a winner.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Explore the Top {MOVIES.length}</Text>
          <Pressable onPress={() => navigation.navigate("BrowseMovies")}>
            <Text style={styles.sectionLink}>See all</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railContent}
        >
          {RAIL_MOVIES.map((movie) => (
            <Pressable
              key={movie.id}
              style={styles.railItem}
              onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
            >
              <MoviePoster uri={movie.poster} shadow radius={radius.sm} style={styles.railPoster} />
              <Text style={styles.railTitle} numberOfLines={1}>{movie.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>
      <ScreenBottomFade />
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
    },
    header: {
      marginTop: spacing.md,
      alignItems: "center",
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
      textAlign: "center",
    },
    pickedCard: {
      width: "100%",
      marginTop: spacing.xl,
      aspectRatio: 4 / 3,
      borderRadius: radius.lg,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    pickedPoster: {
      ...StyleSheet.absoluteFillObject,
    },
    pickedGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    pickedInfo: {
      position: "absolute",
      left: spacing.md,
      right: spacing.md,
      bottom: spacing.md,
    },
    pickedEyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    pickedEyebrow: {
      ...typography.label,
      color: "#FFFFFF",
    },
    pickedTitle: {
      ...typography.hero,
      color: "#FFFFFF",
      marginTop: 4,
    },
    pickedMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    pickedMeta: {
      ...typography.bodyBold,
      color: "rgba(255, 255, 255, 0.75)",
    },
    pickedButton: {
      marginTop: spacing.md,
    },
    continueCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.xl,
    },
    continueIconBadge: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      backgroundColor: colors.textPrimary,
      alignItems: "center",
      justifyContent: "center",
    },
    continueInfo: {
      flex: 1,
    },
    continueTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    continueMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    promptCard: {
      alignItems: "center",
      paddingVertical: spacing.xl,
      marginTop: spacing.xl,
      gap: spacing.sm,
    },
    promptTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    promptSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 18,
      maxWidth: 260,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    sectionLink: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    railContent: {
      paddingRight: spacing.md,
      gap: spacing.md,
    },
    railItem: {
      width: 104,
    },
    railPoster: {
      width: 104,
      aspectRatio: 2 / 3,
    },
    railTitle: {
      ...typography.caption,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
  });

export default HomeScreen;

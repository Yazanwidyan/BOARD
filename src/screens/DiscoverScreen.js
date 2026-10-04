import { Search, Star } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { MoviePoster } from "../components/MoviePoster";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { MOVIES, getMovieById } from "../data/movies";
import { generateRecommendations } from "../services/recommendations";
import { useMovieStore } from "../store/movieStore";
import { useUserStore } from "../store/userStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { matchesGenres } from "../utils/movieFilters";

const RAIL_COUNT = 10;
const TOP_RATED = [...MOVIES]
  .sort((a, b) => b.rating - a.rating)
  .slice(0, RAIL_COUNT);
const bestOfGenre = (genre) =>
  [...MOVIES]
    .filter((movie) => matchesGenres(movie, [genre]))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, RAIL_COUNT);
const TOP_DRAMA = bestOfGenre("Drama");
const TOP_SCIFI = bestOfGenre("Sci-Fi");

const DiscoverRail = ({ title, movies, navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const watched = useMovieStore((state) => state.watched);

  if (movies.length === 0) return null;

  return (
    <View style={styles.rail}>
      <Text style={styles.railTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {movies.map((movie) => {
          const userRating = watched.find(
            (entry) => entry.movieId === movie.id,
          )?.rating;

          return (
            <Pressable
              key={movie.id}
              style={styles.railCard}
              onPress={() =>
                navigation.navigate("MovieDetails", { movieId: movie.id })
              }
            >
              <MoviePoster
                uri={movie.poster}
                radius={0}
                style={styles.railPoster}
              />
              <View style={styles.imdbBadge}>
                <Star size={10} color={colors.rating} fill={colors.rating} />
                <Text style={styles.imdbBadgeText}>
                  {movie.rating.toFixed(1)}
                </Text>
              </View>
              {userRating != null && (
                <View style={styles.userRatingBadge}>
                  <Star
                    size={10}
                    color={colors.accentContrast}
                    fill={colors.accentContrast}
                  />
                  <Text style={styles.userRatingBadgeText}>
                    {userRating.toFixed(1)}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

// The most recently watched movie's top genre, minus anything already seen
// — a light, honest "because you watched X" personalization, not a real
// recommendation engine.
const BecauseYouWatched = ({ navigation }) => {
  const watched = useMovieStore((state) => state.watched);
  if (watched.length === 0) return null;

  const recentMovie = getMovieById(watched[0].movieId);
  if (!recentMovie) return null;

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const genre = recentMovie.genres[0];
  const related = MOVIES.filter(
    (movie) =>
      movie.id !== recentMovie.id &&
      !watchedIds.has(movie.id) &&
      movie.genres.includes(genre),
  )
    .sort((a, b) => b.rating - a.rating)
    .slice(0, RAIL_COUNT);
  if (related.length === 0) return null;

  return (
    <DiscoverRail
      title={`Because you watched ${recentMovie.title}`}
      movies={related}
      navigation={navigation}
    />
  );
};

export const DiscoverScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const preferences = useUserStore((state) => state.preferences);

  const seenIds = new Set([
    ...bucketList.map((entry) => entry.movieId),
    ...watched.map((entry) => entry.movieId),
  ]);
  const recommended = generateRecommendations(preferences, RAIL_COUNT).filter(
    (movie) => !seenIds.has(movie.id),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Discover</Text>
        <Pressable
          style={styles.searchButton}
          onPress={() => navigation.navigate("Search")}
          hitSlop={8}
        >
          <Search size={18} color={colors.textPrimary} strokeWidth={2} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
        showsVerticalScrollIndicator={false}
      >
        <BecauseYouWatched navigation={navigation} />
        <DiscoverRail
          title="Top Rated"
          movies={TOP_RATED}
          navigation={navigation}
        />
        <DiscoverRail
          title="Recommended For You"
          movies={recommended}
          navigation={navigation}
        />
        <DiscoverRail
          title="Best of Drama"
          movies={TOP_DRAMA}
          navigation={navigation}
        />
        <DiscoverRail
          title="Best of Sci-Fi"
          movies={TOP_SCIFI}
          navigation={navigation}
        />
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
    },
    searchButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    // Invisible same-size counterpart to searchButton on the opposite side,
    // so space-between centers the title relative to the whole header
    // instead of the title sitting flush-left next to a lone right button.
    headerSpacer: {
      width: 40,
      height: 40,
    },
    rail: {
      marginTop: spacing.lg,
    },
    railTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
      marginLeft: spacing.md,
    },
    railContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    railCard: {
      width: 104,
    },
    railPoster: {
      width: 104,
      aspectRatio: 2 / 3,
    },
    imdbBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: "rgba(2, 0, 2, 0.65)",
    },
    imdbBadgeText: {
      ...typography.label,
      fontSize: 10,
      color: colors.rating,
    },
    userRatingBadge: {
      position: "absolute",
      top: 6,
      left: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    userRatingBadgeText: {
      ...typography.label,
      fontSize: 10,
      color: colors.accentContrast,
    },
    trendingCard: {
      overflow: "hidden",
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    trendingScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(2, 0, 2, 0.4)",
    },
    trendingGradient: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "70%",
    },
    trendingContent: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: spacing.sm,
    },
    trendingEyebrow: {
      ...typography.label,
      fontSize: 9,
      color: "rgba(255, 255, 255, 0.85)",
    },
    trendingTitle: {
      ...typography.subtitle,
      color: "#FFFFFF",
      marginTop: 2,
    },
    trendingMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
    },
    trendingMetaText: {
      ...typography.caption,
      fontSize: 11,
      color: "#FFFFFF",
    },
  });

export default DiscoverScreen;

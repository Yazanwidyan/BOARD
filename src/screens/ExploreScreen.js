import { LinearGradient } from "expo-linear-gradient";
import { Sparkles, Star } from "lucide-react-native";
import { useRef } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
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
// No real view/watch-count data to rank by, so "trending" is honestly
// derived from what the dataset actually has: the most recent, highest
// rated titles — new-ish and well-liked, rather than a fabricated signal.
const RECENT_YEARS_WINDOW = 5;
const latestYear = Math.max(...MOVIES.map((movie) => movie.year));
const TRENDING = [...MOVIES]
  .filter((movie) => movie.year > latestYear - RECENT_YEARS_WINDOW)
  .sort((a, b) => b.rating - a.rating)
  .slice(0, RAIL_COUNT);
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

const showAskAiStub = () => Alert.alert("Ask AI", "Coming soon.");

// Flat, hard-edged "2D" shadow — a solid offset block behind the card
// instead of a soft blurred drop shadow — so the card itself shrinks by
// this amount to leave room for the block to peek out bottom-right.
const HERO_SHADOW_OFFSET = 6;

const Hero = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const toggleWatched = useMovieStore((state) => state.toggleWatched);

  const pickedMovie = pickedMovieId ? getMovieById(pickedMovieId) : null;
  const cardWidth = width - spacing.md * 2 - HERO_SHADOW_OFFSET;
  const heroHeight = cardWidth * 0.75;

  if (!pickedMovie) return null;

  return (
    <View
      style={[
        styles.heroWrap,
        { height: heroHeight + HERO_SHADOW_OFFSET },
      ]}
    >
      <View
        style={[
          styles.heroShadow,
          { width: cardWidth, height: heroHeight },
        ]}
      />
      <View style={[styles.hero, { width: cardWidth, height: heroHeight }]}>
        <MoviePoster
          uri={pickedMovie.backdrop}
          radius={0}
          style={StyleSheet.absoluteFillObject}
        />
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() =>
            navigation.navigate("MovieDetails", { movieId: pickedMovie.id })
          }
        >
          <View style={styles.heroScrim} />
          <LinearGradient
            colors={["transparent", "rgba(2, 0, 2, 0.55)", "rgba(2, 0, 2, 0.96)"]}
            locations={[0, 0.55, 1]}
            style={styles.heroGradient}
          />
          <View style={[styles.heroContent, { paddingBottom: spacing.md }]}>
            <Text style={styles.heroEyebrow}>TONIGHT&apos;S PICK</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {pickedMovie.title}
            </Text>
            <View style={styles.heroMetaRow}>
              <Star size={13} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.heroMetaText}>
                {pickedMovie.rating.toFixed(1)} · {pickedMovie.year} ·{" "}
                {pickedMovie.genres[0]}
              </Text>
            </View>
            <PrimaryButton
              label="Mark as Watched"
              onPress={() => {
                toggleWatched(pickedMovie.id);
                navigation.navigate("MovieDetails", { movieId: pickedMovie.id });
              }}
              style={styles.heroActionButton}
            />
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const TRENDING_CARD_RATIO = 0.78;
const TRENDING_GAP = spacing.sm;

const TrendingCard = ({ movie, cardWidth, navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const cardHeight = cardWidth * 0.62;

  return (
    <Pressable
      style={[styles.trendingCard, { width: cardWidth, height: cardHeight }]}
      onPress={() =>
        navigation.navigate("MovieDetails", { movieId: movie.id })
      }
    >
      <MoviePoster
        uri={movie.backdrop}
        radius={0}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.trendingScrim} />
      <LinearGradient
        colors={["transparent", "rgba(2, 0, 2, 0.55)", "rgba(2, 0, 2, 0.96)"]}
        locations={[0, 0.55, 1]}
        style={styles.trendingGradient}
      />
      <View style={styles.trendingContent}>
        <Text style={styles.trendingEyebrow}>TRENDING</Text>
        <Text style={styles.trendingTitle} numberOfLines={1}>
          {movie.title}
        </Text>
        <View style={styles.trendingMetaRow}>
          <Star size={11} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.trendingMetaText}>
            {movie.rating.toFixed(1)} · {movie.year}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const TrendingSection = ({ movies, navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);

  if (movies.length === 0) return null;

  const cardWidth = width * TRENDING_CARD_RATIO;
  const itemWidth = cardWidth + TRENDING_GAP;
  const loopWidth = itemWidth * movies.length;
  // Three back-to-back copies of the same small real list, so scrolling
  // past either edge of the middle copy can be silently snapped back into
  // the middle without an animation — the seam is invisible since it's the
  // same content — creating an endless loop out of a finite dataset.
  const loopedMovies = [...movies, ...movies, ...movies];

  const handleScrollEnd = (event) => {
    const x = event.nativeEvent.contentOffset.x;
    if (x < loopWidth) {
      scrollRef.current?.scrollTo({ x: x + loopWidth, animated: false });
    } else if (x >= loopWidth * 2) {
      scrollRef.current?.scrollTo({ x: x - loopWidth, animated: false });
    }
  };

  return (
    <View style={styles.rail}>
      <Text style={styles.railTitle}>Trending Now</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth}
        decelerationRate="fast"
        contentContainerStyle={[styles.railContent, { gap: TRENDING_GAP }]}
        contentOffset={{ x: loopWidth, y: 0 }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {loopedMovies.map((movie, index) => (
          <TrendingCard
            key={`${movie.id}-${index}`}
            movie={movie}
            cardWidth={cardWidth}
            navigation={navigation}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const ExploreRail = ({ title, movies, navigation }) => {
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
                radius={radius.sm}
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

export const ExploreScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const preferences = useUserStore((state) => state.preferences);

  const seenIds = new Set([
    ...bucketList,
    ...watched.map((entry) => entry.movieId),
  ]);
  const recommended = generateRecommendations(preferences, RAIL_COUNT).filter(
    (movie) => !seenIds.has(movie.id),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ width: 40 }} />
        <Text style={styles.title}>Explore</Text>
        <Pressable style={styles.heroIconButton} onPress={showAskAiStub}>
          <Sparkles size={18} color="#FFFFFF" strokeWidth={2.2} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Hero navigation={navigation} />

        <TrendingSection movies={TRENDING} navigation={navigation} />
        <ExploreRail
          title="Top Rated"
          movies={TOP_RATED}
          navigation={navigation}
        />
        <ExploreRail
          title="Recommended For You"
          movies={recommended}
          navigation={navigation}
        />
        <ExploreRail
          title="Best of Drama"
          movies={TOP_DRAMA}
          navigation={navigation}
        />
        <ExploreRail
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
    heroWrap: {
      marginTop: spacing.md,
      marginHorizontal: spacing.md,
      position: "relative",
    },
    heroShadow: {
      position: "absolute",
      top: HERO_SHADOW_OFFSET,
      left: HERO_SHADOW_OFFSET,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    hero: {
      position: "absolute",
      top: 0,
      left: 0,
      borderRadius: radius.sm,
      overflow: "hidden",
      backgroundColor: colors.card,
      borderWidth: 2.5,
      borderColor: colors.border,
    },
    heroScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(2, 0, 2, 0.4)",
    },
    heroGradient: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "85%",
    },
    heroContent: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: spacing.md,
      alignItems: "flex-start",
    },
    heroEyebrow: {
      ...typography.label,
      color: "rgba(255, 255, 255, 0.85)",
    },
    heroTitle: {
      ...typography.display,
      color: "#FFFFFF",
      marginTop: 4,
    },
    heroMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.sm,
    },
    heroMetaText: {
      ...typography.bodyBold,
      color: "#FFFFFF",
    },
    heroActionButton: {
      alignSelf: "flex-start",
      marginTop: spacing.md,
    },
    heroIconButton: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rail: {
      marginTop: spacing.xl,
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

export default ExploreScreen;

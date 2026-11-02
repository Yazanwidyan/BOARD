import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { TasteDnaCard } from "../components/TasteDnaCard";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { useTasteStore } from "../store/tasteStore";
import { spacing } from "../theme/spacing";
import { useColors } from "../theme/useColors";
import { getTasteProfile } from "../utils/taste";
import { getTasteDna } from "../utils/tasteDna";
import { t } from "../i18n";

// Your whole taste: the films that sum you up, your taste in a sentence,
// what last changed it, the themes you love, what it's steering away
// from, and the plain facts. Opened from the snapshot on Profile.
// "Not for me"s count as steering away for a few days (utils/tonightPick).
const STEERING_DAYS = 3;
const STEERING_SHOWN = 5;
export const TasteScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const watched = useMovieStore((state) => state.watched);
  const taste = getTasteProfile(watched);
  const dna = getTasteDna(watched);
  const passes = useTasteStore((state) => state.passes);
  const openMovie = (movieId) => navigation.push("MovieDetails", { movieId });
  // What last moved it: the newest tiered film.
  const lastEntry = [...watched]
    .filter((entry) => entry.tier)
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))[0];
  const lastMovie = lastEntry ? getMovieById(lastEntry.movieId) : null;
  const lastTiered = lastMovie ? { movie: lastMovie, tier: lastEntry.tier, at: lastEntry.timestamp ?? Date.now() } : null;
  const since = Date.now() - STEERING_DAYS * 24 * 60 * 60 * 1000;
  const steering = passes
    .filter((pass) => (pass.at ?? 0) >= since)
    .map((pass) => getMovieById(pass.movieId))
    .filter(Boolean)
    .slice(0, STEERING_SHOWN);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StackHeader
        title={t("Your taste")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        <TasteDnaCard
          dna={dna}
          lastTiered={lastTiered}
          steering={steering}
          director={taste.director}
          decade={taste.decade}
          topGenres={taste.topGenres}
          onOpenMovie={openMovie}
          onOpenCollection={(collectionId) =>
            navigation.push("CollectionDetails", { collectionId })
          }
          onSeeUntiered={() => navigation.navigate("Library", { showUntiered: true })}
        />
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TasteScreen;

import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { TasteDnaCard } from "../components/TasteDnaCard";
import { useMoviesVersion } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { spacing } from "../theme/spacing";
import { useColors } from "../theme/useColors";
import { getTasteProfile } from "../utils/taste";
import { getTasteDna } from "../utils/tasteDna";
import { t } from "../i18n";

// Your whole Taste DNA: the radar, the themes you love, the films that sum
// you up and the plain facts. Opened from the snapshot on Profile.
export const TasteScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const watched = useMovieStore((state) => state.watched);
  const taste = getTasteProfile(watched);
  const dna = getTasteDna(watched);
  const openMovie = (movieId) => navigation.push("MovieDetails", { movieId });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StackHeader
        title={t("Taste DNA")}
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

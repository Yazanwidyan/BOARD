import { Eye, Flame } from "lucide-react-native";
import { StyleSheet } from "react-native";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { shape } from "../theme/spacing";
import { useColors } from "../theme/useColors";
import { giveWatchedFeedback } from "../utils/achievementFeedback";
import { getMood } from "../utils/moods";
import { formatRuntime } from "../utils/movieFilters";
import { getPickInsight } from "../utils/tonightPick";
import { countFinishedDares } from "../utils/useRanks";
import { HomeHero } from "./HomeHero";
import { PrimaryButton } from "./PrimaryButton";
import { t } from "../i18n";

// Tonight's Pick as Home's hero banner, the same card as the suggestion
// (see HomeHero): the backdrop, the title (or logo), year · genre ·
// length, what it's about and where it came from, then
// Watched, the main button across the card; ✕ drops the pick. Tapping it
// opens the movie. Renders nothing when there's no pick.
// `scrollY`: Home's scroll position, so the backdrop stretches on a pull.
export const TonightsPickCard = ({ navigation, scrollY }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const clearPickedMovie = useMovieStore((state) => state.clearPickedMovie);
  const pickMood = useMovieStore((state) => state.pickMood);
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);
  const history = useChallengeStore((state) => state.history);
  const dares = countFinishedDares(history);

  const pickedMovie = pickedMovieId ? getMovieById(pickedMovieId) : null;
  if (!pickedMovie) return null;

  // Only counts if it was made for this exact pick (see movieStore).
  const mood =
    pickMood?.movieId === pickedMovie.id ? getMood(pickMood.mood) : null;

  const insight = getPickInsight(pickedMovie, watched, dares);
  // Where it came from, or what it does for you — the most specific wins.
  const tag =
    activeChallenge?.targetMovieId === pickedMovie.id
      ? { text: t("Your active dare"), color: colors.dare }
      : mood
        ? { text: `${mood.emoji} ${t(mood.label)}` }
        : insight.forecast.gained.length > 0
          ? { text: t("Earns a rank tonight"), color: colors.rating }
          : insight.saga?.type === "rank" || insight.saga?.type === "progress"
            ? { text: t("Next in a collection"), color: colors.collection }
            : bucketList.some((entry) => entry.movieId === pickedMovie.id)
              ? { text: t("On your watchlist") }
              : null;

  const openDetails = () =>
    navigation.navigate("MovieDetails", { movieId: pickedMovie.id });

  const markWatched = () => {
    const { watched: watchedBefore, bucketList: bucketListBefore } =
      useMovieStore.getState();
    toggleWatched(pickedMovie.id);
    // Stays on Home — the achievement dialog is the confirmation, and
    // the card itself goes away since the pick is now watched.
    giveWatchedFeedback(pickedMovie.id, watchedBefore, bucketListBefore);
  };

  return (
    <HomeHero
      // A fresh banner per film (its logo loads, or falls back, anew).
      key={pickedMovie.id}
      posterUri={pickedMovie.poster}
      backdropUri={pickedMovie.backdrop}
      logo={pickedMovie.details?.logo}
      eyebrow={t("Tonight's pick")}
      eyebrowIcon={Flame}
      title={pickedMovie.title}
      meta={[
        pickedMovie.year,
        pickedMovie.genres?.[0] && t(pickedMovie.genres[0]),
        pickedMovie.runtime ? formatRuntime(pickedMovie.runtime) : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      rated={pickedMovie.details?.rated}
      description={pickedMovie.description}
      tag={tag}
      onPress={openDetails}
      onDismiss={clearPickedMovie}
      scrollY={scrollY}
      actions={
        <PrimaryButton
          label={t("Watched")}
          icon={<Eye size={18} color={colors.brandText} strokeWidth={2} />}
          onPress={markWatched}
          style={styles.main}
          contentStyle={styles.mainContent}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  // Watched: the white main button, across the card.
  main: {
    flex: 1,
  },
  mainContent: {
    minHeight: 48,
    borderRadius: shape.control,
  },
});

export default TonightsPickCard;

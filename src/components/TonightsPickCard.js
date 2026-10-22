import * as Haptics from "expo-haptics";
import { Play, Shuffle } from "lucide-react-native";
import { Linking, Pressable, StyleSheet } from "react-native";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { shape } from "../theme/spacing";
import { useColors } from "../theme/useColors";
import { giveWatchedFeedback } from "../utils/achievementFeedback";
import { getMood, pickMovieForMood } from "../utils/moods";
import { formatRuntime } from "../utils/movieFilters";
import {
  getEndTime,
  getPickInsight,
  getTonightSuggestions,
} from "../utils/tonightPick";
import { countFinishedDares } from "../utils/useRanks";
import { HomeHero } from "./HomeHero";
import { PrimaryButton } from "./PrimaryButton";
import { t } from "../i18n";

// Tonight's Pick as Home's hero banner (see HomeHero): the backdrop, the
// poster, a big title, one line of meta (with when it would end), then why
// it's the pick (PickInsight: your taste match, where it came from, the
// reason it fits, where it gets you in a saga), and Watched it plus
// Trailer and Swap; ✕ drops the pick. Tapping it opens the movie. Renders
// nothing when there's no pick.
// `scrollY`: Home's scroll position, so the backdrop stretches on a pull.
export const TonightsPickCard = ({ navigation, scrollY }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const clearPickedMovie = useMovieStore((state) => state.clearPickedMovie);
  const pickMood = useMovieStore((state) => state.pickMood);
  const setMoodPick = useMovieStore((state) => state.setMoodPick);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
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

  // Where it came from — the most specific wins. The saga it moves along
  // has its own line (PickInsight).
  const tag =
    activeChallenge?.targetMovieId === pickedMovie.id
      ? { text: t("Your active dare"), color: colors.textPrimary }
      : mood
        ? { text: `${mood.emoji} ${t(mood.label)}` }
        : bucketList.some((entry) => entry.movieId === pickedMovie.id)
          ? { text: t("From your watchlist") }
          : null;
  const insight = getPickInsight(pickedMovie, watched, dares);
  const endsAt = getEndTime(pickedMovie);

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

  const openTrailer = () => {
    const query = encodeURIComponent(
      `${pickedMovie.title} ${pickedMovie.year} trailer`,
    );
    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
  };

  // Swap for something in the same spirit: another movie for the same
  // mood; otherwise the next of tonight's suggestions — they take turns
  // (your taste, a rank tonight, a saga, your watchlist, a rank moved
  // along: see utils/tonightPick), so each swap brings a different kind.
  const swap = () => {
    Haptics.selectionAsync();
    if (mood) {
      const next = pickMovieForMood(mood.key, [pickedMovie.id]);
      if (next) setMoodPick(next.id, mood.key);
      return;
    }
    const suggestions = getTonightSuggestions(watched, bucketList, dares).map(
      ({ movie }) => movie.id,
    );
    const others = suggestions.filter((id) => id !== pickedMovie.id);
    if (others.length === 0) {
      showToast(t("Nothing else to swap to right now"));
      return;
    }
    const at = suggestions.indexOf(pickedMovie.id);
    togglePickedMovie(at === -1 ? others[0] : others[at % others.length]);
  };

  return (
    <HomeHero
      // A fresh banner per film (its logo loads, or falls back, anew).
      key={pickedMovie.id}
      posterUri={pickedMovie.poster}
      backdropUri={pickedMovie.backdrop}
      logo={pickedMovie.details?.logo}
      eyebrow={t("Tonight's pick")}
      title={pickedMovie.title}
      meta={[
        pickedMovie.year,
        pickedMovie.genres[0],
        formatRuntime(pickedMovie.runtime),
        endsAt && t("ends {time}", { time: endsAt }),
      ]
        .filter(Boolean)
        .join(" · ")}
      reason={insight.reason ?? tag?.text}
      match={insight.match}
      onPress={openDetails}
      onDismiss={clearPickedMovie}
      scrollY={scrollY}
      actions={
        <>
          <PrimaryButton
            label={t("Watched it")}
            onPress={markWatched}
            style={styles.mainButton}
            contentStyle={styles.square}
          />
          <Pressable
            style={styles.roundButton}
            onPress={openTrailer}
            hitSlop={4}
            accessibilityLabel={t("Watch the trailer")}
          >
            <Play size={18} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            style={styles.roundButton}
            onPress={swap}
            hitSlop={4}
            accessibilityLabel={t("Swap for another movie")}
          >
            <Shuffle size={18} color={colors.textPrimary} />
          </Pressable>
        </>
      }
    />
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    mainButton: {
      flex: 1,
    },
    // Rounded, the same height as the main button.
    square: {
      borderRadius: shape.control,
      minHeight: 48,
    },
    // The small squares beside it: raised tiles with a lighter edge.
    roundButton: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.buttonFill,
      borderWidth: 1.5,
      borderColor: colors.buttonEdge,
      borderRadius: shape.control + 2,
    },
  });

export default TonightsPickCard;

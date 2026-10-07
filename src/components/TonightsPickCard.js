import * as Haptics from "expo-haptics";
import { Play, Shuffle } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { MOVIES, getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { giveWatchedFeedback } from "../utils/achievementFeedback";
import {
  getCollectionProgress,
  getCollectionsForMovie,
} from "../utils/collections";
import { getMood, pickMovieForMood } from "../utils/moods";
import { formatRuntime } from "../utils/movieFilters";
import { HomeHero } from "./HomeHero";
import { PrimaryButton } from "./PrimaryButton";

const SIMILAR_POOL = 20;

const randomFrom = (items) => items[Math.floor(Math.random() * items.length)];

// Tonight's Pick as Home's hero banner (see HomeHero): the poster over a
// blur of itself, a big title, one line of meta and why it's the pick,
// then Watched it plus Trailer and Swap; ✕ drops the pick. Tapping it
// opens the movie. Renders nothing when there's no pick.
export const TonightsPickCard = ({ navigation }) => {
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

  const pickedMovie = pickedMovieId ? getMovieById(pickedMovieId) : null;
  if (!pickedMovie) return null;

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  // Only counts if it was made for this exact pick (see movieStore).
  const mood =
    pickMood?.movieId === pickedMovie.id ? getMood(pickMood.mood) : null;

  // Why this movie — the most specific reason wins.
  const inProgressCollection = getCollectionsForMovie(pickedMovie.id).find(
    (collection) => {
      const { progress } = getCollectionProgress(collection, watchedIds);
      return progress > 0 && progress < 1;
    },
  );
  const reason =
    activeChallenge?.targetMovieId === pickedMovie.id
      ? {
          text: "Your active dare",
          color: colors.textPrimary,
        }
      : inProgressCollection
        ? {
            text: `Next in ${inProgressCollection.title}`,
            color: colors.success,
          }
        : bucketList.some((entry) => entry.movieId === pickedMovie.id)
          ? {
              text: "From your watchlist",
              color: colors.textSecondary,
            }
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

  const openTrailer = () => {
    const query = encodeURIComponent(
      `${pickedMovie.title} ${pickedMovie.year} trailer`,
    );
    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
  };

  // Swap for something in the same spirit: another movie for the same
  // mood; otherwise another unwatched watchlist movie; otherwise a
  // well-rated unwatched movie sharing this one's main genre.
  const swap = () => {
    Haptics.selectionAsync();
    if (mood) {
      const next = pickMovieForMood(mood.key, [pickedMovie.id]);
      if (next) setMoodPick(next.id, mood.key);
      return;
    }
    const fromWatchlist = bucketList
      .map((entry) => entry.movieId)
      .filter((id) => id !== pickedMovie.id && !watchedIds.has(id));
    if (fromWatchlist.length > 0) {
      togglePickedMovie(randomFrom(fromWatchlist));
      return;
    }
    const similar = MOVIES.filter(
      (movie) =>
        movie.id !== pickedMovie.id &&
        !watchedIds.has(movie.id) &&
        movie.genres[0] === pickedMovie.genres[0],
    )
      .sort((a, b) => b.rating - a.rating)
      .slice(0, SIMILAR_POOL);
    if (similar.length > 0) {
      togglePickedMovie(randomFrom(similar).id);
    } else {
      showToast("Nothing else to swap to right now");
    }
  };

  return (
    <HomeHero
      posterUri={pickedMovie.poster}
      eyebrow="Tonight's pick"
      title={pickedMovie.title}
      meta={`${pickedMovie.year} · ${pickedMovie.genres[0]} · ${formatRuntime(pickedMovie.runtime)}`}
      reason={
        reason && (
          <Text
            style={[styles.reasonText, { color: reason.color }]}
            numberOfLines={1}
          >
            {reason.text}
          </Text>
        )
      }
      onPress={openDetails}
      onDismiss={clearPickedMovie}
      actions={
        <>
          <PrimaryButton
            label="Watched it"
            onPress={markWatched}
            style={styles.mainButton}
            contentStyle={styles.square}
          />
          <Pressable
            style={styles.roundButton}
            onPress={openTrailer}
            hitSlop={4}
            accessibilityLabel="Watch the trailer"
          >
            <Play size={18} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            style={styles.roundButton}
            onPress={swap}
            hitSlop={4}
            accessibilityLabel="Swap for another movie"
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
    reasonText: {
      ...typography.caption,
      marginTop: spacing.xs,
    },
    mainButton: {
      flex: 1,
    },
    // Square filled boxes, the same height as the main button.
    square: {
      borderRadius: 0,
      minHeight: 48,
    },
    roundButton: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
  });

export default TonightsPickCard;

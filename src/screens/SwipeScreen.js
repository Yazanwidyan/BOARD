import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Clapperboard, Heart, Shuffle, Trophy, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { ChooseCard } from "../components/ChooseCard";
import { MovieCard } from "../components/MovieCard";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const TRANSITION_AUTO_ADVANCE_MS = 1800;
const CAROUSEL_GAP = spacing.md;

const useScreenBg = () => ({
  bg: "#000000",
  bgSoft: "#0D0D0D",
});

const FadeInView = ({ children, style, delay = 0 }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400 }));
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
};

const ChooseCarousel = ({ movies, onPick, onShowDetails }) => {
  const colors = useColors();
  const { bg } = useScreenBg();
  const styles = createStyles(colors, bg);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width * 0.7, 280);
  const snap = cardWidth + CAROUSEL_GAP;
  const sidePadding = (width - cardWidth) / 2;

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const handleMomentumEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / snap);
    setActiveIndex(Math.max(0, Math.min(movies.length - 1, index)));
  };

  const activeMovie = movies[activeIndex];

  return (
    <View style={styles.carouselWrap}>
      <Text style={styles.carouselCounter}>
        {activeIndex + 1}/{movies.length}
      </Text>

      <Animated.ScrollView
        horizontal
        snapToInterval={snap}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingHorizontal: sidePadding }}
      >
        {movies.map((movie, index) => (
          <View
            key={movie.id}
            style={{
              width: cardWidth,
              marginRight: index < movies.length - 1 ? CAROUSEL_GAP : 0,
            }}
          >
            <ChooseCard
              movie={movie}
              cardWidth={cardWidth}
              index={index}
              scrollX={scrollX}
              snap={snap}
              onPress={() => onShowDetails(movie)}
            />
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.carouselButtons}>
        <PrimaryButton
          label="Pick"
          onPress={() => onPick(activeMovie)}
          style={styles.carouselButton}
        />
        <PrimaryButton
          label="Show Details"
          variant="outline"
          onPress={() => onShowDetails(activeMovie)}
          style={styles.carouselButton}
        />
      </View>
    </View>
  );
};

export const SwipeScreen = ({ navigation }) => {
  const colors = useColors();
  const { bg, bgSoft } = useScreenBg();
  const styles = createStyles(colors, bg);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sessionActive = useSessionStore((state) => state.sessionActive);
  const phase = useSessionStore((state) => state.phase);
  const originalMovies = useSessionStore((state) => state.originalMovies);
  const roundNumber = useSessionStore((state) => state.roundNumber);
  const roundMovies = useSessionStore((state) => state.roundMovies);
  const roundIndex = useSessionStore((state) => state.roundIndex);
  const transition = useSessionStore((state) => state.transition);
  const finalMovie = useSessionStore((state) => state.finalMovie);
  const swipe = useSessionStore((state) => state.swipe);
  const continueToNextRound = useSessionStore(
    (state) => state.continueToNextRound,
  );
  const chooseFinal = useSessionStore((state) => state.chooseFinal);
  const isFinalMoviePicked = useMovieStore(
    (state) => !!finalMovie && state.pickedMovie === finalMovie.id,
  );
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const endSession = useSessionStore((state) => state.endSession);

  const cardWidth = Math.min(width - spacing.md * 2, 420);
  const cardHeight = Math.min(height * 0.62, cardWidth * 1.5);
  // A screen-relative gap (not a small fixed padding) so the lift reads as
  // an actual, noticeable shift up from the bottom edge on every device.
  const stackBottomPad = Math.round(height * 0.06);

  const activeMovie = roundMovies[roundIndex];
  // Every movie left in this round, front-most first, so the stack shows
  // the whole deck rather than just a couple of layers.
  const stackMovies = roundMovies.slice(roundIndex);

  // Owned here (rather than inside MovieCard) so the LIKE/NOPE stamps can
  // live above the stack instead of overlapping the card art, while still
  // tracking the active card's drag in real time.
  const swipeX = useSharedValue(0);
  const swipeThreshold = width * 0.28;

  useEffect(() => {
    swipeX.value = 0;
  }, [activeMovie?.id, swipeX]);

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      swipeX.value,
      [10, swipeThreshold],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const nopeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      swipeX.value,
      [-swipeThreshold, -10],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const handleSwipeRight = useCallback(() => {
    swipe("right");
  }, [swipe]);

  const handleSwipeLeft = useCallback(() => {
    swipe("left");
  }, [swipe]);

  // The active card plays its normal exit animation for a button tap too
  // (see MovieCard's `triggerSwipe`), so LIKE/NOPE buttons feel identical
  // to actually swiping instead of just instantly cutting to the next card.
  const activeCardRef = useRef(null);
  const handleLikePress = useCallback(() => {
    activeCardRef.current?.triggerSwipe("right");
  }, []);
  const handleDislikePress = useCallback(() => {
    activeCardRef.current?.triggerSwipe("left");
  }, []);

  // Skips the round-by-round narrowing entirely and picks a winner straight
  // out of whatever's still left in the current round.
  const handleRandomPick = useCallback(() => {
    if (stackMovies.length === 0) return;
    const randomMovie =
      stackMovies[Math.floor(Math.random() * stackMovies.length)];
    chooseFinal(randomMovie);
  }, [stackMovies, chooseFinal]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCardPress = useCallback(() => {
    if (!activeMovie) return;
    navigation.navigate("MovieDetails", { movieId: activeMovie.id });
  }, [navigation, activeMovie]);

  useFocusEffect(
    useCallback(() => {
      if (!sessionActive) {
        navigation.replace("Preferences");
      }
    }, [sessionActive, navigation]),
  );

  // The swipe-back edge gesture is disabled at the navigator level (see
  // AppNavigator) so an accidental swipe can't derail an active session.
  // Android's hardware back button isn't covered by that, so we intercept
  // it here and route it through the same intentional exit as the button.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBack();
          return true;
        },
      );
      return () => subscription.remove();
    }, [handleBack]),
  );

  useEffect(() => {
    if (phase !== "transition") return undefined;
    const timer = setTimeout(continueToNextRound, TRANSITION_AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [phase, continueToNextRound]);

  if (!sessionActive) {
    return <View style={styles.container} />;
  }

  if (phase === "transition" && transition) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[bgSoft, bg]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.container} edges={["bottom"]}>
          <FadeInView
            style={[styles.transitionContainer, { paddingTop: insets.top }]}
          >
            <Text style={styles.transitionMessage}>{transition.message}</Text>
            <Text style={styles.transitionCounts}>
              {transition.fromCount} movies &rarr; {transition.toCount}{" "}
              contenders
            </Text>
            <PrimaryButton
              label="Continue"
              onPress={continueToNextRound}
              style={styles.transitionButton}
            />
          </FadeInView>
        </SafeAreaView>
      </View>
    );
  }

  if (phase === "choose") {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <BackButton onPress={handleBack} />
          <Text style={styles.roundLabel}>ROUND {roundNumber}</Text>
          <Text style={styles.chooseHeading}>
            {roundMovies.length === 2 ? "Final Two" : "Final Three"}
          </Text>
        </View>

        <FadeInView style={styles.chooseBody}>
          <ChooseCarousel
            movies={roundMovies}
            onPick={chooseFinal}
            onShowDetails={(movie) =>
              navigation.navigate("MovieDetails", { movieId: movie.id })
            }
          />
        </FadeInView>
      </SafeAreaView>
    );
  }

  if (phase === "final" && finalMovie) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[bgSoft, bg]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.container} edges={["bottom"]}>
          <FadeInView
            style={[styles.finalContainer, { paddingTop: insets.top }]}
          >
            <View style={styles.finalIconBadge}>
              <Trophy size={26} color={colors.textPrimary} strokeWidth={1.8} />
            </View>
            <Text style={styles.finalEyebrow}>TONIGHT&apos;S MOVIE</Text>
            <MoviePoster
              uri={finalMovie.poster}
              style={styles.finalPoster}
              radius={radius.sm}
              shadow
            />
            <Text style={styles.finalTitle}>{finalMovie.title}</Text>
            <Text style={styles.finalMeta}>
              {finalMovie.year} &middot; {finalMovie.rating.toFixed(1)}
            </Text>
            <Text style={styles.finalSubtitle}>
              You chose it from {originalMovies.length} movies.
            </Text>

            <View style={styles.buttons}>
              <PrimaryButton
                label={isFinalMoviePicked ? "Approved" : "Approve to Watch"}
                variant={isFinalMoviePicked ? "secondary" : "primary"}
                icon={
                  isFinalMoviePicked ? (
                    <Clapperboard size={18} color={colors.success} />
                  ) : undefined
                }
                onPress={() => togglePickedMovie(finalMovie.id)}
                style={styles.button}
              />
              <PrimaryButton
                label="Movie Details"
                variant="outline"
                onPress={() =>
                  navigation.navigate("MovieDetails", {
                    movieId: finalMovie.id,
                  })
                }
                style={styles.button}
              />
              <PrimaryButton
                label="Choose Again"
                variant="ghost"
                onPress={() => {
                  endSession();
                  navigation.replace("Preferences");
                }}
                style={styles.button}
              />
              <PrimaryButton
                label="Back to Home"
                variant="ghost"
                onPress={() => {
                  endSession();
                  navigation.navigate("Main", { screen: "Explore" });
                }}
                style={styles.button}
              />
            </View>
          </FadeInView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={handleBack} />
        <View style={styles.remainingBadge} pointerEvents="none">
          <Text style={styles.remainingBadgeCount}>{stackMovies.length}</Text>
          <Text style={styles.remainingBadgeLabel}>LEFT</Text>
        </View>
      </View>

      <View style={styles.stampZone} pointerEvents="none">
        <Animated.View style={[styles.stamp, nopeStampStyle]}>
          <Text style={[styles.stampText, styles.nopeStampText]}>NOPE</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, likeStampStyle]}>
          <Text style={[styles.stampText, styles.likeStampText]}>LIKE</Text>
        </Animated.View>
      </View>

      <View
        style={[
          styles.stack,
          { height: cardHeight, transform: [{ translateY: -stackBottomPad }] },
        ]}
      >
        {stackMovies
          .map((movie, stackIndex) => ({ movie, stackIndex }))
          .filter(({ stackIndex }) => stackIndex > 0)
          .reverse()
          .map(({ movie, stackIndex }) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              index={stackIndex}
              active={false}
            />
          ))}
        {activeMovie && (
          <MovieCard
            ref={activeCardRef}
            key={activeMovie.id}
            movie={activeMovie}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            index={0}
            active
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onPress={handleCardPress}
            swipeX={swipeX}
          />
        )}
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={styles.actionButton}
          onPress={handleDislikePress}
          disabled={!activeMovie}
        >
          <X size={26} color={colors.textPrimary} strokeWidth={2.4} />
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={handleLikePress}
          disabled={!activeMovie}
        >
          <Heart size={24} color={colors.success} fill={colors.success} />
        </Pressable>
      </View>

      <Pressable
        style={styles.randomPickLink}
        onPress={handleRandomPick}
        disabled={!activeMovie}
      >
        <Shuffle size={14} color={colors.textSecondary} strokeWidth={2.2} />
        <Text style={styles.randomPickText}>Pick One For Me</Text>
      </Pressable>
    </SafeAreaView>
  );
};

const createStyles = (colors, bg) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      zIndex: 30,
      elevation: 30,
    },
    remainingBadge: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.xs,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      height: 40,
      borderRadius: radius.sm,
    },
    remainingBadgeCount: {
      ...typography.title,
      color: colors.textPrimary,
    },
    remainingBadgeLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    roundLabel: {
      ...typography.label,
      color: colors.textPrimary,
    },
    progress: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: 4,
    },
    // Elevated above the header (30), stack fade (20), and cards (10-13) so
    // the stamps are always the topmost thing on screen while dragging.
    stampZone: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.xs,
      height: 64,
      zIndex: 40,
      elevation: 40,
    },
    stamp: {
      position: "absolute",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    stampText: {
      ...typography.hero,
      fontSize: 27,
      letterSpacing: 3,
    },
    likeStampText: {
      color: colors.success,
    },
    nopeStampText: {
      color: colors.textPrimary,
    },
    stack: {
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-end",
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.xl,
      paddingTop: spacing.md,
    },
    actionButton: {
      width: 60,
      height: 60,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    randomPickLink: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: 4,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      padding: spacing.xs,
    },
    randomPickText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    chooseHeading: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: 4,
    },
    chooseBody: {
      flex: 1,
      justifyContent: "center",
    },
    carouselWrap: {
      alignItems: "center",
    },
    carouselCounter: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    carouselButtons: {
      width: "100%",
      paddingHorizontal: spacing.xl,
      marginTop: spacing.xl,
      gap: spacing.sm,
    },
    carouselButton: {
      width: "100%",
    },
    transitionContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
    },
    transitionMessage: {
      ...typography.hero,
      color: colors.textPrimary,
      textAlign: "center",
    },
    transitionCounts: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.md,
      textAlign: "center",
    },
    transitionButton: {
      width: "100%",
      marginTop: spacing.xl,
    },
    finalContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
    },
    finalIconBadge: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    finalEyebrow: {
      ...typography.label,
      color: colors.textPrimary,
      letterSpacing: 2,
      marginTop: spacing.sm,
    },
    finalPoster: {
      width: 180,
      aspectRatio: 2 / 3,
      marginTop: spacing.md,
    },
    finalTitle: {
      ...typography.hero,
      color: colors.textPrimary,
      marginTop: spacing.md,
      textAlign: "center",
    },
    finalMeta: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 4,
    },
    finalSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    buttons: {
      width: "100%",
      marginTop: spacing.xl,
      gap: spacing.sm,
    },
    button: {
      width: "100%",
    },
  });

export default SwipeScreen;

import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Dices, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { BackButton } from "../components/BackButton";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { StorySwipeCard } from "../components/StorySwipeCard";
import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { showToast } from "../store/toastStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";

// Swipe in story mode, like Instagram Stories: each movie fills the screen
// (its poster over a blurred copy of itself), with story bars across the
// top for the round. Swipe up to keep, down to pass — or use the buttons.
// Rounds narrow the pile; the last two or three go head to head; the
// winner gets the whole screen.

const TRANSITION_AUTO_ADVANCE_MS = 2600;
const CARDS_RENDERED = 3; // front card plus a couple waiting behind
const POSTER_ASPECT = 1.5;

// The movie's poster, blurred, filling the screen and fading into the page.
const Backdrop = ({ uri, colors }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {!!uri && (
      <Animated.View
        key={uri}
        entering={FadeIn.duration(300)}
        style={StyleSheet.absoluteFill}
      >
        <Image
          source={{ uri }}
          blurRadius={30}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    )}
    <LinearGradient
      colors={[
        `${colors.background}99`,
        `${colors.background}CC`,
        colors.background,
      ]}
      locations={[0, 0.55, 1]}
      style={StyleSheet.absoluteFill}
    />
  </View>
);

// Story bars: one per movie in the round — seen ones and the current one
// lit, the rest dim.
const StoryBars = ({ count, index, styles }) => (
  <View style={styles.bars}>
    {Array.from({ length: count }, (_, barIndex) => (
      <View
        key={barIndex}
        style={[styles.bar, barIndex <= index && styles.barLit]}
      />
    ))}
  </View>
);

// The last two or three, decided head to head: tap the one you'd rather
// watch; the winner stays in for the next duel until one is left.
const Duels = ({ movies, onDecided, onDetails, styles }) => {
  const { width } = useWindowDimensions();
  const [queue, setQueue] = useState(movies);
  const totalDuels = movies.length - 1;
  const duelNumber = movies.length - queue.length + 1;
  const posterWidth = Math.floor((width - spacing.md * 2 - spacing.lg) / 2);
  const pair = queue.slice(0, 2);

  const pick = (winner) => {
    const next = [winner, ...queue.slice(2)];
    if (next.length === 1) onDecided(winner);
    else setQueue(next);
  };

  return (
    <Animated.View
      key={pair.map((movie) => movie.id).join("-")}
      entering={FadeIn.duration(260)}
      style={styles.duel}
    >
      <Text style={styles.caption}>
        {t("Duel {current} of {total}", {
          current: duelNumber,
          total: totalDuels,
        })}
      </Text>
      <Text style={styles.duelHeading}>
        {t("Which would you rather watch?")}
      </Text>
      <View style={styles.duelRow}>
        {pair.map((movie, sideIndex) => (
          <View
            key={movie.id}
            style={[styles.duelSide, { width: posterWidth }]}
          >
            <Pressable
              onPress={() => pick(movie)}
              style={({ pressed }) => pressed && styles.pressed}
              accessibilityLabel={t("Choose {title}", { title: movie.title })}
            >
              <MoviePoster
                uri={movie.poster}
                style={{
                  width: posterWidth,
                  height: posterWidth * POSTER_ASPECT,
                }}
              />
            </Pressable>
            <Text style={styles.duelTitle} numberOfLines={2}>
              {movie.title}
            </Text>
            <Text style={styles.meta}>
              {movie.year} · {t(movie.genres[0])}
            </Text>
            <Pressable onPress={() => onDetails(movie)} hitSlop={8}>
              <Text style={styles.link}>{t("Details")}</Text>
            </Pressable>
            {sideIndex === 0 && (
              <View style={styles.orBadge} pointerEvents="none">
                <Text style={styles.orText}>{t("or")}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
      <Text style={styles.hint}>{t("Tap the one you'd rather watch")}</Text>
    </Animated.View>
  );
};

export const SwipeScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const sessionActive = useSessionStore((state) => state.sessionActive);
  const phase = useSessionStore((state) => state.phase);
  const originalMovies = useSessionStore((state) => state.originalMovies);
  const roundNumber = useSessionStore((state) => state.roundNumber);
  const roundMovies = useSessionStore((state) => state.roundMovies);
  const roundIndex = useSessionStore((state) => state.roundIndex);
  const roundKept = useSessionStore((state) => state.roundKept);
  const transition = useSessionStore((state) => state.transition);
  const pendingNextMovies = useSessionStore((state) => state.pendingNextMovies);
  const finalMovie = useSessionStore((state) => state.finalMovie);
  const swipe = useSessionStore((state) => state.swipe);
  const continueToNextRound = useSessionStore(
    (state) => state.continueToNextRound,
  );
  const chooseFinal = useSessionStore((state) => state.chooseFinal);
  const endSession = useSessionStore((state) => state.endSession);
  const isFinalMoviePicked = useMovieStore(
    (state) => !!finalMovie && state.pickedMovie === finalMovie.id,
  );
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);

  // The card fills the stage, measured — no guessed heights, so it never
  // crowds the buttons on a small phone.
  const [stage, setStage] = useState(null);
  const cardSize = stage
    ? (() => {
        const maxWidth = stage.width - spacing.md * 2;
        const maxHeight = stage.height - spacing.md;
        const cardWidth = Math.min(maxWidth, maxHeight / POSTER_ASPECT);
        return {
          width: Math.floor(cardWidth),
          height: Math.floor(cardWidth * POSTER_ASPECT),
        };
      })()
    : null;

  const activeMovie = roundMovies[roundIndex];
  const waiting = roundMovies.slice(roundIndex, roundIndex + CARDS_RENDERED);
  const frontCardRef = useRef(null);

  const handleKeep = useCallback(() => swipe("right"), [swipe]);
  const handlePass = useCallback(() => swipe("left"), [swipe]);

  // Let fate pick: a winner straight out of what's left in this round.
  const handleFate = useCallback(() => {
    const left = roundMovies.slice(roundIndex);
    if (left.length === 0) return;
    chooseFinal(left[Math.floor(Math.random() * left.length)]);
  }, [roundMovies, roundIndex, chooseFinal]);

  const openDetails = useCallback(
    (movie) => navigation.navigate("MovieDetails", { movieId: movie.id }),
    [navigation],
  );

  // Leaving mid-session keeps it to resume later; leaving the result ends it,
  // so the next Swipe starts fresh instead of reopening an old winner.
  const handleBack = useCallback(() => {
    if (phase === "final") endSession();
    navigation.goBack();
  }, [phase, endSession, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!sessionActive) navigation.replace("Preferences");
    }, [sessionActive, navigation]),
  );

  // Android's hardware back goes through the same exit as the button.
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

  const topBar = (title, right) => (
    <View style={styles.topBar}>
      <BackButton onPress={handleBack} />
      <Text style={styles.topTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.topRight} numberOfLines={1}>
        {right}
      </Text>
    </View>
  );

  // ---------- Between rounds ----------
  if (phase === "transition" && transition) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        <Backdrop uri={pendingNextMovies[0]?.poster} colors={colors} />
        {topBar(t("Round {number}", { number: roundNumber }), "")}
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.centerBody}
        >
          <Text style={styles.caption}>
            {t("Round {number}", { number: roundNumber + 1 })}
          </Text>
          <Text style={styles.bigTitle}>
            {t("{count} left", { count: transition.toCount })}
          </Text>
          <Text style={styles.message}>{t(transition.message)}</Text>
          <View style={styles.posterStrip}>
            {pendingNextMovies.slice(0, 6).map((movie) => (
              <MoviePoster
                key={movie.id}
                uri={movie.poster}
                style={styles.stripPoster}
              />
            ))}
          </View>
          <PrimaryButton
            label={t("Next round")}
            onPress={continueToNextRound}
            style={styles.fullButton}
          />
        </Animated.View>
      </View>
    );
  }

  // ---------- The final few, head to head ----------
  if (phase === "choose") {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        <Backdrop uri={roundMovies[0]?.poster} colors={colors} />
        {topBar(
          roundMovies.length === 2 ? t("Final two") : t("Final three"),
          "",
        )}
        <Duels
          key={roundMovies.map((movie) => movie.id).join("-")}
          movies={roundMovies}
          onDecided={chooseFinal}
          onDetails={openDetails}
          styles={styles}
        />
      </View>
    );
  }

  // ---------- The winner ----------
  if (phase === "final" && finalMovie) {
    // Stays here (no jump to Home); the toast confirms it and the button
    // flips to a done state.
    const makeTonightsPick = () => {
      if (!isFinalMoviePicked) togglePickedMovie(finalMovie.id);
      showToast(t("{title} is tonight's pick", { title: finalMovie.title }), {
        tone: "success",
      });
    };

    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        <Backdrop uri={finalMovie.poster} colors={colors} />
        {topBar(t("It's decided"), "")}
        <Animated.View
          entering={FadeIn.duration(360)}
          style={styles.centerBody}
        >
          <Pressable
            onPress={() => openDetails(finalMovie)}
            accessibilityLabel={t("Open {title}", { title: finalMovie.title })}
          >
            <MoviePoster uri={finalMovie.poster} style={styles.winnerPoster} />
          </Pressable>
          <Text style={styles.caption}>{t("Tonight's pick")}</Text>
          <Text style={styles.bigTitle} numberOfLines={2}>
            {finalMovie.title}
          </Text>
          <Text style={styles.meta}>
            {finalMovie.year} · {formatRuntime(finalMovie.runtime)} · IMDb{" "}
            {finalMovie.rating.toFixed(1)}
          </Text>
          <Text style={styles.message}>
            {t("Picked from {count} movies", { count: originalMovies.length })}
          </Text>
        </Animated.View>
        <View
          style={[
            styles.actionsStack,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <PrimaryButton
            label={
              isFinalMoviePicked
                ? t("Tonight's pick ✓")
                : t("Make it tonight's pick")
            }
            variant={isFinalMoviePicked ? "secondary" : "primary"}
            disabled={isFinalMoviePicked}
            onPress={makeTonightsPick}
          />
          <View style={styles.actionsRow}>
            <PrimaryButton
              label={t("Details")}
              variant="secondary"
              onPress={() => openDetails(finalMovie)}
              style={styles.flex}
            />
            <PrimaryButton
              label={t("Start over")}
              variant="secondary"
              onPress={() => {
                endSession();
                navigation.replace("Preferences");
              }}
              style={styles.flex}
            />
          </View>
        </View>
      </View>
    );
  }

  // ---------- Swiping a round ----------
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <Backdrop uri={activeMovie?.poster} colors={colors} />
      <StoryBars
        count={roundMovies.length}
        index={roundIndex}
        styles={styles}
      />
      {topBar(
        t("Round {number}", { number: roundNumber }),
        t("{count} kept", { count: roundKept.length }),
      )}

      <View
        style={styles.stage}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setStage({ width, height });
        }}
      >
        {cardSize &&
          [...waiting].reverse().map((movie) => {
            const front = movie.id === activeMovie?.id;
            return (
              <StorySwipeCard
                key={movie.id}
                ref={front ? frontCardRef : undefined}
                movie={movie}
                width={cardSize.width}
                height={cardSize.height}
                front={front}
                onKeep={handleKeep}
                onPass={handlePass}
                onPress={() => openDetails(movie)}
              />
            );
          })}
      </View>

      {activeMovie && (
        <View style={styles.info}>
          <Text style={styles.infoTitle} numberOfLines={1}>
            {activeMovie.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {activeMovie.year} · {t(activeMovie.genres[0])} ·{" "}
            {formatRuntime(activeMovie.runtime)}
          </Text>
          {roundNumber === 1 && roundIndex === 0 && (
            <Text style={styles.hint}>
              {t("Swipe up to keep · down to pass")}
            </Text>
          )}
        </View>
      )}

      <View
        style={[styles.controls, { paddingBottom: insets.bottom + spacing.md }]}
      >
        {[
          {
            key: "pass",
            label: t("Pass"),
            Icon: X,
            onPress: () => frontCardRef.current?.trigger("pass"),
          },
          { key: "fate", label: t("Fate"), Icon: Dices, onPress: handleFate },
          {
            key: "keep",
            label: t("Keep"),
            Icon: Check,
            onPress: () => frontCardRef.current?.trigger("keep"),
          },
        ].map(({ key, label, Icon, onPress }) => (
          <View key={key} style={styles.control}>
            <Pressable
              style={({ pressed }) => [
                styles.controlButton,
                key === "keep" && styles.controlKeep,
                pressed && styles.pressed,
              ]}
              onPress={onPress}
              disabled={!activeMovie}
              accessibilityLabel={label}
            >
              <Icon
                size={24}
                strokeWidth={2}
                color={
                  key === "keep" ? colors.selectedText : colors.textPrimary
                }
              />
            </Pressable>
            <Text style={styles.controlLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    pressed: {
      opacity: 0.7,
    },
    flex: {
      flex: 1,
    },

    // Story bars + top row
    bars: {
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: spacing.md,
    },
    bar: {
      flex: 1,
      height: 3,
      backgroundColor: colors.surfaceSoft,
    },
    barLit: {
      backgroundColor: colors.textPrimary,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      height: 48,
    },
    topTitle: {
      ...typography.title,
      fontSize: 17,
      flex: 1,
      color: colors.textPrimary,
    },
    topRight: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },

    // Swiping
    stage: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    info: {
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: 2,
    },
    infoTitle: {
      ...typography.title,
      fontSize: 19,
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    controls: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.xl,
      paddingTop: spacing.md,
    },
    control: {
      alignItems: "center",
      gap: 6,
    },
    // Square filled boxes; Keep is the filled (main) one.
    controlButton: {
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    controlKeep: {
      backgroundColor: colors.selected,
    },
    controlLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },

    // Between rounds / winner
    centerBody: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
    },
    caption: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
    },
    bigTitle: {
      ...typography.display,
      fontSize: 30,
      lineHeight: 36,
      color: colors.textPrimary,
      textAlign: "center",
    },
    message: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    posterStrip: {
      flexDirection: "row",
      gap: 2,
      marginTop: spacing.lg,
    },
    stripPoster: {
      width: 48,
      height: 72,
    },
    fullButton: {
      alignSelf: "stretch",
      marginTop: spacing.xl,
    },
    winnerPoster: {
      width: 176,
      height: 264,
      marginBottom: spacing.md,
    },
    actionsStack: {
      paddingHorizontal: spacing.md,
      gap: 2,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 2,
    },

    // Duels
    duel: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    duelHeading: {
      ...typography.title,
      fontSize: 20,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },
    duelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    duelSide: {
      alignItems: "center",
    },
    duelTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.sm,
    },
    link: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    // "or" sits in the gap between the two posters.
    orBadge: {
      position: "absolute",
      top: "30%",
      end: -(spacing.lg / 2) - 16,
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    orText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
  });

export default SwipeScreen;

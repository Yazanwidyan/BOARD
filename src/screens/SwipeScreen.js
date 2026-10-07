import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
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
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { DvdSwipeCard } from "../components/DvdSwipeCard";
import { MarqueeSign } from "../components/MarqueeSign";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { DieArt, KeepArt, PassArt, VsBadge } from "../components/SwipeArt";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { showToast } from "../store/toastStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";

// Swipe as a "video store run": each movie is a DVD case pulled off the
// shelf — Keep drops it in your basket, Pass puts it back. Each round is an
// aisle; between aisles you see what you're holding; the last two or three
// face off in head-to-head duels; the winner goes up on the marquee.

const TRANSITION_AUTO_ADVANCE_MS = 2600;
const CASE_ASPECT = 1.42;
const BASKET_SHOWN = 7;
// Space the fixed parts of the swiping screen take, for sizing the case.
const CHROME_HEIGHT = 56 + 26 + 58 + 104 + 72 + spacing.lg * 2;

const FadeInView = ({ children, style, delay = 0 }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 380 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 380 }));
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
};

// A small static DVD case (poster in a black case with a hinge strip).
const MiniCase = ({ movie, width, style, styles }) => (
  <View
    style={[styles.miniCase, { width, height: width * CASE_ASPECT }, style]}
  >
    <View style={styles.miniHinge} />
    <MoviePoster uri={movie.poster} style={styles.miniCover} />
  </View>
);

// Progress for the aisle as a row of spines — kept ones lit green, passed
// ones dim, the current one white, the rest still dark on the shelf.
const AisleSpines = ({ count, index, keptIds, movies, styles, colors }) => (
  <View style={styles.spines}>
    {Array.from({ length: count }, (_, spineIndex) => {
      const movie = movies[spineIndex];
      const backgroundColor =
        spineIndex === index
          ? colors.textPrimary
          : spineIndex < index
            ? keptIds.has(movie?.id)
              ? colors.success
              : "rgba(255, 255, 255, 0.16)"
            : "#2A2B44";
      return (
        <View key={spineIndex} style={[styles.spine, { backgroundColor }]} />
      );
    })}
  </View>
);

// KEEP / PASS as price stickers — a rounded tag with a punched hole.
const PriceSticker = ({ label, color, rotate, style, styles }) => (
  <Animated.View
    style={[
      styles.sticker,
      { backgroundColor: color, transform: [{ rotate }] },
      style,
    ]}
  >
    <View style={styles.stickerHole} />
    <Text style={styles.stickerText}>{label}</Text>
  </Animated.View>
);

// The basket tray along the bottom: the cases you've kept this aisle.
const BasketTray = ({ movies, styles, colors }) => (
  <View style={styles.basket}>
    <KeepArt size={28} color={colors.textSecondary} />
    {movies.length === 0 ? (
      <Text style={styles.basketEmpty}>Your basket is empty</Text>
    ) : (
      <>
        <View style={styles.basketCases}>
          {movies.slice(-BASKET_SHOWN).map((movie, index) => (
            <MiniCase
              key={movie.id}
              movie={movie}
              width={24}
              style={[
                index > 0 && styles.basketOverlap,
                { transform: [{ rotate: `${(index % 3) * 4 - 4}deg` }] },
              ]}
              styles={styles}
            />
          ))}
        </View>
        <Text style={styles.basketCount}>{movies.length} kept</Text>
      </>
    )}
  </View>
);

// The last two or three, decided in 1-vs-1 duels: tap the one you'd rather
// watch; the winner stays for the next duel until one is left.
const Duels = ({ movies, onDecided, onDetails, styles, colors }) => {
  const { width } = useWindowDimensions();
  const [queue, setQueue] = useState(movies);
  const totalDuels = movies.length - 1;
  const duelNumber = movies.length - queue.length + 1;
  const caseWidth = Math.min(160, (width - spacing.md * 2 - 44) / 2);
  const pair = queue.slice(0, 2);

  const pick = (winner) => {
    const next = [winner, ...queue.slice(2)];
    if (next.length === 1) onDecided(winner);
    else setQueue(next);
  };

  return (
    <FadeInView
      key={pair.map((movie) => movie.id).join("-")}
      style={styles.duel}
    >
      <Text style={styles.duelCount}>
        DUEL {duelNumber} OF {totalDuels}
      </Text>
      <Text style={styles.duelHeading}>Which would you rather watch?</Text>
      <View style={styles.duelRow}>
        {pair.map((movie) => (
          <View key={movie.id} style={[styles.duelSide, { width: caseWidth }]}>
            <Pressable
              onPress={() => pick(movie)}
              style={({ pressed }) => pressed && styles.duelPressed}
              accessibilityLabel={`Choose ${movie.title}`}
            >
              <MiniCase movie={movie} width={caseWidth} styles={styles} />
            </Pressable>
            <Text style={styles.duelTitle} numberOfLines={2}>
              {movie.title}
            </Text>
            <Text style={styles.duelMeta}>
              {movie.year} · {movie.genres[0]}
            </Text>
            <Pressable onPress={() => onDetails(movie)} hitSlop={8}>
              <Text style={styles.duelDetails}>Details ›</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.vs} pointerEvents="none">
          <VsBadge color={colors.rating} textColor="#5A3F0C" />
        </View>
      </View>
      <Text style={styles.duelHint}>Tap a case to choose it</Text>
    </FadeInView>
  );
};

export const SwipeScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width, height } = useWindowDimensions();
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

  // The case fills what's left after the header, spines, info, buttons and
  // basket.
  const cardHeight = Math.max(
    220,
    Math.min(
      height - insets.top - insets.bottom - CHROME_HEIGHT,
      (width - 96) * CASE_ASPECT,
    ),
  );
  const cardWidth = cardHeight / CASE_ASPECT;
  // From the case's centre down to the basket.
  const keepDropY = cardHeight / 2 + 58 + 104 + 36 + spacing.lg;

  const activeMovie = roundMovies[roundIndex];
  const stackMovies = roundMovies.slice(roundIndex);
  const keptIds = new Set(roundKept.map((movie) => movie.id));

  // Owned here so the KEEP / PASS stickers above the stack can follow the
  // active case's drag.
  const swipeX = useSharedValue(0);
  const swipeThreshold = width * 0.28;

  useEffect(() => {
    swipeX.value = 0;
  }, [activeMovie?.id, swipeX]);

  const keepStickerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      swipeX.value,
      [10, swipeThreshold],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const passStickerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      swipeX.value,
      [-swipeThreshold, -10],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const handleKeep = useCallback(() => swipe("right"), [swipe]);
  const handlePass = useCallback(() => swipe("left"), [swipe]);

  // Buttons play the same exit as a drag.
  const activeCardRef = useRef(null);
  const handleKeepPress = useCallback(() => {
    activeCardRef.current?.triggerSwipe("right");
  }, []);
  const handlePassPress = useCallback(() => {
    activeCardRef.current?.triggerSwipe("left");
  }, []);

  // Let fate pick: a winner straight out of what's left in this aisle.
  const handleFate = useCallback(() => {
    if (stackMovies.length === 0) return;
    chooseFinal(stackMovies[Math.floor(Math.random() * stackMovies.length)]);
  }, [stackMovies, chooseFinal]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const openDetails = useCallback(
    (movie) => navigation.navigate("MovieDetails", { movieId: movie.id }),
    [navigation],
  );

  useFocusEffect(
    useCallback(() => {
      if (!sessionActive) navigation.replace("Preferences");
    }, [sessionActive, navigation]),
  );

  // The edge swipe-back is off at the navigator level (an accidental swipe
  // shouldn't derail a session); Android's hardware back goes through the
  // same intentional exit as the button.
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

  const header = (title, subtitle, onBack = handleBack) => (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <BackButton onPress={onBack} />
      <View style={styles.headerText} pointerEvents="none">
        <Text style={styles.headerTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );

  // ---------- Between aisles ----------
  if (phase === "transition" && transition) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.card, colors.background]}
          style={StyleSheet.absoluteFill}
        />
        {header(`AISLE ${roundNumber}`, "Done")}
        <FadeInView style={styles.transitionBody}>
          <Text style={styles.transitionEyebrow}>
            NEXT · AISLE {roundNumber + 1}
          </Text>
          <Text style={styles.transitionTitle}>
            You&apos;re holding {transition.toCount}
          </Text>
          <Text style={styles.transitionMessage}>{transition.message}</Text>
          <View style={styles.transitionCases}>
            {pendingNextMovies.slice(0, 6).map((movie, index, list) => (
              <MiniCase
                key={movie.id}
                movie={movie}
                width={54}
                style={[
                  index > 0 && styles.transitionOverlap,
                  {
                    zIndex: list.length - index,
                    transform: [
                      { rotate: `${(index - (list.length - 1) / 2) * 6}deg` },
                    ],
                  },
                ]}
                styles={styles}
              />
            ))}
          </View>
          <Text style={styles.transitionCounts}>
            {transition.fromCount} looked at · {transition.toCount} in the
            basket
          </Text>
          <PrimaryButton
            label="Next aisle"
            onPress={continueToNextRound}
            style={styles.transitionButton}
          />
        </FadeInView>
      </View>
    );
  }

  // ---------- The final few: duels ----------
  if (phase === "choose") {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.card, colors.background]}
          style={StyleSheet.absoluteFill}
        />
        {header(
          roundMovies.length === 2 ? "FINAL TWO" : "FINAL THREE",
          `Aisle ${roundNumber}`,
        )}
        <Duels
          key={roundMovies.map((movie) => movie.id).join("-")}
          movies={roundMovies}
          onDecided={chooseFinal}
          onDetails={openDetails}
          styles={styles}
          colors={colors}
        />
      </View>
    );
  }

  // ---------- The winner, on the marquee ----------
  if (phase === "final" && finalMovie) {
    // Stays here (no jump to Home); the toast confirms it and the button
    // flips to a done state.
    const makeTonightsPick = () => {
      if (!isFinalMoviePicked) togglePickedMovie(finalMovie.id);
      showToast(`${finalMovie.title} is tonight's pick`, { tone: "success" });
    };

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.card, colors.background]}
          style={StyleSheet.absoluteFill}
        />
        {header("IT'S DECIDED", null, () => {
          endSession();
          navigation.goBack();
        })}
        <FadeInView style={styles.finalBody}>
          <MarqueeSign
            label="NOW SHOWING · TONIGHT"
            backdropUri={finalMovie.poster}
          >
            <View style={styles.finalInner}>
              <Pressable
                onPress={() => openDetails(finalMovie)}
                accessibilityLabel={`Open ${finalMovie.title}`}
              >
                <MiniCase movie={finalMovie} width={132} styles={styles} />
              </Pressable>
              <Text style={styles.finalTitle} numberOfLines={2}>
                {finalMovie.title}
              </Text>
              <Text style={styles.finalMeta}>
                {finalMovie.year} · {formatRuntime(finalMovie.runtime)} · IMDb{" "}
                {finalMovie.rating.toFixed(1)}
              </Text>
              <Text style={styles.finalFrom}>
                Picked from {originalMovies.length} movies
              </Text>
            </View>
          </MarqueeSign>
        </FadeInView>

        <View
          style={[
            styles.finalActions,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <PrimaryButton
            label={
              isFinalMoviePicked ? "Tonight's pick" : "Make it tonight's pick"
            }
            variant={isFinalMoviePicked ? "secondary" : "primary"}
            disabled={isFinalMoviePicked}
            onPress={makeTonightsPick}
          />
          <View style={styles.finalSecondaryRow}>
            <PrimaryButton
              label="Details"
              variant="secondary"
              onPress={() => openDetails(finalMovie)}
              style={styles.finalSecondaryButton}
            />
            <PrimaryButton
              label="Start over"
              variant="secondary"
              onPress={() => {
                endSession();
                navigation.replace("Preferences");
              }}
              style={styles.finalSecondaryButton}
            />
          </View>
        </View>
      </View>
    );
  }

  // ---------- Swiping an aisle ----------
  return (
    <View style={styles.container}>
      {header(
        `AISLE ${roundNumber}`,
        `${Math.min(roundIndex + 1, roundMovies.length)} of ${roundMovies.length}`,
      )}
      <AisleSpines
        count={roundMovies.length}
        index={roundIndex}
        keptIds={keptIds}
        movies={roundMovies}
        styles={styles}
        colors={colors}
      />

      <View style={[styles.stage, { height: cardHeight + spacing.lg }]}>
        <View style={[styles.stack, { width: cardWidth, height: cardHeight }]}>
          {stackMovies
            .map((movie, stackIndex) => ({ movie, stackIndex }))
            .filter(({ stackIndex }) => stackIndex > 0 && stackIndex < 6)
            .reverse()
            .map(({ movie, stackIndex }) => (
              <DvdSwipeCard
                key={movie.id}
                movie={movie}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                index={stackIndex}
              />
            ))}
          {activeMovie && (
            <DvdSwipeCard
              ref={activeCardRef}
              key={activeMovie.id}
              movie={activeMovie}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              index={0}
              active
              keepDropY={keepDropY}
              onSwipeLeft={handlePass}
              onSwipeRight={handleKeep}
              onPress={() => openDetails(activeMovie)}
              swipeX={swipeX}
            />
          )}
        </View>

        <View style={styles.stickers} pointerEvents="none">
          <PriceSticker
            label="PASS"
            color={colors.danger}
            rotate="-10deg"
            style={passStickerStyle}
            styles={styles}
          />
          <PriceSticker
            label="KEEP"
            color={colors.success}
            rotate="10deg"
            style={keepStickerStyle}
            styles={styles}
          />
        </View>
      </View>

      {activeMovie && (
        <View style={styles.info}>
          <Text style={styles.infoTitle} numberOfLines={1}>
            {activeMovie.title}
          </Text>
          <Text style={styles.infoMeta} numberOfLines={1}>
            {activeMovie.year} · {activeMovie.genres[0]} ·{" "}
            {formatRuntime(activeMovie.runtime)} · {activeMovie.director}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <View style={styles.action}>
          <Pressable
            style={({ pressed }) => [
              styles.bigButton,
              styles.passButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handlePassPress}
            disabled={!activeMovie}
            accessibilityLabel="Pass"
          >
            <PassArt size={32} color={colors.danger} />
          </Pressable>
          <Text style={styles.actionLabel}>Pass</Text>
        </View>
        <View style={styles.action}>
          <Pressable
            style={({ pressed }) => [
              styles.smallButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleFate}
            disabled={!activeMovie}
            accessibilityLabel="Let fate pick"
          >
            <DieArt size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.actionLabel}>Fate</Text>
        </View>
        <View style={styles.action}>
          <Pressable
            style={({ pressed }) => [
              styles.bigButton,
              styles.keepButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleKeepPress}
            disabled={!activeMovie}
            accessibilityLabel="Keep"
          >
            <KeepArt size={32} color={colors.success} />
          </Pressable>
          <Text style={styles.actionLabel}>Keep</Text>
        </View>
      </View>

      <View style={{ paddingBottom: insets.bottom + spacing.sm }}>
        <BasketTray movies={roundKept} styles={styles} colors={colors} />
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

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerText: {
      flex: 1,
      alignItems: "center",
    },
    headerTitle: {
      ...typography.label,
      color: colors.textPrimary,
      letterSpacing: 2,
    },
    headerSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 1,
    },
    headerSpacer: {
      width: 40,
    },

    // Aisle progress spines
    spines: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 4,
      paddingHorizontal: spacing.lg,
      height: 18,
      alignItems: "flex-end",
    },
    spine: {
      flex: 1,
      maxWidth: 14,
      height: 16,
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
    },

    // Swiping stage
    stage: {
      alignItems: "center",
      justifyContent: "flex-end",
      marginTop: spacing.lg,
    },
    stack: {
      alignItems: "center",
      justifyContent: "center",
    },
    stickers: {
      position: "absolute",
      top: spacing.xs,
      left: spacing.lg,
      right: spacing.lg,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    sticker: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingLeft: 10,
      paddingRight: 16,
      paddingVertical: 7,
      borderRadius: 10,
      shadowColor: "#000000",
      shadowOpacity: 0.35,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
    },
    stickerHole: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.background,
    },
    stickerText: {
      ...typography.hero,
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: 3,
      color: "#FFFFFF",
    },

    // Active movie
    info: {
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      marginTop: spacing.md,
      height: 46,
    },
    infoTitle: {
      ...typography.title,
      fontSize: 19,
      color: colors.textPrimary,
    },
    infoMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },

    // Buttons
    actions: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "center",
      gap: spacing.xl,
      marginTop: spacing.md,
    },
    action: {
      alignItems: "center",
      gap: 6,
    },
    bigButton: {
      width: 66,
      height: 66,
      borderRadius: 33,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 1.5,
    },
    passButton: {
      borderColor: `${colors.danger}88`,
    },
    keepButton: {
      borderColor: `${colors.success}88`,
    },
    smallButton: {
      width: 48,
      height: 48,
      marginTop: 9,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonPressed: {
      transform: [{ scale: 0.94 }],
    },
    actionLabel: {
      ...typography.label,
      fontSize: 11,
      color: colors.textSecondary,
    },

    // Basket
    basket: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 56,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    basketCases: {
      flexDirection: "row",
      flex: 1,
    },
    basketOverlap: {
      marginLeft: -8,
    },
    basketCount: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.success,
    },
    basketEmpty: {
      ...typography.caption,
      flex: 1,
      color: colors.textMuted,
    },

    // Mini DVD case
    miniCase: {
      flexDirection: "row",
      padding: 2,
      paddingLeft: 0,
      borderRadius: 3,
      backgroundColor: "#0D0D12",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
      shadowColor: "#000000",
      shadowOpacity: 0.4,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    miniHinge: {
      width: "9%",
      minWidth: 3,
    },
    miniCover: {
      flex: 1,
      height: "100%",
    },

    // Between aisles
    transitionBody: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    transitionEyebrow: {
      ...typography.label,
      color: colors.accentLight,
      letterSpacing: 2,
    },
    transitionTitle: {
      ...typography.hero,
      fontSize: 30,
      lineHeight: 36,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    transitionMessage: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    transitionCases: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: spacing.xl,
    },
    transitionOverlap: {
      marginLeft: -18,
    },
    transitionCounts: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.lg,
    },
    transitionButton: {
      alignSelf: "stretch",
      marginTop: spacing.xl,
    },

    // Duels
    duel: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    duelCount: {
      ...typography.label,
      color: colors.accentLight,
      letterSpacing: 2,
      textAlign: "center",
    },
    duelHeading: {
      ...typography.title,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
    },
    duelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    duelSide: {
      alignItems: "center",
    },
    duelPressed: {
      transform: [{ scale: 0.96 }],
    },
    duelTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.sm + 2,
    },
    duelMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    duelDetails: {
      ...typography.label,
      color: colors.accentLight,
      marginTop: spacing.sm,
    },
    vs: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "28%",
      alignItems: "center",
    },
    duelHint: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xl,
    },

    // Winner
    finalBody: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    finalInner: {
      alignItems: "center",
      paddingBottom: spacing.xs,
    },
    finalTitle: {
      ...typography.hero,
      fontSize: 26,
      lineHeight: 32,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.md,
    },
    finalMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    finalFrom: {
      ...typography.label,
      color: "#FFE7A3",
      letterSpacing: 1,
      marginTop: spacing.sm,
    },
    finalActions: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    finalSecondaryRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    finalSecondaryButton: {
      flex: 1,
    },
  });

export default SwipeScreen;

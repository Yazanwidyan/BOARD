import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { RotateCw, Shuffle } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Text } from "../components/AppText";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { HeaderIconButton, StackHeader } from "../components/ScreenHeader";
import { t } from "../i18n";
import { generateRecommendations } from "../services/recommendations";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { useUserStore } from "../store/userStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { bucketListIds, formatRuntime } from "../utils/movieFilters";

// Spin as a full-screen slot machine reel: the candidates' posters run in a
// vertical strip filling the whole screen under the header — the middle
// slot as big as the screen allows, neighbours peeking from the top and
// bottom edges. Spin sends it racing (tap again any time for a fresh kick);
// it slows and clicks onto the winner, a white frame lights around it, and
// the result and buttons float over the bottom.

const CANDIDATE_COUNT = 8;
const GAP = 2;
const MIN_PEEK = 64; // at least this much of each neighbour shows
const BOTTOM_ROOM = 150; // the floating result + buttons
const REPEATS = 8; // copies of the list in the strip — room to race
const START_CYCLE = 1; // each spin starts from this copy...
const SPIN_CYCLES = 5; // ...and runs this many copies further
const SPIN_DURATION_MS = 4200;

// Reel size from the space it has: the slot as wide as fits (with room for
// the markers and the neighbours above/below), 2:3 like a poster.
const geometryFor = (width, height) => {
  const usable = height - BOTTOM_ROOM;
  const itemWidth = Math.floor(
    Math.min(width * 0.74, (usable - MIN_PEEK * 2) / 1.5),
  );
  const itemHeight = Math.floor(itemWidth * 1.5);
  return {
    width,
    height,
    itemWidth,
    itemHeight,
    step: itemHeight + GAP,
    // The slot is centred in the space above the floating controls.
    center: usable / 2,
  };
};

// Watchlist first, never something already watched.
const pickCandidates = (preferences, bucketList) =>
  generateRecommendations(
    preferences,
    CANDIDATE_COUNT,
    bucketListIds(bucketList),
    useMovieStore.getState().watched.map((entry) => entry.movieId),
  );

export const SpinScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const bucketList = useMovieStore((state) => state.bucketList);
  const pickedMovie = useMovieStore((state) => state.pickedMovie);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const preferences = useUserStore((state) => state.preferences);

  // Same pool as Swipe: saved preferences, watchlist first. Picked once per
  // visit (and again on "New reel"), never on re-render.
  const initialRef = useRef(null);
  if (!initialRef.current) {
    initialRef.current = pickCandidates(preferences, bucketList);
  }
  const [candidates, setCandidates] = useState(initialRef.current);
  const [phase, setPhase] = useState("idle"); // idle | spinning | landed
  const [winner, setWinner] = useState(null);
  const [geo, setGeo] = useState(null); // measured reel area
  const count = Math.max(1, candidates.length);
  const strip = Array.from({ length: REPEATS }, () => candidates).flat();
  const translateY = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  // While racing the reel dims a little; on landing the slot frame lights.
  const racing = useSharedValue(0);
  const frameLit = useSharedValue(0);

  // translateY that puts strip item `index` in the slot.
  const offsetFor = (index) =>
    geo ? geo.center - (index * geo.step + geo.itemHeight / 2) : 0;

  // Once measured (or re-measured), park the reel on the first copy.
  useEffect(() => {
    if (geo) translateY.value = offsetFor(START_CYCLE * count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo?.step, geo?.center]);

  // A light tick each time a poster passes the slot — it feels like a reel
  // slowing down.
  const tick = () => Haptics.selectionAsync();
  const step = geo?.step ?? 1;
  const slotTop = geo ? geo.center - geo.itemHeight / 2 : 0;
  useAnimatedReaction(
    () => Math.round((slotTop - translateY.value) / step),
    (current, previous) => {
      if (previous !== null && current !== previous) runOnJS(tick)();
    },
    [slotTop, step],
  );

  const land = (winnerMovie) => {
    racing.value = withTiming(0, { duration: 200 });
    frameLit.value = withTiming(1, { duration: 260 });
    setWinner(winnerMovie);
    setPhase("landed");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Spin — and spin again any time, even mid-spin: each tap gives the reel
  // a fresh kick from wherever it is and lands on a new random pick (the
  // interrupted spin's landing is dropped).
  const spin = () => {
    if (!geo || candidates.length === 0) return;
    setPhase("spinning");
    setWinner(null);
    racing.value = withTiming(1, { duration: 300 });
    frameLit.value = withTiming(0, { duration: 150 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Jump (invisibly — the same poster, at the same spot, whole copies
    // back) to the first copy, so there's always room to race forward.
    // Works mid-spin too: it reads where the reel is right now.
    const at = (slotTop - translateY.value) / geo.step;
    const extraCycles = Math.floor(at / count) - START_CYCLE;
    translateY.value = translateY.value + extraCycles * count * geo.step;

    const winnerIndex = Math.floor(Math.random() * count);
    const target =
      (START_CYCLE + (reduceMotion ? 1 : SPIN_CYCLES)) * count + winnerIndex;

    translateY.value = withTiming(
      offsetFor(target),
      {
        duration: reduceMotion ? 1200 : SPIN_DURATION_MS,
        // Fast start, long smooth slowdown — no overshoot.
        easing: Easing.bezier(0.15, 0.6, 0.2, 1),
      },
      (finished) => {
        if (finished) runOnJS(land)(candidates[winnerIndex]);
      },
    );
  };

  const newReel = () => {
    if (phase === "spinning") return;
    setCandidates(pickCandidates(preferences, bucketList));
    setWinner(null);
    setPhase("idle");
    frameLit.value = 0;
    translateY.value = offsetFor(START_CYCLE * count);
  };

  const makeTonightsPick = () => {
    if (pickedMovie !== winner.id) togglePickedMovie(winner.id);
    showToast(t("{title} is tonight's pick", { title: winner.title }), {
      tone: "success",
    });
  };

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: 1 - racing.value * 0.25,
  }));
  const frameStyle = useAnimatedStyle(() => ({
    opacity: frameLit.value,
  }));

  const landed = phase === "landed" && winner;
  const caption =
    phase === "spinning"
      ? t("Spinning…")
      : landed
        ? t("The reel has spoken")
        : t("{count} picks on the reel", { count: candidates.length });

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Spin")}
        onBack={() => navigation.goBack()}
        right={
          <HeaderIconButton
            onPress={newReel}
            accessibilityLabel={t("New reel")}
            style={phase === "spinning" && styles.disabled}
          >
            <Shuffle size={22} strokeWidth={1.75} color={colors.textPrimary} />
          </HeaderIconButton>
        }
      />

      {candidates.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.title}>{t("Nothing to spin yet.")}</Text>
          <Text style={styles.hint}>
            {t("Loosen your preferences or save a few movies first.")}
          </Text>
        </View>
      ) : (
        <View
          style={styles.stage}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            if (!geo || geo.width !== width || geo.height !== height) {
              setGeo(geometryFor(width, height));
            }
          }}
        >
          {/* The winner's poster, blurred, behind the reel once it lands. */}
          {landed && (
            <Animated.View
              key={winner.id}
              entering={FadeIn.duration(400)}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Image
                source={{ uri: winner.poster }}
                blurRadius={30}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: `${colors.background}B3` },
                ]}
              />
            </Animated.View>
          )}

          {geo && (
            // Physical left-to-right in every language: reel geometry, and
            // the markers must point in at the slot.
            <View style={styles.reel}>
              <Animated.View
                style={[
                  styles.strip,
                  { left: (geo.width - geo.itemWidth) / 2 },
                  stripStyle,
                ]}
              >
                {strip.map((movie, index) => (
                  <MoviePoster
                    key={`${movie.id}-${index}`}
                    uri={movie.poster}
                    style={{ width: geo.itemWidth, height: geo.itemHeight }}
                  />
                ))}
              </Animated.View>

              {/* Neighbours fade into the page at the top and bottom. */}
              <LinearGradient
                pointerEvents="none"
                colors={[colors.background, `${colors.background}00`]}
                style={[styles.fade, { top: 0, height: slotTop * 0.85 }]}
              />
              <LinearGradient
                pointerEvents="none"
                colors={[`${colors.background}00`, colors.background]}
                style={[
                  styles.fade,
                  {
                    top: slotTop + geo.itemHeight + geo.itemHeight * 0.05,
                    bottom: 0,
                  },
                ]}
              />

              {/* Lines across the screen framing the slot. */}
              <View
                pointerEvents="none"
                style={[styles.slotLine, { top: slotTop - 2 }]}
              />
              <View
                pointerEvents="none"
                style={[styles.slotLine, { top: slotTop + geo.itemHeight }]}
              />
              {/* Lights up around the winner when the reel stops. */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.slotFrame,
                  {
                    top: slotTop - 2,
                    left: (geo.width - geo.itemWidth) / 2 - 2,
                    width: geo.itemWidth + 4,
                    height: geo.itemHeight + 4,
                  },
                  frameStyle,
                ]}
              />

              {/* Markers at the screen edges, pointing in at the slot. */}
              <Svg
                width={12}
                height={18}
                style={[
                  styles.marker,
                  { left: spacing.md, top: geo.center - 9 },
                ]}
              >
                <Path d="M0 0 L12 9 L0 18 Z" fill={colors.textPrimary} />
              </Svg>
              <Svg
                width={12}
                height={18}
                style={[
                  styles.marker,
                  { right: spacing.md, top: geo.center - 9 },
                ]}
              >
                <Path d="M12 0 L0 9 L12 18 Z" fill={colors.textPrimary} />
              </Svg>

              {/* On its own solid label, so it reads over any poster. */}
              <View style={styles.captionWrap} pointerEvents="none">
                <Text style={styles.caption}>{caption}</Text>
              </View>

              {landed && (
                <Pressable
                  style={{
                    position: "absolute",
                    top: slotTop,
                    left: (geo.width - geo.itemWidth) / 2,
                    width: geo.itemWidth,
                    height: geo.itemHeight,
                  }}
                  onPress={() =>
                    navigation.navigate("MovieDetails", { movieId: winner.id })
                  }
                  accessibilityLabel={t("Open {title}", {
                    title: winner.title,
                  })}
                />
              )}
            </View>
          )}

          {/* Floating result + buttons over the bottom. */}
          <View
            style={[
              styles.bottom,
              { paddingBottom: insets.bottom + spacing.md },
            ]}
          >
            {/* A solid fade behind the text and buttons, so they read over
                the posters underneath. */}
            <LinearGradient
              pointerEvents="none"
              colors={[`${colors.background}00`, colors.background]}
              locations={[0, 0.3]}
              style={StyleSheet.absoluteFill}
            />
            {landed ? (
              <Animated.View
                entering={FadeIn.duration(260)}
                style={styles.result}
              >
                <Text style={styles.title} numberOfLines={1}>
                  {winner.title}
                </Text>
                <Text style={styles.meta}>
                  {winner.year} · {formatRuntime(winner.runtime)} ·{" "}
                  {t(winner.genres[0])}
                </Text>
              </Animated.View>
            ) : (
              <Text style={styles.hint}>
                {phase === "spinning"
                  ? t("Here it goes…")
                  : t("Tap Spin and let fate pick tonight's movie.")}
              </Text>
            )}
            {landed ? (
              <View style={styles.actions}>
                <PrimaryButton
                  label={
                    pickedMovie === winner.id
                      ? t("Tonight's pick ✓")
                      : t("Make it tonight's pick")
                  }
                  variant={pickedMovie === winner.id ? "secondary" : "primary"}
                  disabled={pickedMovie === winner.id}
                  onPress={makeTonightsPick}
                  style={styles.flex}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.squareButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={spin}
                  accessibilityLabel={t("Spin again")}
                >
                  <RotateCw
                    size={20}
                    strokeWidth={2}
                    color={colors.textPrimary}
                  />
                </Pressable>
              </View>
            ) : (
              <PrimaryButton
                label={phase === "spinning" ? t("Spin again") : t("Spin")}
                onPress={spin}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    disabled: {
      opacity: 0.4,
    },
    pressed: {
      opacity: 0.75,
    },
    flex: {
      flex: 1,
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
    },
    stage: {
      flex: 1,
      overflow: "hidden",
    },
    reel: {
      ...StyleSheet.absoluteFill,
      direction: "ltr",
    },
    strip: {
      position: "absolute",
      top: 0,
      gap: GAP,
    },
    fade: {
      position: "absolute",
      left: 0,
      right: 0,
    },
    slotLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: colors.textPrimary,
      opacity: 0.25,
    },
    slotFrame: {
      position: "absolute",
      borderWidth: 2,
      borderColor: colors.textPrimary,
    },
    marker: {
      position: "absolute",
    },
    captionWrap: {
      position: "absolute",
      top: spacing.md,
      left: 0,
      right: 0,
      alignItems: "center",
    },
    caption: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      backgroundColor: colors.background,
    },
    bottom: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: spacing.xl,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    result: {
      alignItems: "center",
      gap: 2,
    },
    title: {
      ...typography.title,
      fontSize: 20,
      color: colors.textPrimary,
      textAlign: "center",
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
    },
    hint: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
    actions: {
      flexDirection: "row",
      gap: 2,
    },
    squareButton: {
      width: 50,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
  });

export default SpinScreen;

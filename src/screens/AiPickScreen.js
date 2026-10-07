import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from "react-native-svg";

import { BackButton } from "../components/BackButton";
import { StampCheck } from "../components/DialogArt";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { MOVIES, getMovieById } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { radius, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";
import {
  getTastePicks,
  getThinkingSteps,
  isColdStart,
} from "../utils/tasteEngine";
import { tierRank } from "../utils/tiers";

// Each thinking line types itself out, then "works" for a moment (a
// little longer for each later line, with some variation) before it's
// checked off and the next one starts.
const TYPE_MS = 24;
const DWELL_BASE_MS = 650;
const DWELL_STEP_MS = 140;
const DWELL_JITTER_MS = 450;
const REEL_MS = 320;
const RING = 92;

const SIGNAL_LABELS = {
  genre: "Genre love",
  director: "Director",
  cast: "Cast",
  decade: "Era",
  quality: "IMDb rating",
  watchlist: "On your watchlist",
  rejected: "Like ones you passed",
  jitter: "A little surprise",
};

// The "projector" while the engine thinks: a beam from the top, and your
// own best-tiered posters flicking through it like a reel.
const Projector = ({ posters, colors, styles }) => {
  const reduceMotion = useReducedMotion();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (reduceMotion || posters.length < 2) return undefined;
    const timer = setInterval(
      () => setFrame((value) => (value + 1) % posters.length),
      REEL_MS,
    );
    return () => clearInterval(timer);
  }, [reduceMotion, posters.length]);

  return (
    <View style={styles.projector}>
      <Svg width={220} height={150} style={styles.beam}>
        <Defs>
          <SvgGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Path d="M96 0 H124 L220 150 H0 Z" fill="url(#beam)" />
        <Circle cx={110} cy={4} r={6} fill="#FFFFFF" />
      </Svg>
      <View style={styles.reelFrame}>
        {posters[frame] && (
          <MoviePoster uri={posters[frame]} style={styles.reelPoster} />
        )}
        <View style={styles.reelScanline} />
      </View>
    </View>
  );
};

// "94% your taste" as a ring.
const MatchRing = ({ match, colors, styles }) => {
  const stroke = 7;
  const r = (RING - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={styles.ring}>
      <Svg width={RING} height={RING}>
        <Defs>
          <SvgGradient id="match" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.textPrimary} />
            <Stop offset="1" stopColor={colors.success} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke="url(#match)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - match / 100)}
          fill="none"
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <View style={styles.ringText} pointerEvents="none">
        <Text style={styles.ringValue}>{match}%</Text>
        <Text style={styles.ringLabel}>your taste</Text>
      </View>
    </View>
  );
};

// A small hand-drawn film-frame bullet for each reason.
const FrameBullet = ({ color }) => (
  <Svg width={14} height={14} viewBox="0 0 14 14">
    <Path
      d="M2 2.5 H12 V11.5 H2 Z"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    <Path d="M2 5.5 H12 M2 8.5 H12" stroke={color} strokeWidth={1} />
  </Svg>
);

// A small spinning arc — the line that's currently working.
const Spinner = ({ color }) => {
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    turn.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.linear }),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 360}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <Svg width={16} height={16} viewBox="0 0 16 16">
        <Circle
          cx={8}
          cy={8}
          r={6}
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={2}
        />
        <Path
          d="M8 2 A6 6 0 0 1 14 8"
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
};

// One thinking line. While active it types itself out, holds for `dwell`
// ms with a spinner, then calls onDone; once done it's checked and dimmed.
const ThinkingLine = ({ text, active, dwell, onDone, colors, styles }) => {
  const reduceMotion = useReducedMotion();
  const [typed, setTyped] = useState(active && !reduceMotion ? 0 : text.length);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!active) return undefined;
    if (typed < text.length) {
      const timer = setTimeout(() => setTyped((value) => value + 1), TYPE_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => onDoneRef.current?.(), dwell);
    return () => clearTimeout(timer);
  }, [active, typed, text.length, dwell]);

  return (
    <View style={styles.stepRow}>
      <View style={styles.stepMarker}>
        {active ? (
          <Spinner color={colors.textPrimary} />
        ) : (
          <StampCheck color={colors.success} size={16} />
        )}
      </View>
      <Text style={[styles.step, active && styles.stepActive]}>
        {text.slice(0, typed)}
      </Text>
    </View>
  );
};

// Reelboard's AI pick: the local taste engine (utils/tasteEngine) thinks
// for a moment — showing what it's actually reading — then shows one pick
// with how well it matches, why, and the full signal breakdown on demand.
export const AiPickScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const pickedMovie = useMovieStore((state) => state.pickedMovie);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);

  const [rejected, setRejected] = useState([]);
  const [run, setRun] = useState(0); // bumps for "Not this one"
  // Which thinking line is working (lines before it are done).
  const [activeLine, setActiveLine] = useState(0);
  const [showWhy, setShowWhy] = useState(false);

  const watchlistIds = bucketList.map((entry) => entry.movieId);
  const steps = useMemo(
    () => getThinkingSteps(watched, watchlistIds),
    // Only re-read when the history itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watched, bucketList],
  );
  const pick = useMemo(
    () =>
      getTastePicks(watched, {
        watchlist: watchlistIds,
        rejected,
        count: 1,
      })[0] ?? null,
    // A fresh roll per run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, rejected],
  );
  const coldStart = isColdStart(watched);

  // Posters for the projector reel: your best tiers, else top-rated.
  const reelPosters = useMemo(() => {
    const yours = [...watched]
      .sort((a, b) => tierRank(a) - tierRank(b))
      .map((entry) => getMovieById(entry.movieId)?.poster)
      .filter(Boolean)
      .slice(0, 8);
    return yours.length >= 3
      ? yours
      : MOVIES.slice(0, 8).map((movie) => movie.poster);
  }, [watched]);

  // Thinking: reveal one step at a time; the first run shows them all,
  // a "Not this one" re-roll is quicker.
  // The first run walks every line; a "Not this one" re-think, the last
  // three.
  const lines = run === 0 ? steps : steps.slice(-3);
  const isThinking = activeLine < lines.length;
  // Fixed per run, so a line's time doesn't change while it's on screen.
  const dwells = useMemo(
    () =>
      lines.map(
        (_, index) =>
          DWELL_BASE_MS +
          index * DWELL_STEP_MS +
          Math.round(Math.random() * DWELL_JITTER_MS),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, lines.length],
  );

  const isPicked = pick && pickedMovie === pick.movie.id;
  const caseColumn = Math.min(176, width * 0.42);

  const handleMakePick = () => {
    if (!pick) return;
    if (!isPicked) togglePickedMovie(pick.movie.id);
    showToast(`${pick.movie.title} is tonight's pick`, { tone: "success" });
  };

  const handleNotThis = () => {
    if (!pick) return;
    // Reset the thinking in the same update as the new run, so the next
    // pick never flashes before the projector.
    setActiveLine(0);
    setShowWhy(false);
    setRejected((current) => [...current, pick.movie.id]);
    setRun((value) => value + 1);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.card, colors.background]}
        locations={[0, 0.6]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.headerText} pointerEvents="none">
          <Text style={styles.headerTitle}>Reelboard picks</Text>
          <Text style={styles.headerSubtitle}>From your tiers & taste</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {isThinking ? (
        <View style={styles.thinking}>
          <Projector posters={reelPosters} colors={colors} styles={styles} />
          <View style={styles.steps}>
            {lines.slice(0, activeLine + 1).map((line, index) => (
              <Animated.View
                key={`${run}-${line}`}
                entering={FadeInDown.duration(200)}
              >
                <ThinkingLine
                  text={line}
                  active={index === activeLine}
                  dwell={dwells[index]}
                  onDone={() => setActiveLine(index + 1)}
                  colors={colors}
                  styles={styles}
                />
              </Animated.View>
            ))}
          </View>
        </View>
      ) : pick ? (
        <ScrollView
          contentContainerStyle={[
            styles.result,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(260)} style={styles.hero}>
            <Pressable
              onPress={() =>
                navigation.navigate("MovieDetails", { movieId: pick.movie.id })
              }
              accessibilityLabel={`Open ${pick.movie.title}`}
            >
              <MoviePoster
                uri={pick.movie.poster}
                shadow
                style={{ width: caseColumn * 0.8, aspectRatio: 2 / 3 }}
              />
            </Pressable>
            <MatchRing match={pick.match} colors={colors} styles={styles} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(260)}>
            <Text style={styles.title}>{pick.movie.title}</Text>
            <Text style={styles.meta}>
              {pick.movie.year} · {pick.movie.genres.join(", ")} ·{" "}
              {formatRuntime(pick.movie.runtime)} · {pick.movie.director}
            </Text>
          </Animated.View>

          {coldStart && (
            <Text style={styles.coldStart}>
              Tier a few movies and my picks get sharper.
            </Text>
          )}

          <Animated.View
            entering={FadeInDown.delay(160).duration(260)}
            style={styles.reasons}
          >
            <Text style={styles.reasonsLabel}>Why this one</Text>
            {pick.reasons.map((reason) => (
              <View key={reason} style={styles.reasonRow}>
                <FrameBullet color={colors.textPrimary} />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}

            <Pressable
              onPress={() => setShowWhy((value) => !value)}
              hitSlop={8}
              style={styles.whyToggle}
            >
              <Text style={styles.whyToggleText}>
                {showWhy ? "Hide the breakdown" : "See the full breakdown"}
              </Text>
            </Pressable>
            {showWhy && (
              <View style={styles.breakdown}>
                {(() => {
                  const max = Math.max(
                    ...pick.signals.map((signal) => Math.abs(signal.value)),
                    1,
                  );
                  return [...pick.signals]
                    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                    .map((signal) => (
                      <View key={signal.key} style={styles.signalRow}>
                        <Text style={styles.signalLabel}>
                          {SIGNAL_LABELS[signal.key] ?? signal.key}
                        </Text>
                        <View style={styles.signalTrack}>
                          <View
                            style={[
                              styles.signalBar,
                              {
                                width: `${(Math.abs(signal.value) / max) * 100}%`,
                                backgroundColor:
                                  signal.value >= 0
                                    ? colors.success
                                    : colors.danger,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.signalValue}>
                          {signal.value >= 0 ? "+" : "−"}
                          {Math.abs(signal.value).toFixed(1)}
                        </Text>
                      </View>
                    ));
                })()}
              </View>
            )}
          </Animated.View>

          <View style={styles.actions}>
            <PrimaryButton
              label={isPicked ? "Tonight's pick" : "Make it tonight's pick"}
              variant={isPicked ? "secondary" : "primary"}
              disabled={isPicked}
              onPress={handleMakePick}
            />
            <View style={styles.actionRow}>
              <PrimaryButton
                label="Not this one"
                variant="secondary"
                onPress={handleNotThis}
                style={styles.actionHalf}
              />
              <PrimaryButton
                label="Details"
                variant="secondary"
                onPress={() =>
                  navigation.navigate("MovieDetails", {
                    movieId: pick.movie.id,
                  })
                }
                style={styles.actionHalf}
              />
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.thinking}>
          <Text style={styles.title}>You&apos;ve seen everything.</Text>
          <Text style={styles.meta}>Nothing left in the catalog to pick.</Text>
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
      ...typography.title,
      fontSize: 18,
      letterSpacing: -0.3,
      color: colors.textPrimary,
    },
    headerSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 1,
    },
    headerSpacer: {
      width: 40,
    },

    // Thinking
    thinking: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl * 2,
    },
    projector: {
      alignItems: "center",
    },
    beam: {
      marginBottom: -40,
    },
    reelFrame: {
      width: 120,
      height: 180,
      padding: 4,
      backgroundColor: "#0D0D12",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.12)",
      overflow: "hidden",
    },
    reelPoster: {
      width: "100%",
      height: "100%",
    },
    reelScanline: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "45%",
      height: 2,
      backgroundColor: "#FFFFFF",
      opacity: 0.5,
    },
    steps: {
      marginTop: spacing.lg,
      gap: spacing.sm,
      alignSelf: "stretch",
      paddingHorizontal: spacing.md,
      minHeight: 200,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    stepMarker: {
      width: 18,
      alignItems: "center",
    },
    step: {
      ...typography.body,
      color: colors.textMuted,
    },
    stepActive: {
      color: colors.textPrimary,
    },

    // Result
    result: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.lg,
    },
    ring: {
      width: RING,
      height: RING,
      alignItems: "center",
      justifyContent: "center",
    },
    ringText: {
      position: "absolute",
      alignItems: "center",
    },
    ringValue: {
      ...typography.hero,
      fontSize: 22,
      lineHeight: 26,
      color: colors.textPrimary,
    },
    ringLabel: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textSecondary,
    },
    title: {
      ...typography.hero,
      fontSize: 26,
      lineHeight: 32,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.lg,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    coldStart: {
      ...typography.caption,
      color: colors.rating,
      textAlign: "center",
      marginTop: spacing.sm,
    },
    reasons: {
      marginTop: spacing.lg,
      marginHorizontal: -spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.08)",
      gap: spacing.sm + 2,
    },
    reasonsLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    reasonRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    reasonText: {
      ...typography.body,
      flex: 1,
      color: colors.textPrimary,
      marginTop: -2,
    },
    whyToggle: {
      alignSelf: "flex-start",
      marginTop: spacing.xs,
    },
    whyToggleText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
      textDecorationLine: "underline",
    },
    breakdown: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    signalRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    signalLabel: {
      ...typography.caption,
      width: 128,
      color: colors.textSecondary,
    },
    signalTrack: {
      flex: 1,
      height: 4,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
    },
    signalBar: {
      height: "100%",
    },
    signalValue: {
      ...typography.caption,
      fontFamily: fonts.semiBold,
      width: 36,
      textAlign: "right",
      color: colors.textPrimary,
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    actionRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    actionHalf: {
      flex: 1,
    },
  });

export default AiPickScreen;

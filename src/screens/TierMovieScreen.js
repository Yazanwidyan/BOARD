import { useIsFocused } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

import { Text } from "../components/AppText";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { giveRatingFeedback } from "../utils/achievementFeedback";
import { TIERS, getTier } from "../utils/tiers";

// Tier one movie with a slider and a face.
//
// The slider runs from F (left) to S (right). As it moves, everything
// follows it continuously: the whole screen takes the tier's colour, the
// face changes — from F's small eyes and deep frown, through C's flat
// "fine", to S's big shining eyes and wide grin — and the tier's letter
// shows huge, what it means in a small line under it. Let go and it snaps to the nearest tier, with a tick
// at every tier you pass — or tap a letter under it to jump straight there.
//
// Nothing is saved by sliding — "Save" confirms the tier.

// F → S, left to right.
const STOPS = [...TIERS].reverse();
const LAST = STOPS.length - 1;
const INDEXES = STOPS.map((_, index) => index);
// Each tier's own colour for the screen, and a deep shade of it for the
// face, the words and the buttons.
const BACKGROUNDS = STOPS.map((tier) => tier.color);
const INK = { S: "#4A3A05", A: "#1C4416", B: "#0C3650", C: "#2C2E33", D: "#55290B", F: "#57121D" };
const INKS = STOPS.map((tier) => INK[tier.key]);

// The face, per tier (F → S), in a 240 × 160 drawing: each eye's radii,
// the mouth's width and how far it curves (up is a smile), and how much
// the eyes shine.
const FACE = {
  eyeRx: [17, 30, 31, 22, 30, 34],
  eyeRy: [15, 11, 7, 22, 30, 34],
  mouthWidth: [64, 54, 50, 46, 62, 84],
  mouthCurve: [-30, -14, 0, 12, 22, 34],
  shine: [0, 0, 0, 0.4, 0.9, 1],
};
const EYE_Y = 62;
const MOUTH_Y = 128;

const SNAP = { damping: 18, stiffness: 220 };
const THUMB = 44;
const STOP_BUTTON = 36;
// The face, as wide as fits (with the page margins), up to 320.
const FACE_MAX = 320;

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const at = (position, values) => {
  "worklet";
  return interpolate(position, INDEXES, values);
};

// One eye: an ellipse, and a shine that comes in near the top tiers.
const Eye = ({ cx, position }) => {
  const eyeProps = useAnimatedProps(() => ({
    rx: at(position.value, FACE.eyeRx),
    ry: at(position.value, FACE.eyeRy),
  }));
  const shineProps = useAnimatedProps(() => {
    const rx = at(position.value, FACE.eyeRx);
    const ry = at(position.value, FACE.eyeRy);
    return {
      cx: cx + rx * 0.35,
      cy: EYE_Y - ry * 0.4,
      r: Math.min(rx, ry) * 0.28,
      opacity: at(position.value, FACE.shine),
    };
  });
  return (
    <>
      <AnimatedEllipse cx={cx} cy={EYE_Y} fill="#000000" fillOpacity={0.78} animatedProps={eyeProps} />
      <AnimatedCircle fill="#FFFFFF" animatedProps={shineProps} />
    </>
  );
};

const Face = ({ position, size }) => {
  const mouthProps = useAnimatedProps(() => {
    const width = at(position.value, FACE.mouthWidth);
    const curve = at(position.value, FACE.mouthCurve);
    const start = 120 - width / 2;
    const end = 120 + width / 2;
    return { d: `M ${start} ${MOUTH_Y} Q 120 ${MOUTH_Y + curve} ${end} ${MOUTH_Y}` };
  });
  return (
    <Svg width={size} height={(size * 160) / 240} viewBox="0 0 240 160">
      <Eye cx={70} position={position} />
      <Eye cx={170} position={position} />
      <AnimatedPath
        animatedProps={mouthProps}
        stroke="#000000"
        strokeOpacity={0.78}
        strokeWidth={13}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
};

export const TierMovieScreen = ({ navigation, route }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const { movieId } = route.params;
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const faceSize = Math.min(FACE_MAX, windowWidth - spacing.xl * 2);
  const isFocused = useIsFocused();
  const movie = getMovieById(movieId);
  const entry = useMovieStore((state) =>
    state.watched.find((item) => item.movieId === movieId),
  );
  const current = getTier(entry);
  const currentIndex = STOPS.findIndex((tier) => tier.key === current);
  // The tier the slider is on — not saved until "Save".
  const [chosen, setChosen] = useState(current);
  // The tier under the thumb right now (while dragging too), for the words.
  const [shown, setShown] = useState(currentIndex >= 0 ? currentIndex : null);
  // Once saved the screen is on its way out: no more changes.
  const [locked, setLocked] = useState(false);

  // Where the slider is, 0 (F) … 5 (S). An untiered movie starts between
  // B and C, nothing chosen yet.
  const position = useSharedValue(currentIndex >= 0 ? currentIndex : 2.5);
  const [trackWidth, setTrackWidth] = useState(0);

  // A tick for every tier the thumb passes, and the words follow it.
  const passTier = (index) => {
    Haptics.selectionAsync();
    setShown(index);
  };
  useAnimatedReaction(
    () => Math.round(position.value),
    (index, previous) => {
      if (previous !== null && index !== previous) runOnJS(passTier)(index);
    },
  );

  const settle = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShown(index);
    setChosen(STOPS[index].key);
  };

  // Drag anywhere along the track (or tap it); let go and it snaps.
  const slide = Gesture.Pan()
    .minDistance(0)
    .enabled(!!entry && !locked && trackWidth > 0)
    .onBegin((event) => {
      position.value = Math.min(LAST, Math.max(0, (event.x / trackWidth) * LAST));
    })
    .onUpdate((event) => {
      position.value = Math.min(LAST, Math.max(0, (event.x / trackWidth) * LAST));
    })
    .onFinalize(() => {
      const index = Math.round(position.value);
      position.value = withSpring(index, SNAP);
      runOnJS(settle)(index);
    });

  const jumpTo = (index) => {
    if (!entry || locked) return;
    position.value = withSpring(index, SNAP);
    settle(index);
  };

  const tierChanged = !!chosen && chosen !== current;
  const canSave = !!entry && tierChanged && !locked;
  const handleSave = () => {
    if (!canSave) return;
    setLocked(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const watchedBefore = useMovieStore.getState().watched;
    useMovieStore.getState().setWatchedTier(movieId, chosen);
    giveRatingFeedback(watchedBefore);
    navigation.goBack();
  };

  // Everything takes the colour of where the slider is.
  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(position.value, INDEXES, BACKGROUNDS),
  }));
  const inkStyle = useAnimatedStyle(() => ({
    color: interpolateColor(position.value, INDEXES, INKS),
  }));
  const wordStyle = useAnimatedStyle(() => ({
    color: interpolateColor(position.value, INDEXES, INKS),
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: (position.value / LAST) * trackWidth,
    backgroundColor: interpolateColor(position.value, INDEXES, INKS),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (position.value / LAST) * trackWidth - THUMB / 2 }],
    backgroundColor: interpolateColor(position.value, INDEXES, INKS),
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(position.value, INDEXES, INKS),
    opacity: withTiming(canSave ? 1 : 0.35, { duration: 160 }),
  }));

  if (!movie) return <View style={{ flex: 1 }} />;

  const shownTier = shown != null ? STOPS[shown] : null;

  return (
    <Animated.View style={[styles.container, backgroundStyle]}>
      {isFocused && <StatusBar style="dark" />}

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel={t("Close")}
        >
          <X size={24} color="#0C1014" strokeWidth={2} />
        </Pressable>
      </View>

      {/* What you're tiering: the title, big, and where it stands now. */}
      <View style={styles.question}>
        <Animated.Text style={[styles.questionLead, inkStyle]}>{t("How was it?")}</Animated.Text>
        <Animated.Text
          style={[styles.questionText, inkStyle]}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {movie.title}
        </Animated.Text>
        <Animated.Text style={[styles.questionMeta, inkStyle]}>
          {[movie.year, current ? t("Now: {tier} tier", { tier: current }) : null]
            .filter(Boolean)
            .join(" · ")}
        </Animated.Text>
      </View>

      <View style={styles.faceArea}>
        <Face position={position} size={faceSize} />
      </View>

      <View style={styles.words}>
        {shownTier ? (
          // The tier is the headline — its letter, huge — and what it means
          // a quiet line under it.
          <Animated.View key={shownTier.key} entering={FadeIn.duration(140)} style={styles.wordsInner}>
            <Animated.Text style={[styles.tierLetter, wordStyle]}>{shownTier.key}</Animated.Text>
            <Animated.Text style={[styles.tierMeaning, inkStyle]} numberOfLines={1}>
              {t("{tier} tier", { tier: shownTier.key })} · {t(shownTier.meaning)}
            </Animated.Text>
          </Animated.View>
        ) : (
          <Animated.Text style={[styles.hint, inkStyle]}>{t("Slide to tier it")}</Animated.Text>
        )}
      </View>

      {/* The slider: F on the left, S on the right, whatever the language. */}
      <View style={styles.sliderArea}>
        <GestureDetector gesture={slide}>
          <View
            style={styles.track}
            onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          >
            <View style={styles.trackLine} />
            <Animated.View style={[styles.trackFill, fillStyle]} />
            {STOPS.map((tier, index) => (
              <View
                key={tier.key}
                style={[styles.stop, { left: (index / LAST) * trackWidth - 3 }]}
              />
            ))}
            <Animated.View style={[styles.thumb, thumbStyle]}>
              <Text style={styles.thumbLetter}>{shownTier?.key ?? "?"}</Text>
            </Animated.View>
          </View>
        </GestureDetector>
        <View style={styles.stopLabels}>
          {STOPS.map((tier, index) => (
            <Pressable
              key={tier.key}
              onPress={() => jumpTo(index)}
              hitSlop={6}
              style={[styles.stopButton, { left: (index / LAST) * trackWidth - STOP_BUTTON / 2 }]}
              accessibilityRole="button"
              accessibilityLabel={t("{tier} tier", { tier: tier.key })}
              accessibilityState={{ selected: shown === index }}
            >
              <Text style={[styles.stopLabel, shown === index && styles.stopLabelOn]}>
                {tier.key}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* The room left over goes here, so the slider sits right under
          the tier and Save stays at the bottom. */}
      <View style={styles.spacer} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
        >
          <Animated.View style={[styles.save, buttonStyle]}>
            <Text style={styles.saveText}>
              {tierChanged ? t("Save as {tier} tier", { tier: chosen }) : t("Save")}
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const INK_TEXT = "#0C1014";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
  },
  close: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  question: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  questionLead: {
    ...typography.bodyBold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    opacity: 0.7,
  },
  questionText: {
    fontFamily: fonts.extraBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    textAlign: "center",
  },
  questionMeta: {
    ...typography.bodyBold,
    fontSize: 13,
    opacity: 0.6,
  },
  faceArea: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  words: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  wordsInner: {
    alignItems: "center",
    alignSelf: "stretch",
  },
  tierLetter: {
    fontFamily: fonts.extraBold,
    fontSize: 112,
    lineHeight: 120,
    letterSpacing: -4,
    textAlign: "center",
  },
  tierMeaning: {
    ...typography.bodyBold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    opacity: 0.65,
  },
  hint: {
    ...typography.bodyBold,
    fontSize: 16,
    opacity: 0.7,
  },
  sliderArea: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    direction: "ltr",
  },
  track: {
    height: THUMB + 12,
    justifyContent: "center",
  },
  trackLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0, 0, 0, 0.12)",
  },
  trackFill: {
    position: "absolute",
    left: 0,
    height: 6,
    borderRadius: 3,
  },
  stop: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  thumb: {
    position: "absolute",
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.85)",
  },
  thumbLetter: {
    ...typography.hero,
    fontSize: 18,
    lineHeight: 22,
    color: "#FFFFFF",
  },
  // Tappable letters under the track, each centred on its stop.
  stopLabels: {
    height: STOP_BUTTON,
    marginTop: 2,
  },
  stopButton: {
    position: "absolute",
    width: STOP_BUTTON,
    height: STOP_BUTTON,
    alignItems: "center",
    justifyContent: "center",
  },
  stopLabel: {
    ...typography.bodyBold,
    fontSize: 16,
    color: INK_TEXT,
    opacity: 0.45,
  },
  stopLabelOn: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    opacity: 1,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.md,
  },
  save: {
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: "#FFFFFF",
  },
});

export default TierMovieScreen;

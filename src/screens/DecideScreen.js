import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { ChallengeCard } from "../components/ChallengeCard";
import { ChallengeEmptyCard } from "../components/ChallengeEmptyCard";
import { DecideHeader } from "../components/DecideHeader";
import { MoviePoster } from "../components/MoviePoster";
import { QuickPickBento } from "../components/QuickPickBento";
import { getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { TAB_BAR_CLEARANCE, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MOODS, pickMovieForMood } from "../utils/moods";
import { openChallengeGenerator } from "../utils/openChallengeGenerator";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const SPROCKETS = 4;
const GLOW_HEIGHT = 520;

// "01 QUICK PICK" — sections numbered like a cinema programme.
const SectionLabel = ({ number, label, styles }) => (
  <View style={styles.sectionLabelRow}>
    <Text style={styles.sectionNumber}>{String(number).padStart(2, "0")}</Text>
    <Text style={styles.sectionLabel}>{label}</Text>
  </View>
);

// The sprocket-hole edge of a film strip.
const Sprockets = ({ styles }) => (
  <View style={styles.sprockets}>
    {Array.from({ length: SPROCKETS }, (_, index) => (
      <View key={index} style={styles.sprocketHole} />
    ))}
  </View>
);

// One frame of the history film strip: the challenge's poster, what it
// was, when, and a Done / Skipped stamp.
const HistoryFrame = ({ entry, isLast, styles }) => {
  const movie = getMovieById(entry.targetMovieId);
  const isCompleted = entry.status === "completed";
  const date = entry.resolvedAt ? new Date(entry.resolvedAt) : null;

  return (
    <View style={[styles.frame, !isLast && styles.frameDivider]}>
      <Sprockets styles={styles} />
      <View style={styles.frameBody}>
        <MoviePoster uri={movie?.poster} style={styles.framePoster} />
        <View style={styles.frameInfo}>
          <Text style={styles.frameTitle} numberOfLines={1}>
            {entry.title}
          </Text>
          <Text style={styles.frameSubtitle} numberOfLines={1}>
            {movie ? movie.title : "—"}
            {date ? ` · ${MONTHS[date.getMonth()]} ${date.getDate()}` : ""}
          </Text>
        </View>
        <View
          style={[
            styles.stamp,
            isCompleted ? styles.stampDone : styles.stampSkipped,
          ]}
        >
          <Text
            style={[
              styles.stampText,
              isCompleted ? styles.stampTextDone : styles.stampTextSkipped,
            ]}
          >
            {isCompleted ? "DONE" : "SKIPPED"}
          </Text>
        </View>
      </View>
      <Sprockets styles={styles} />
    </View>
  );
};

// Swipe, Spin, and Challenges are all the same underlying job — "I don't
// know what to watch, decide for me" — just with different textures
// (casual/random vs. goal-oriented), so they share one screen instead of
// Swipe/Spin being secondary cards buried on Home.
export const DecideScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);
  const skipChallenge = useChallengeStore((state) => state.skipChallenge);
  const history = useChallengeStore((state) => state.history);

  // Decide's header is taller than the others (it carries the poster
  // marquee), so the content inset comes from its measured height. The
  // starting value is a close estimate for the first frame.
  const [headerHeight, setHeaderHeight] = useState(insets.top + 112);

  // One tap to a pick: a random mood, then the same picker Home's mood
  // chips use — it becomes tonight's pick and Home shows it.
  const handleSurprise = () => {
    const mood = MOODS[Math.floor(Math.random() * MOODS.length)];
    const movie = pickMovieForMood(mood.key);
    if (!movie) return;
    useMovieStore.getState().setMoodPick(movie.id, mood.key);
    showToast(`${movie.title} is tonight's pick`, {
      tone: "success",
    });
  };

  const handleCreate = () => {
    if (activeChallenge) skipChallenge();
    openChallengeGenerator(navigation);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Projector glow — a soft purple beam spreading down from under the
          header, behind everything. */}
      <Svg
        pointerEvents="none"
        width={width}
        height={GLOW_HEIGHT}
        style={[styles.glow, { top: headerHeight }]}
      >
        <Defs>
          <RadialGradient
            id="projector"
            cx="50%"
            cy="0%"
            rx="75%"
            ry="100%"
            fx="50%"
            fy="0%"
          >
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.38} />
            <Stop offset="0.55" stopColor={colors.accent} stopOpacity={0.1} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={GLOW_HEIGHT} fill="url(#projector)" />
      </Svg>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerHeight + spacing.md,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        <View style={[styles.section, styles.firstSection]}>
          <SectionLabel number={1} label="Quick Pick" styles={styles} />
          <QuickPickBento
            onAI={() => navigation.navigate("AiPick")}
            onSwipe={() => navigation.navigate("Swipe")}
            onSpin={() => navigation.navigate("Spin")}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel number={2} label="Active Challenge" styles={styles} />
          {activeChallenge ? (
            <ChallengeCard
              challenge={activeChallenge}
              mode="active"
              onContinue={() =>
                navigation.navigate("MovieDetails", {
                  movieId: activeChallenge.targetMovieId,
                })
              }
              onNewChallenge={handleCreate}
            />
          ) : (
            <ChallengeEmptyCard
              title="No Active Challenges"
              subtitle="Bored? Let a challenge pick tonight's movie."
              onPress={handleCreate}
            />
          )}
        </View>

        {history.length > 0 && (
          <View style={styles.section}>
            <SectionLabel number={3} label="History" styles={styles} />
            <View style={styles.filmStrip}>
              {history.map((entry, index) => (
                <HistoryFrame
                  key={`${entry.id}-${entry.resolvedAt ?? index}`}
                  entry={entry}
                  isLast={index === history.length - 1}
                  styles={styles}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      <DecideHeader onSurprise={handleSurprise} onMeasure={setHeaderHeight} />
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // The header inset already leaves the gap under the header, so the
    // first section adds no top margin of its own.
    firstSection: {
      marginTop: 0,
    },
    section: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    glow: {
      position: "absolute",
      left: 0,
    },
    sectionLabelRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    sectionNumber: {
      ...typography.label,
      color: colors.accentLight,
      letterSpacing: 1.5,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
    // History as a film strip: one continuous strip, a frame per entry,
    // sprocket holes down both edges.
    // Runs edge to edge, so the sprocket holes sit at the screen edges.
    filmStrip: {
      marginHorizontal: -spacing.md,
      overflow: "hidden",
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.08)",
    },
    frame: {
      flexDirection: "row",
      alignItems: "stretch",
    },
    frameDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.background,
    },
    sprockets: {
      width: 16,
      justifyContent: "space-evenly",
      alignItems: "center",
      backgroundColor: colors.background,
      paddingVertical: 4,
    },
    sprocketHole: {
      width: 7,
      height: 9,
      borderRadius: 2,
      backgroundColor: colors.cardElevated,
    },
    frameBody: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      padding: spacing.sm,
    },
    framePoster: {
      width: 40,
      height: 60,
    },
    frameInfo: {
      flex: 1,
      gap: 2,
    },
    frameTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    frameSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    stamp: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      borderWidth: 1.5,
      transform: [{ rotate: "-8deg" }],
    },
    stampDone: {
      borderColor: colors.success,
    },
    stampSkipped: {
      borderColor: colors.textMuted,
    },
    stampText: {
      ...typography.label,
      fontSize: 10,
      letterSpacing: 1,
    },
    stampTextDone: {
      color: colors.success,
    },
    stampTextSkipped: {
      color: colors.textMuted,
    },
  });

export default DecideScreen;

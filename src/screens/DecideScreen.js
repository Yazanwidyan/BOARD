import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/AppText";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ChallengeCard, ChallengePrompt } from "../components/ChallengeCard";
import { DecideHeader } from "../components/DecideHeader";
import { MoviePoster } from "../components/MoviePoster";
import { QuickPickBento } from "../components/QuickPickBento";
import { getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MOODS, pickMovieForMood } from "../utils/moods";
import { openChallengeGenerator } from "../utils/openChallengeGenerator";
import { t } from "../i18n";

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

// Section titles: bold, sentence case — the same as Home.
const SectionLabel = ({ label, styles }) => (
  <Text style={styles.sectionLabel}>{label}</Text>
);

// One row of history: the challenge's poster, what it was, the movie and
// when, and Done / Skipped as plain text.
const HistoryRow = ({ entry, isLast, styles }) => {
  const movie = getMovieById(entry.targetMovieId);
  const isCompleted = entry.status === "completed";
  const date = entry.resolvedAt ? new Date(entry.resolvedAt) : null;

  return (
    <View style={[styles.historyRow, !isLast && styles.historyDivider]}>
      <MoviePoster uri={movie?.poster} style={styles.historyPoster} />
      <View style={styles.historyInfo}>
        <Text style={styles.historyTitle} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text style={styles.historySubtitle} numberOfLines={1}>
          {movie ? movie.title : "—"}
          {date ? ` · ${MONTHS[date.getMonth()]} ${date.getDate()}` : ""}
        </Text>
      </View>
      <Text
        style={[
          styles.statusText,
          isCompleted ? styles.statusTextDone : styles.statusTextSkipped,
        ]}
      >
        {isCompleted ? t("Done") : t("Skipped")}
      </Text>
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
    showToast(t("{title} is tonight's pick", { title: movie.title }), {
      tone: "success",
    });
  };

  const handleCreate = () => {
    if (activeChallenge) skipChallenge();
    openChallengeGenerator(navigation);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerHeight + spacing.md,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        <View style={[styles.section, styles.firstSection]}>
          <SectionLabel label={t("Quick pick")} styles={styles} />
          <QuickPickBento
            onAI={() => navigation.navigate("AiPick")}
            onSwipe={() => navigation.navigate("Swipe")}
            onSpin={() => navigation.navigate("Spin")}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel label={t("Active challenge")} styles={styles} />
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
            <ChallengePrompt onStart={handleCreate} />
          )}
        </View>

        {history.length > 0 && (
          <View style={styles.section}>
            <SectionLabel label={t("History")} styles={styles} />
            <View style={styles.historyList}>
              {history.map((entry, index) => (
                <HistoryRow
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
    sectionLabel: {
      ...typography.title,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.3,
      color: colors.textPrimary,
      marginBottom: spacing.sm + 2,
    },
    // Filled rows edge to edge (cancels the section padding), split by a
    // line of page colour — like Settings.
    historyList: {
      marginHorizontal: -spacing.md,
      backgroundColor: colors.card,
    },
    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
    },
    historyDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.background,
    },
    historyPoster: {
      width: 48,
      height: 72,
    },
    historyInfo: {
      flex: 1,
      gap: 2,
    },
    historyTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    historySubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    statusText: {
      ...typography.bodyBold,
      fontSize: 13,
    },
    statusTextDone: {
      color: colors.success,
    },
    statusTextSkipped: {
      color: colors.textSecondary,
    },
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
      marginTop: spacing.xl,
    },
  });

export default DecideScreen;

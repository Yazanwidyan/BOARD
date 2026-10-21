import { ChevronRight, History } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/AppText";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BottomSheet } from "../components/BottomSheet";
import { ChallengeCard, ChallengePrompt } from "../components/ChallengeCard";
import { DecideHeader } from "../components/DecideHeader";
import { MoviePoster } from "../components/MoviePoster";
import { QuickPickBento } from "../components/QuickPickBento";
import { SwipeSheet } from "../components/SwipeSheet";
import { WildcardSheet } from "../components/WildcardSheet";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useSessionStore } from "../store/sessionStore";
import { TAB_BAR_CLEARANCE, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { openChallengeGenerator } from "../utils/openChallengeGenerator";
import { t, useIsRTL } from "../i18n";
import { FirstVisitTip } from "../components/FirstVisitTip";

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
          {date ? ` · ${t(MONTHS[date.getMonth()])} ${date.getDate()}` : ""}
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

// Decide answers "how do you want to decide?" — the Quick pick bento:
//
//   Let ReelBoard choose  your taste picks one (the same engine as
//                         Tonight's pick; its answer becomes tonight's pick)
//   Swipe                 a set of ten to narrow down
//   Wildcard              one film, dealt as a scratch card (its own
//                         screen, once you've chosen where from)
//
//   — both from the same sources (utils/decidePools): your taste, anything,
//   outside your taste, your watchlist, a board, your filters —
//   Movie night           two people, one phone
//   More like…            pick a movie, see the films most like it — how
//                         similar, and why (screens/SimilarScreen)
//
// then your dare, and the dares before it.
export const DecideScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const startSession = useSessionStore((state) => state.startSession);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);
  const skipChallenge = useChallengeStore((state) => state.skipChallenge);
  const history = useChallengeStore((state) => state.history);
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const [isWildcardOpen, setIsWildcardOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Decide's header is taller than the others (it carries the poster
  // marquee), so the content inset comes from its measured height. The
  // starting value is a close estimate for the first frame.
  const [headerHeight, setHeaderHeight] = useState(insets.top + 112);

  const startSwiping = (movies) => {
    setIsSwipeOpen(false);
    startSession(movies);
    navigation.navigate("Swipe");
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
          <QuickPickBento
            onAI={() => navigation.navigate("AiPick")}
            onSwipe={() => setIsSwipeOpen(true)}
            onWildcard={() => setIsWildcardOpen(true)}
            onMovieNight={() => navigation.navigate("MovieNight")}
            onSimilar={() => navigation.navigate("Similar")}
          />
        </View>

        <View style={styles.section}>
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

        {/* Past dares: one row; the list opens in a sheet. */}
        {history.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.pastRow, pressed && styles.pastRowPressed]}
            onPress={() => setIsHistoryOpen(true)}
            accessibilityRole="button"
          >
            <History size={18} color={colors.textSecondary} strokeWidth={1.9} />
            <Text style={styles.pastLabel}>{t("Past dares")}</Text>
            <Text style={styles.pastCount}>{history.length}</Text>
            <ChevronRight size={18} color={colors.textMuted} style={rtl && styles.flipped} />
          </Pressable>
        )}
      </ScrollView>
      <DecideHeader onMeasure={setHeaderHeight} />
      <FirstVisitTip id="decide" />

      <SwipeSheet
        visible={isSwipeOpen}
        onClose={() => setIsSwipeOpen(false)}
        onStart={startSwiping}
      />

      <WildcardSheet
        visible={isWildcardOpen}
        onClose={() => setIsWildcardOpen(false)}
        onGo={() => {
          setIsWildcardOpen(false);
          navigation.navigate("Wildcard");
        }}
      />

      <BottomSheet
        visible={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={t("Past dares")}
        subtitle={t("{done} done · {skipped} skipped", {
          done: history.filter((entry) => entry.status === "completed").length,
          skipped: history.filter((entry) => entry.status !== "completed").length,
        })}
        size="half"
        flush
      >
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <View style={styles.sheetHistory}>
            {history.map((entry, index) => (
              <HistoryRow
                key={`${entry.id}-${entry.resolvedAt ?? index}`}
                entry={entry}
                isLast={index === history.length - 1}
                styles={styles}
              />
            ))}
          </View>
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    pastRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 52,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    pastRowPressed: {
      backgroundColor: colors.cardElevated,
    },
    pastLabel: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 20,
      flex: 1,
      color: colors.textPrimary,
    },
    pastCount: {
      ...typography.body,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    sheetHistory: {
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
      lineHeight: 18,
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
    sheetBody: {
      paddingBottom: spacing.lg,
    },
  });

export default DecideScreen;

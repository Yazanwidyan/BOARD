import { CheckCircle, X } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import {
  HeaderBar,
  LargeTitle,
  useCollapsingHeader,
  useHeaderInset,
} from "../components/ScreenHeader";
import { ChallengeCard } from "../components/ChallengeCard";
import { ChallengeEmptyCard } from "../components/ChallengeEmptyCard";
import { QuickPickBento } from "../components/QuickPickBento";
import { getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { openChallengeGenerator } from "../utils/openChallengeGenerator";

const HistoryRow = ({ entry, styles, colors }) => {
  const movie = getMovieById(entry.targetMovieId);
  const isCompleted = entry.status === "completed";

  return (
    <View style={styles.historyRow}>
      <View
        style={[
          styles.historyIcon,
          isCompleted ? styles.historyIconDone : styles.historyIconSkipped,
        ]}
      >
        {isCompleted ? (
          <CheckCircle size={16} color={colors.success} />
        ) : (
          <X size={16} color={colors.textMuted} />
        )}
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyTitle} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text style={styles.historySubtitle} numberOfLines={1}>
          {movie ? movie.title : "—"}
        </Text>
      </View>
      {isCompleted && (
        <Text style={styles.historyXp}>+{entry.xpReward} XP</Text>
      )}
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

  const { scrollY, onScroll } = useCollapsingHeader();
  const headerInset = useHeaderInset();

  const handleCreate = () => {
    if (activeChallenge) skipChallenge();
    openChallengeGenerator(navigation);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerInset,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        <LargeTitle
          title="Decide"
          subtitle={
            activeChallenge
              ? `1 active challenge · +${activeChallenge.xpReward} XP waiting`
              : "You don't need to know what you want."
          }
        />
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quick Pick</Text>
          <QuickPickBento
            onAI={() => navigation.navigate("Preferences")}
            onSwipe={() => navigation.navigate("Swipe")}
            onSpin={() => navigation.navigate("Spin")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Active Challenge</Text>
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
              subtitle="Bored? Create a challenge to earn XP."
              onPress={handleCreate}
            />
          )}
        </View>

        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>History</Text>
            {history.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                styles={styles}
                colors={colors}
              />
            ))}
          </View>
        )}
      </Animated.ScrollView>
      <HeaderBar title="Decide" scrollY={scrollY} />
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    section: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    historyIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    historyIconDone: {
      backgroundColor: colors.successSoft,
    },
    historyIconSkipped: {
      backgroundColor: colors.surfaceSoft,
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
    historyXp: {
      ...typography.caption,
      fontSize: 12,
      color: colors.success,
    },
  });

export default DecideScreen;

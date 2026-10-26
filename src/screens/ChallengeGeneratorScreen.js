import * as Haptics from "expo-haptics";
import { Check, Shuffle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { HeaderIconButton, StackHeader } from "../components/ScreenHeader";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { generateChallengeOptions } from "../utils/challenges";
import { getRanksFromWatching } from "../utils/ranks";
import { countFinishedDares } from "../utils/useRanks";
import { formatRuntime } from "../utils/movieFilters";

const HAND_SIZE = 3;
const NOTCH = 18;
const PERFORATION_DOTS = 14;

const difficultyColor = (difficulty, colors) =>
  ({
    EASY: colors.success,
    MEDIUM: colors.rating,
    HARD: colors.danger,
    EXTREME: colors.danger,
  })[difficulty] ?? colors.textSecondary;

// The tear line between a ticket and its stub: a column of dots, with a
// half-circle bitten out of the top and bottom edges in the page's colour.
const Perforation = ({ styles }) => (
  <View style={styles.perforation} pointerEvents="none">
    <View style={styles.dots}>
      {Array.from({ length: PERFORATION_DOTS }, (_, index) => (
        <View key={index} style={styles.perforationDot} />
      ))}
    </View>
    <View style={[styles.notch, styles.notchTop]} />
    <View style={[styles.notch, styles.notchBottom]} />
  </View>
);

// One dare in the hand, as a ticket — like the dare on Home: how hard it is,
// its name and why it was picked, the film it points at; then the
// perforation and the stub with the poster and what it earns. Tap to pick
// it; the picked one lifts a shade and gets a check, the others dim.
const DareTicket = ({ challenge, selected, dimmed, onPress, index, styles, colors }) => {
  const movie = getMovieById(challenge.targetMovieId);
  const tint = difficultyColor(challenge.difficulty, colors);

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(220)}>
      <Pressable
        style={({ pressed }) => [
          styles.ticket,
          selected && styles.ticketSelected,
          dimmed && styles.ticketDimmed,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        <View style={styles.main}>
          <View style={styles.labelRow}>
            <View style={[styles.dot, { backgroundColor: tint }]} />
            <Text style={styles.difficulty}>{t(challenge.difficultyLabel)}</Text>
          </View>
          <Text style={styles.dareName} numberOfLines={2}>
            {t(challenge.title)}
          </Text>
          <Text style={styles.why} numberOfLines={3}>
            {challenge.description}
          </Text>
          {movie && (
            <Text style={styles.movie} numberOfLines={1}>
              {movie.title} · {movie.year}
              {movie.runtime ? ` · ${formatRuntime(movie.runtime)}` : ""}
            </Text>
          )}
        </View>

        <Perforation styles={styles} />

        <View style={styles.stub}>
          {movie ? (
            <MoviePoster uri={movie.poster} style={styles.poster} />
          ) : (
            <View style={[styles.poster, styles.placeholder]} />
          )}
          {challenge.rankReward > 0 && (
            <Text style={styles.reward} numberOfLines={1}>
              {challenge.rankReward === 1
                ? t("+1 rank")
                : t("+{count} ranks", { count: challenge.rankReward })}
            </Text>
          )}
        </View>

        {selected && (
          <View style={styles.check}>
            <Check size={14} color={colors.background} strokeWidth={3.2} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// Pick tonight's dare: three real options dealt at once (spanning Easy →
// Hard when your history allows), each a ticket. Pick one, take it. ⇄ in
// the header deals a new hand.
export const ChallengeGeneratorScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const acceptChallenge = useChallengeStore((state) => state.acceptChallenge);

  // Each dare's reward is the ranks it would really earn you — its film's
  // (a saga's next rank, a new decade…) plus finishing a dare (Dare Devil).
  const deal = () => {
    const { watched, bucketList } = useMovieStore.getState();
    const dares = countFinishedDares(useChallengeStore.getState().history);
    return generateChallengeOptions({ watched, bucketList }, HAND_SIZE).map(
      (challenge) => ({
        ...challenge,
        rankReward: getRanksFromWatching(watched, challenge.targetMovieId, dares, {
          finishesDare: true,
        }).length,
      }),
    );
  };
  const [hand, setHand] = useState(deal);
  const [handId, setHandId] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const reshuffle = () => {
    Haptics.selectionAsync();
    setHand(deal());
    setHandId((id) => id + 1);
    setSelectedIndex(null);
  };

  const select = (index) => {
    Haptics.selectionAsync();
    setSelectedIndex((current) => (current === index ? null : index));
  };

  const selected = selectedIndex != null ? hand[selectedIndex] : null;
  const selectedMovie = selected ? getMovieById(selected.targetMovieId) : null;

  const handleAccept = () => {
    if (!selected) return;
    acceptChallenge(selected);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(
      t("Dare on: watch {title}", { title: selectedMovie?.title ?? "" }),
      { tone: "success" },
    );
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StackHeader
        title={t("New dare")}
        onBack={() => navigation.goBack()}
        right={
          <HeaderIconButton onPress={reshuffle} accessibilityLabel={t("Deal three new ones")}>
            <Shuffle size={22} strokeWidth={1.75} color={colors.textPrimary} />
          </HeaderIconButton>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* How it works, in a line. */}
        <Text style={styles.intro}>
          {t("Pick a dare, watch the film, earn ranks.")}
        </Text>

        {hand.length === 0 ? (
          <Text style={styles.empty}>
            {t("No dares right now — you've seen it all. Impressive.")}
          </Text>
        ) : (
          <View key={handId} style={styles.hand}>
            {hand.map((challenge, index) => (
              <DareTicket
                key={challenge.id}
                challenge={challenge}
                index={index}
                selected={selectedIndex === index}
                dimmed={selectedIndex != null && selectedIndex !== index}
                onPress={() => select(index)}
                styles={styles}
                colors={colors}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={
            selected
              ? selected.rankReward > 0
                ? t("Take this dare · +{count} ranks", { count: selected.rankReward })
                : t("Take this dare")
              : t("Pick a dare")
          }
          disabled={!selected}
          onPress={handleAccept}
        />
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    intro: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
    hand: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    pressed: {
      opacity: 0.85,
    },

    // A ticket: the dare on the left, the stub on the right.
    ticket: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    // Picked: a shade lighter, with a check on its corner.
    ticketSelected: {
      backgroundColor: colors.cardElevatedLight,
    },
    ticketDimmed: {
      opacity: 0.55,
    },
    main: {
      flex: 1,
      padding: spacing.md,
      gap: 4,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    difficulty: {
      ...typography.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1.2,
      color: colors.textSecondary,
    },
    dareName: {
      ...typography.bodyBold,
      fontSize: 17,
      lineHeight: 22,
      color: colors.textPrimary,
      marginTop: 2,
    },
    why: {
      ...typography.caption,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    movie: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 4,
    },

    // The tear line: the notches hang half over the ticket's edges.
    perforation: {
      width: NOTCH,
      alignItems: "center",
    },
    dots: {
      flex: 1,
      justifyContent: "space-between",
      paddingVertical: NOTCH / 2 + 4,
      overflow: "hidden",
    },
    perforationDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.border,
    },
    notch: {
      position: "absolute",
      width: NOTCH,
      height: NOTCH,
      borderRadius: NOTCH / 2,
      backgroundColor: colors.background,
    },
    notchTop: {
      top: -NOTCH / 2,
    },
    notchBottom: {
      bottom: -NOTCH / 2,
    },

    // The stub: the poster and what it earns.
    stub: {
      width: 92,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingEnd: spacing.sm,
    },
    poster: {
      width: 56,
      aspectRatio: 2 / 3,
    },
    placeholder: {
      backgroundColor: colors.cardElevatedLight,
      borderRadius: shape.poster,
    },
    reward: {
      ...typography.bodyBold,
      fontSize: 12,
      lineHeight: 16,
      color: colors.rating,
    },
    check: {
      position: "absolute",
      top: spacing.sm,
      end: spacing.sm,
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.textPrimary,
      borderRadius: 12,
    },

    empty: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xl,
    },
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
  });

export default ChallengeGeneratorScreen;

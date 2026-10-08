import * as Haptics from "expo-haptics";
import { Shuffle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { HeaderIconButton, StackHeader } from "../components/ScreenHeader";
import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { generateChallengeOptions } from "../utils/challenges";
import { formatRuntime } from "../utils/movieFilters";

const HAND_SIZE = 3;

const difficultyColor = (difficulty, colors) =>
  ({
    EASY: colors.success,
    MEDIUM: colors.rating,
    HARD: colors.danger,
    EXTREME: colors.danger,
  })[difficulty] ?? colors.textSecondary;

// How dares work, always on screen — so it's clear before you pick.
const HowItWorks = ({ styles }) => (
  <View style={styles.steps}>
    {[t("Pick a dare"), t("Watch the movie"), t("Earn XP")].map(
      (label, index) => (
        <View key={label} style={styles.step}>
          <Text style={styles.stepNumber}>{index + 1}</Text>
          <Text style={styles.stepLabel} numberOfLines={2}>
            {label}
          </Text>
        </View>
      ),
    )}
  </View>
);

// One dare in the hand: its name and reward first, then why it was picked,
// then the movie it points at with its difficulty. Tap to select.
const DareCard = ({ challenge, selected, onPress, index, styles, colors }) => {
  const movie = getMovieById(challenge.targetMovieId);
  const tint = difficultyColor(challenge.difficulty, colors);

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(220)}>
      <Pressable
        style={[styles.card, selected && styles.cardSelected]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        <View style={styles.cardTop}>
          <Text style={styles.dareName} numberOfLines={1}>
            {t(challenge.title)}
          </Text>
          <Text style={styles.reward}>
            {t("+{xp} XP", { xp: challenge.xpReward })}
          </Text>
        </View>
        <Text style={styles.why}>{challenge.description}</Text>

        {movie && (
          <View style={styles.movieRow}>
            <MoviePoster uri={movie.poster} style={styles.poster} />
            <View style={styles.movieInfo}>
              <Text style={styles.movieTitle} numberOfLines={1}>
                {movie.title}
              </Text>
              <Text style={styles.movieMeta} numberOfLines={1}>
                {movie.year} · {formatRuntime(movie.runtime)} ·{" "}
                {t(movie.genres[0])}
              </Text>
            </View>
            <View style={styles.difficulty}>
              <View style={[styles.difficultyDot, { backgroundColor: tint }]} />
              <Text style={[styles.difficultyText, { color: tint }]}>
                {t(challenge.difficultyLabel)}
              </Text>
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// Pick tonight's dare: three real options dealt at once (spanning Easy →
// Hard when your history allows). Pick one, take it. ⇄ deals a new hand.
export const ChallengeGeneratorScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const acceptChallenge = useChallengeStore((state) => state.acceptChallenge);

  const deal = () => {
    const { watched, bucketList } = useMovieStore.getState();
    return generateChallengeOptions({ watched, bucketList }, HAND_SIZE);
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
      t("Dare on: watch {title} to earn {xp} XP", {
        title: selectedMovie?.title ?? "",
        xp: selected.xpReward,
      }),
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
          <HeaderIconButton
            onPress={reshuffle}
            accessibilityLabel={t("Deal three new ones")}
          >
            <Shuffle size={22} strokeWidth={1.75} color={colors.textPrimary} />
          </HeaderIconButton>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HowItWorks styles={styles} />

        {hand.length === 0 ? (
          <Text style={styles.empty}>
            {t("No dares right now — you've seen it all. Impressive.")}
          </Text>
        ) : (
          <View key={handId} style={styles.hand}>
            {hand.map((challenge, index) => (
              <DareCard
                key={challenge.id}
                challenge={challenge}
                index={index}
                selected={selectedIndex === index}
                onPress={() => select(index)}
                styles={styles}
                colors={colors}
              />
            ))}
          </View>
        )}

        {hand.length > 0 && (
          <Pressable style={styles.reshuffle} onPress={reshuffle} hitSlop={8}>
            <Text style={styles.reshuffleText}>{t("Deal three new ones")}</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={
            selected
              ? t('Take "{name}" · +{xp} XP', {
                  name: t(selected.title),
                  xp: selected.xpReward,
                })
              : t("Pick a dare above")
          }
          variant={selected ? "primary" : "secondary"}
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
      paddingBottom: spacing.lg,
    },

    // How it works: three numbered steps edge to edge, 2px apart.
    steps: {
      flexDirection: "row",
      gap: 2,
    },
    step: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.sm + 2,
      backgroundColor: colors.card,
    },
    stepNumber: {
      ...typography.title,
      fontSize: 18,
      color: colors.textPrimary,
    },
    stepLabel: {
      ...typography.caption,
      flex: 1,
      color: colors.textSecondary,
    },

    hand: {
      gap: 2,
      marginTop: spacing.md,
    },
    // A dare: filled, edge to edge; selected gets a white border.
    card: {
      padding: spacing.md,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: "transparent",
    },
    cardSelected: {
      borderColor: colors.textPrimary,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.sm,
    },
    dareName: {
      ...typography.title,
      fontSize: 18,
      flex: 1,
      color: colors.textPrimary,
    },
    reward: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.rating,
    },
    why: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 20,
    },
    movieRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      marginTop: spacing.md,
    },
    poster: {
      width: 40,
      height: 60,
    },
    movieInfo: {
      flex: 1,
    },
    movieTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    movieMeta: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 1,
    },
    difficulty: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    difficultyDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    difficultyText: {
      ...typography.bodyBold,
      fontSize: 12,
    },

    reshuffle: {
      alignSelf: "center",
      marginTop: spacing.lg,
      padding: spacing.xs,
    },
    reshuffleText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    empty: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });

export default ChallengeGeneratorScreen;

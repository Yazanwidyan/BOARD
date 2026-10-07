import * as Haptics from "expo-haptics";
import { Check, Shuffle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderIconButton, StackHeader } from "../components/ScreenHeader";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { radius, spacing } from "../theme/spacing";
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
  })[difficulty] ?? colors.accentLight;

// One option in the hand: movie poster, difficulty + XP, the movie, and
// the challenge's own reason. Tapping selects it (accent border + check).
const OptionCard = ({
  challenge,
  selected,
  onPress,
  index,
  styles,
  colors,
}) => {
  const movie = getMovieById(challenge.targetMovieId);
  const tint = difficultyColor(challenge.difficulty, colors);

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(220)}>
      <Pressable
        style={[styles.option, selected && styles.optionSelected]}
        onPress={onPress}
      >
        {movie && <MoviePoster uri={movie.poster} style={styles.poster} />}
        <View style={styles.optionInfo}>
          <View style={styles.optionTopRow}>
            <View style={[styles.difficulty, { borderColor: `${tint}66` }]}>
              <View style={[styles.difficultyDot, { backgroundColor: tint }]} />
              <Text style={[styles.difficultyText, { color: tint }]}>
                {challenge.difficultyLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.movieTitle} numberOfLines={1}>
            {movie ? movie.title : challenge.title}
          </Text>
          {movie && (
            <Text style={styles.movieMeta} numberOfLines={1}>
              {movie.year} · {formatRuntime(movie.runtime)} · {movie.genres[0]}
            </Text>
          )}
          <Text style={styles.description} numberOfLines={2}>
            {challenge.description}
          </Text>
        </View>
        {selected && (
          <View style={styles.check}>
            <Check size={14} color={colors.selectedText} strokeWidth={3} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// "Draft" a challenge: three real options dealt at once (spanning Easy →
// Hard when your history allows), pick one, accept. ⇄ deals a new hand
// instantly — no fake "analyzing…" wait.
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

  const handleAccept = () => {
    if (!selected) return;
    acceptChallenge(selected);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast("Challenge accepted", {
      tone: "success",
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StackHeader
        title="New challenge"
        onBack={() => navigation.goBack()}
        right={
          <HeaderIconButton onPress={reshuffle}>
            <Shuffle size={22} strokeWidth={1.75} color={colors.textPrimary} />
          </HeaderIconButton>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.introText}>
            Pick the one that sounds most fun tonight.
          </Text>
        </View>

        {hand.length === 0 ? (
          <Text style={styles.empty}>
            No challenges right now — you&apos;ve seen it all. Impressive.
          </Text>
        ) : (
          <View key={handId} style={styles.hand}>
            {hand.map((challenge, index) => (
              <OptionCard
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
          <Pressable style={styles.reshuffleLink} onPress={reshuffle}>
            <Shuffle size={14} color={colors.textSecondary} />
            <Text style={styles.reshuffleText}>Deal three new ones</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={selected ? "Accept challenge" : "Select a challenge"}
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
      padding: spacing.md,
    },
    intro: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
      marginBottom: spacing.md,
    },
    introText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    hand: {
      gap: spacing.sm,
    },
    option: {
      flexDirection: "row",
      gap: spacing.md,
      padding: spacing.sm + 2,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: "transparent",
    },
    optionSelected: {
      borderColor: colors.textPrimary,
      backgroundColor: colors.cardElevatedLight,
    },
    poster: {
      width: 64,
      aspectRatio: 2 / 3,
    },
    optionInfo: {
      flex: 1,
      gap: 3,
    },
    optionTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
    movieTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
      marginTop: 2,
    },
    movieMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    description: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    // On the poster's corner, so it never covers the XP on the right.
    check: {
      position: "absolute",
      top: spacing.sm + 4,
      left: spacing.sm + 4,
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.selected,
    },
    reshuffleLink: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: 6,
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
    },
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      backgroundColor: colors.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });

export default ChallengeGeneratorScreen;

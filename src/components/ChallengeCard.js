import { StyleSheet, Text, View } from "react-native";

import { getMovieById } from "../data/movies";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { PrimaryButton } from "./PrimaryButton";
import { MoviePoster } from "./MoviePoster";

const DIFFICULTY_COLOR = (colors) => ({
  EASY: colors.success,
  MEDIUM: colors.rating,
  HARD: colors.danger,
  EXTREME: colors.accentLight,
});

// Two modes: "reveal" (fresh out of the generator — Accept / Give Me
// Another) and "active" (already accepted — a single Continue action).
// Same card either way so a challenge always looks the same wherever it
// shows up (Home, Challenges tab, Movie Details).
export const ChallengeCard = ({
  challenge,
  mode = "active",
  onAccept,
  onSkip,
  onContinue,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const difficultyColor = DIFFICULTY_COLOR(colors)[challenge.difficulty];
  const movie = getMovieById(challenge.targetMovieId);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {challenge.title}
        </Text>
        <View style={[styles.difficultyPill, { borderColor: difficultyColor }]}>
          <Text style={[styles.difficultyText, { color: difficultyColor }]}>
            {challenge.difficultyLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{challenge.description}</Text>

      {movie && (
        <View style={styles.movieRow}>
          <MoviePoster uri={movie.poster} radius={radius.xs} style={styles.moviePoster} />
          <View style={styles.movieInfo}>
            <Text style={styles.movieTitle} numberOfLines={1}>
              {movie.title}
            </Text>
            <Text style={styles.movieMeta}>{movie.year}</Text>
          </View>
        </View>
      )}

      <View style={styles.xpPill}>
        <Text style={styles.xpText}>+{challenge.xpReward} XP</Text>
      </View>

      {mode === "reveal" ? (
        <View style={styles.actions}>
          <PrimaryButton label="Accept Challenge" onPress={onAccept} />
          <PrimaryButton
            label="Give Me Another"
            variant="ghost"
            dense
            onPress={onSkip}
          />
        </View>
      ) : (
        <PrimaryButton
          label="View Movie"
          variant="secondary"
          dense
          onPress={onContinue}
          style={styles.continueButton}
        />
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
      flex: 1,
    },
    difficultyPill: {
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    difficultyText: {
      ...typography.label,
      fontSize: 10,
    },
    description: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 20,
      marginTop: spacing.sm,
    },
    movieRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.cardElevatedLight,
      borderRadius: radius.sm,
      padding: spacing.sm,
      marginTop: spacing.md,
    },
    moviePoster: {
      width: 40,
      aspectRatio: 2 / 3,
    },
    movieInfo: {
      flex: 1,
      gap: 2,
    },
    movieTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    movieMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    xpPill: {
      alignSelf: "flex-start",
      backgroundColor: colors.successSoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      marginTop: spacing.md,
    },
    xpText: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.success,
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    continueButton: {
      marginTop: spacing.md,
    },
  });

export default ChallengeCard;

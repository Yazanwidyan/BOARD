import { Film } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { getMovieById } from "../data/movies";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { PrimaryButton } from "./PrimaryButton";
import { MoviePoster } from "./MoviePoster";

// Two modes: "reveal" (fresh out of the generator — Accept / Give Me
// Another) and "active" (already accepted — View Movie / New Challenge).
// Same card either way so a challenge always looks the same wherever it
// shows up (Home, Decide, Movie Details).
export const ChallengeCard = ({
  challenge,
  mode = "active",
  onAccept,
  onSkip,
  onContinue,
  onNewChallenge,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const movie = getMovieById(challenge.targetMovieId);

  return (
    <View style={styles.card}>
      {movie && (
        <MoviePoster
          uri={movie.poster}
          radius={radius.sm}
          shadow
          style={styles.decoPoster}
        />
      )}

      <View style={styles.pillRow}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{challenge.difficultyLabel}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>+{challenge.xpReward} XP</Text>
        </View>
      </View>

      <Text style={styles.title}>{challenge.title}</Text>
      <Text style={styles.description}>{challenge.description}</Text>

      {movie && (
        <View style={styles.movieLine}>
          <Film size={14} color="rgba(255, 255, 255, 0.85)" />
          <Text style={styles.movieLineText} numberOfLines={1}>
            {movie.title} · {movie.year}
          </Text>
        </View>
      )}

      {mode === "reveal" ? (
        <View style={styles.actions}>
          <PrimaryButton label="Accept Challenge" variant="light" onPress={onAccept} />
          <PrimaryButton
            label="Give Me Another"
            variant="ghost"
            dense
            textStyle={styles.skipText}
            onPress={onSkip}
          />
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <PrimaryButton
            label="View Movie"
            variant="light"
            onPress={onContinue}
            style={styles.flexButton}
          />
          {onNewChallenge && (
            <PrimaryButton
              label="Change"
              variant="ghost"
              onPress={onNewChallenge}
              style={styles.changeButton}
              textStyle={styles.skipText}
            />
          )}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      padding: spacing.md,
      overflow: "hidden",
    },
    decoPoster: {
      position: "absolute",
      top: spacing.md,
      right: spacing.md,
      width: 56,
      aspectRatio: 2 / 3,
      transform: [{ rotate: "6deg" }],
    },
    pillRow: {
      flexDirection: "row",
      gap: spacing.xs,
    },
    pill: {
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    pillText: {
      ...typography.label,
      fontSize: 11,
      color: colors.accentContrast,
    },
    title: {
      ...typography.title,
      color: colors.accentContrast,
      marginTop: spacing.sm,
      paddingRight: 68,
    },
    description: {
      ...typography.body,
      color: "rgba(255, 255, 255, 0.85)",
      lineHeight: 20,
      marginTop: spacing.xs,
      paddingRight: 68,
    },
    movieLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.md,
    },
    movieLineText: {
      ...typography.bodyBold,
      color: colors.accentContrast,
      flex: 1,
    },
    actions: {
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    actionsRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    flexButton: {
      flex: 1,
    },
    changeButton: {
      borderWidth: 1.5,
      borderColor: "rgba(255, 255, 255, 0.6)",
      borderRadius: radius.sm,
    },
    skipText: {
      color: "rgba(255, 255, 255, 0.8)",
    },
  });

export default ChallengeCard;

import { Play, Shuffle, Sparkles } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { getMovieById } from "../data/movies";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";

// Two modes: "reveal" (fresh out of the generator — Accept / Give Me
// Another) and "active" (already accepted — Watch Movie / Change). Same
// card either way so a challenge always looks the same wherever it shows up
// (Home, Decide, Movie Details). The movie itself is the headline (title,
// year/genre/runtime) with the challenge's own flavor text as a small
// secondary line — the challenge type is how it got picked, not the point.
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
          radius={0}
          shadow
          style={styles.decoPoster}
        />
      )}

      <View style={styles.pillRow}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{challenge.difficultyLabel}</Text>
        </View>
        <View style={styles.xpRow}>
          <Sparkles size={12} color={colors.accentContrast} />
          <Text style={styles.xpText}>{challenge.xpReward} XP</Text>
        </View>
      </View>

      <Text style={styles.title}>{movie ? movie.title : challenge.title}</Text>

      {movie && (
        <Text style={styles.metaText} numberOfLines={1}>
          {movie.year} · {movie.genres[0]} · {formatRuntime(movie.runtime)}
        </Text>
      )}

      <View style={styles.flavorRow}>
        <Sparkles size={12} color="rgba(255, 255, 255, 0.85)" />
        <Text style={styles.description}>{challenge.description}</Text>
      </View>

      {mode === "reveal" ? (
        <View style={styles.actions}>
          <PrimaryButton
            label="Accept Challenge"
            variant="light"
            onPress={onAccept}
          />
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
            label="Watch Movie"
            variant="light"
            icon={<Play size={16} color={colors.accent} fill={colors.accent} />}
            onPress={onContinue}
            style={styles.flexButton}
          />
          {onNewChallenge && (
            <PrimaryButton
              label="Change"
              variant="ghost"
              icon={<Shuffle size={16} color={colors.accentContrast} />}
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
      borderRadius: radius.sm,
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
      alignItems: "center",
      gap: spacing.sm,
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
    xpRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    xpText: {
      ...typography.label,
      fontSize: 11,
      color: colors.accentContrast,
    },
    title: {
      ...typography.hero,
      color: colors.accentContrast,
      marginTop: spacing.sm,
      paddingRight: 68,
    },
    metaText: {
      ...typography.caption,
      color: "rgba(255, 255, 255, 0.75)",
      marginTop: 2,
      paddingRight: 68,
    },
    flavorRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      marginTop: spacing.sm,
      paddingRight: 68,
    },
    description: {
      ...typography.body,
      flex: 1,
      color: "rgba(255, 255, 255, 0.85)",
      lineHeight: 20,
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

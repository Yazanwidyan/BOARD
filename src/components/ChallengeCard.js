import { Pressable, StyleSheet, Text, View } from "react-native";

import { getMovieById } from "../data/movies";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";

// The challenge as a smooth, simple card: dotted lines top and bottom, the
// dare and the movie it points at, and quiet text actions — no big button.
// Two modes: "reveal" (fresh from the generator — Accept / another) and
// "active" (accepted — View details / change). Used on Home and Decide.
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
  const difficultyColor =
    {
      EASY: colors.success,
      MEDIUM: colors.rating,
      HARD: colors.danger,
    }[challenge.difficulty] ?? colors.accentLight;

  const isReveal = mode === "reveal";
  const primary = isReveal ? onAccept : onContinue;
  const secondary = isReveal ? onSkip : onNewChallenge;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={primary}
    >
      <View style={styles.row}>
        {movie && <MoviePoster uri={movie.poster} style={styles.poster} />}
        <View style={styles.text}>
          <View style={styles.labelRow}>
            <Text style={styles.eyebrow}>
              {isReveal ? "New dare" : "Your dare"}
            </Text>
            <View style={[styles.dot, { backgroundColor: difficultyColor }]} />
            <Text style={styles.difficulty}>{challenge.difficultyLabel}</Text>
          </View>
          <Text style={styles.dare} numberOfLines={3}>
            {challenge.description}
          </Text>
          {movie && (
            <Text style={styles.movie} numberOfLines={1}>
              {movie.title} · {movie.year}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.link} onPress={primary} hitSlop={8}>
          <Text style={styles.linkText}>
            {isReveal ? "Accept" : "View details"}
          </Text>
        </Pressable>
        {secondary && (
          <Pressable
            style={styles.link}
            onPress={secondary}
            hitSlop={8}
            accessibilityLabel={isReveal ? "Give me another" : "Change dare"}
          >
            <Text style={styles.secondaryText}>
              {isReveal ? "Another" : "Change"}
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};

// No dare yet: the same card, with a filled placeholder where the poster
// goes and one quiet link.
export const ChallengePrompt = ({ onStart }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onStart}
    >
      <View style={styles.row}>
        <View style={[styles.poster, styles.placeholder]}>
          <Text style={styles.placeholderMark}>?</Text>
        </View>
        <View style={styles.text}>
          <Text style={styles.eyebrow}>Tonight&apos;s dare</Text>
          <Text style={styles.dare}>No dare yet</Text>
          <Text style={styles.movie}>
            Three secret challenges are waiting. Pick one.
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.link} onPress={onStart} hitSlop={8}>
          <Text style={styles.linkText}>Start a dare</Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      paddingVertical: spacing.md,
      borderTopWidth: 1.5,
      borderBottomWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.border,
      // Some Android versions only draw dashes when there's a radius.
      borderRadius: 1,
    },
    pressed: {
      opacity: 0.8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    poster: {
      width: 52,
      height: 78,
    },
    text: {
      flex: 1,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    eyebrow: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginLeft: 2,
    },
    difficulty: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    dare: {
      ...typography.bodyBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
      marginTop: 4,
    },
    movie: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 3,
    },
    // A filled square where the poster will go.
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    placeholderMark: {
      ...typography.title,
      fontSize: 22,
      color: colors.textMuted,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.md,
    },
    link: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    linkText: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    secondaryText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
  });

export default ChallengeCard;

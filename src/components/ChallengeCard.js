import { Shuffle, Sparkles } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getMovieById } from "../data/movies";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";

const NOTCH_SIZE = 24;
const DASH_COUNT = 22;

// A cinema ticket: the "show" on top (poster, movie, the
// challenge's flavor text), a perforated tear line with half-circle notches,
// and a stub holding the XP reward and actions. Two modes: "reveal" (fresh
// out of the generator — Accept / Give Me Another) and "active" (already
// accepted — View Details / Change). Same card on Home, Decide and the
// generator so a challenge always looks the same. The notches are
// circles filled with `notchColor` and clipped by
// the card's edge, so they need to match whatever surface the card sits on
// (every current screen uses `colors.background`).
export const ChallengeCard = ({
  challenge,
  mode = "active",
  onAccept,
  onSkip,
  onContinue,
  onNewChallenge,
  notchColor,
}) => {
  const colors = useColors();
  const styles = createStyles(colors, notchColor ?? colors.background);
  const movie = getMovieById(challenge.targetMovieId);
  const difficultyColor =
    {
      EASY: colors.success,
      MEDIUM: colors.rating,
      HARD: colors.danger,
    }[challenge.difficulty] ?? colors.accentLight;

  const isReveal = mode === "reveal";
  const secondaryAction = isReveal ? onSkip : onNewChallenge;

  return (
    <View style={styles.card}>
      <View style={styles.show}>
        <View style={styles.showRow}>
          {movie && (
            <MoviePoster
              uri={movie.poster}
              radius={radius.md}
              style={styles.poster}
            />
          )}
          <View style={styles.info}>
            <View style={styles.eyebrowRow}>
              <View
                style={[
                  styles.difficultyDot,
                  { backgroundColor: difficultyColor },
                ]}
              />
              <Text style={styles.eyebrow}>
                CHALLENGE · {challenge.difficultyLabel.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {movie ? movie.title : challenge.title}
            </Text>
            {movie && (
              <Text style={styles.metaText} numberOfLines={1}>
                {movie.year} · {movie.genres[0]} ·{" "}
                {formatRuntime(movie.runtime)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.flavorRow}>
          <Sparkles size={12} color={colors.accentContrast} />
          <Text style={styles.description}>{challenge.description}</Text>
        </View>
      </View>

      <View style={styles.tearLine}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.dashes}>
          {Array.from({ length: DASH_COUNT }, (_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      <View style={styles.stub}>
        <View style={styles.reward}>
          <Text style={styles.rewardLabel}>DIFFICULTY</Text>
          <Text style={styles.rewardValue}>{challenge.difficultyLabel}</Text>
        </View>
        <PrimaryButton
          label={isReveal ? "Accept" : "View Details"}
          variant="light"
          onPress={isReveal ? onAccept : onContinue}
          style={styles.mainButton}
          contentStyle={styles.mainButtonContent}
        />
        {secondaryAction && (
          <Pressable
            style={styles.shuffleButton}
            onPress={secondaryAction}
            hitSlop={6}
            accessibilityLabel={
              isReveal ? "Give me another" : "Change challenge"
            }
          >
            <Shuffle size={18} color={colors.accentContrast} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors, notchColor) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      overflow: "hidden",
    },
    show: {
      padding: spacing.md,
    },
    showRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    poster: {
      width: 64,
      aspectRatio: 2 / 3,
    },
    info: {
      flex: 1,
      gap: 4,
    },
    eyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    difficultyDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    eyebrow: {
      ...typography.label,
      color: "rgba(255, 255, 255, 0.85)",
    },
    title: {
      ...typography.title,
      color: colors.accentContrast,
    },
    metaText: {
      ...typography.caption,
      color: "rgba(255, 255, 255, 0.8)",
    },
    flavorRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      marginTop: spacing.md,
    },
    description: {
      ...typography.body,
      flex: 1,
      fontStyle: "italic",
      color: colors.accentContrast,
      lineHeight: 20,
    },
    tearLine: {
      height: NOTCH_SIZE,
      justifyContent: "center",
    },
    notch: {
      position: "absolute",
      width: NOTCH_SIZE,
      height: NOTCH_SIZE,
      borderRadius: NOTCH_SIZE / 2,
      backgroundColor: notchColor,
    },
    notchLeft: {
      left: -NOTCH_SIZE / 2,
    },
    notchRight: {
      right: -NOTCH_SIZE / 2,
    },
    dashes: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginHorizontal: NOTCH_SIZE / 2 + spacing.sm,
    },
    dash: {
      width: 6,
      height: 1.5,
      borderRadius: 1,
      backgroundColor: "rgba(255, 255, 255, 0.45)",
    },
    stub: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
    },
    reward: {
      marginRight: "auto",
    },
    rewardLabel: {
      ...typography.label,
      fontSize: 11,
      color: "rgba(255, 255, 255, 0.75)",
    },
    rewardValue: {
      ...typography.title,
      color: colors.accentContrast,
    },
    mainButton: {
      flexShrink: 1,
    },
    mainButtonContent: {
      paddingVertical: 10,
    },
    shuffleButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default ChallengeCard;

import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { getRanksFromWatching } from "../utils/ranks";
import { countFinishedDares } from "../utils/useRanks";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";
import { t } from "../i18n";

// The perforation between the ticket and its stub: a column of dots, with
// a half-circle bitten out of the top and bottom edges (in the page's
// colour, so it reads as a cut).
const PERFORATION_DOTS = 16;
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

// A dare's number on its ticket: № 007.
const ticketNumber = (number) => `№ ${String(number).padStart(3, "0")}`;

// The challenge as a cinema ticket: "Admit one" and the dare's number, how
// hard it is, the dare and its movie, with quiet text actions — then the
// perforation, and the stub with the movie's poster and the ranks it earns.
// Two modes: "reveal" (fresh from the generator — Accept / another) and
// "active" (accepted — View details / change). Used on Home.
export const ChallengeCard = ({
  challenge,
  mode = "active",
  onAccept,
  onSkip,
  onContinue,
  onNewChallenge,
}) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const movie = getMovieById(challenge.targetMovieId);
  // The ranks watching it (and so finishing the dare) would really earn
  // you now — worked out live, so it stays true as your history changes.
  const watched = useMovieStore((state) => state.watched);
  const history = useChallengeStore((state) => state.history);
  const rankGain = getRanksFromWatching(
    watched,
    challenge.targetMovieId,
    countFinishedDares(history),
    { finishesDare: true },
  ).length;
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
      style={({ pressed }) => [styles.ticket, pressed && styles.pressed]}
      onPress={primary}
    >
      <View style={styles.main}>
        <View style={styles.topRow}>
          <Text style={styles.admit}>{isReveal ? t("New dare") : t("Admit one")}</Text>
          <Text style={styles.number}>{ticketNumber(history.length + 1)}</Text>
        </View>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: difficultyColor }]} />
          <Text style={styles.difficulty}>{t(challenge.difficultyLabel)}</Text>
        </View>
        <Text style={styles.dare} numberOfLines={3}>
          {challenge.description}
        </Text>
        {movie && (
          <Text style={styles.movie} numberOfLines={1}>
            {movie.title} · {movie.year}
          </Text>
        )}
        <View style={styles.actions}>
          <Pressable style={styles.link} onPress={primary} hitSlop={8}>
            <Text style={styles.linkText}>
              {isReveal ? t("Accept") : t("View details")}
            </Text>
          </Pressable>
          {secondary && (
            <Pressable
              style={styles.link}
              onPress={secondary}
              hitSlop={8}
              accessibilityLabel={
                isReveal ? t("Give me another") : t("Change dare")
              }
            >
              <Text style={styles.secondaryText}>
                {isReveal ? t("Another") : t("Change")}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <Perforation styles={styles} />

      <View style={styles.stub}>
        {movie ? (
          <MoviePoster uri={movie.poster} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.placeholder]}>
            <Text style={styles.placeholderMark}>?</Text>
          </View>
        )}
        {rankGain > 0 && (
          <Text style={styles.reward} numberOfLines={1}>
            {rankGain === 1 ? t("+1 rank") : t("+{count} ranks", { count: rankGain })}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

// No dare yet: a blank ticket — a "?" on the stub, and one link.
export const ChallengePrompt = ({ onStart }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const history = useChallengeStore((state) => state.history);
  return (
    <Pressable
      style={({ pressed }) => [styles.ticket, pressed && styles.pressed]}
      onPress={onStart}
    >
      <View style={styles.main}>
        <View style={styles.topRow}>
          <Text style={styles.admit}>{t("Tonight's dare")}</Text>
          <Text style={styles.number}>{ticketNumber(history.length + 1)}</Text>
        </View>
        <Text style={styles.dare}>{t("No dare yet")}</Text>
        <Text style={styles.movie}>{t("Watch it, earn ranks")}</Text>
        <View style={styles.actions}>
          <Pressable style={styles.link} onPress={onStart} hitSlop={8}>
            <Text style={styles.linkText}>{t("Start a dare")}</Text>
          </Pressable>
        </View>
      </View>

      <Perforation styles={styles} />

      <View style={styles.stub}>
        <View style={[styles.poster, styles.placeholder]}>
          <Text style={styles.placeholderMark}>?</Text>
        </View>
      </View>
    </Pressable>
  );
};

const NOTCH = 20;

const createStyles = (colors) =>
  StyleSheet.create({
    ticket: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    pressed: {
      opacity: 0.8,
    },
    main: {
      flex: 1,
      padding: spacing.md,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    // "ADMIT ONE", in gold, like the print on a real ticket.
    admit: {
      ...typography.label,
      letterSpacing: 1.4,
      color: colors.rating,
    },
    number: {
      ...typography.label,
      letterSpacing: 1,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
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
      ...typography.caption,
      fontSize: 12,
      lineHeight: 16,
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
      lineHeight: 19,
      color: colors.textPrimary,
    },
    secondaryText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
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
    stub: {
      width: 96,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingEnd: spacing.sm,
    },
    poster: {
      width: 56,
      height: 84,
    },
    // A plain tile where the poster will go.
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
      borderRadius: shape.poster,
    },
    placeholderMark: {
      ...typography.title,
      fontSize: 24,
      lineHeight: 30,
      color: colors.textMuted,
    },
    reward: {
      ...typography.bodyBold,
      fontSize: 12,
      lineHeight: 16,
      color: colors.rating,
    },
  });

export default ChallengeCard;

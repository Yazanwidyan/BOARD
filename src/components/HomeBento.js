import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Trophy, UserPlus, Users } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useFriends } from "../store/friendsStore";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";
import { buildRecap, getRecapPeriods } from "../utils/recap";
import { getMilestones } from "../utils/milestones";
import { useRankSummary } from "../utils/useRanks";
import { Text } from "./AppText";
import { FriendAvatar } from "./FriendAvatar";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";

// Home's cards below the mixes: watching with friends, Replay (your month)
// and your progress (one row, opening Profile).
export const BENTO_GAP = spacing.md;
const FACES = 5;
const LOVED_SHOWN = 4;
// Replay's colours: a bold sweep, like a year-in-review.
const REPLAY_COLORS = ["#E0245E", "#F0642B", "#7B3FE4"];

// A card: rounded, a step above the page, pressable.
const Card = ({ onPress, style, children, accessibilityLabel }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Pressable>
  );
};

// Films your friends tiered S or A that you haven't watched, the most loved
// first.
const friendsFavourites = (friends, watchedIds) => {
  const counts = new Map();
  friends.forEach((friend) =>
    (friend.watched ?? []).forEach((entry) => {
      if ((entry.tier === "S" || entry.tier === "A") && !watchedIds.has(entry.movieId))
        counts.set(entry.movieId, (counts.get(entry.movieId) ?? 0) + 1);
    }),
  );
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([movieId]) => getMovieById(movieId))
    .filter(Boolean);
};

// Watch with friends — the same night, shared: your friends' faces, what
// they loved that you haven't seen, and Start a night (Watch together). No
// friends yet: find some. `showFaces` false: no faces (the friends page has
// them just above).
export const FriendsNightCard = ({ navigation, style, showFaces = true }) => {
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const { friends } = useFriends();
  const watched = useMovieStore((state) => state.watched);

  if (friends.length === 0) {
    return (
      <Card onPress={() => navigation.navigate("Friends")} style={style} accessibilityLabel={t("Find friends")}>
        <View style={styles.headRow}>
          <View style={styles.roundIcon}>
            <UserPlus size={20} color={colors.textPrimary} strokeWidth={2} />
          </View>
          <View style={styles.headWords}>
            <Text style={styles.cardTitle}>{t("Find friends and watch together")}</Text>
            <Text style={styles.cardHint}>{t("Compare taste and see what they're watching")}</Text>
          </View>
        </View>
      </Card>
    );
  }

  const loved = friendsFavourites(friends, new Set(watched.map((entry) => entry.movieId))).slice(0, LOVED_SHOWN);
  return (
    <Card onPress={() => navigation.navigate("FriendsHub")} style={style} accessibilityLabel={t("Watch with friends")}>
      <View style={styles.headRow}>
        {showFaces && (
        <View style={styles.faces}>
          {friends.slice(0, FACES).map((friend, index) => (
            <FriendAvatar
              key={friend.id}
              friend={friend}
              size={34}
              style={[index > 0 && styles.faceOverlap, { borderColor: colors.card }]}
            />
          ))}
        </View>
        )}
        <View style={styles.headWords}>
          <Text style={styles.cardTitle}>{t("Movie night")}</Text>
          <Text style={styles.cardHint} numberOfLines={2}>
            {t("Start a night for the group, or join one with a code")}
          </Text>
        </View>
      </View>
      {loved.length > 0 && (
        <>
          <Text style={styles.smallLabel}>{t("Your friends loved")}</Text>
          <View style={styles.lovedRow}>
            {loved.map((movie) => (
              <Pressable
                key={movie.id}
                style={({ pressed }) => [styles.lovedPoster, pressed && styles.pressed]}
                onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
                accessibilityRole="button"
                accessibilityLabel={movie.title}
              >
                <MoviePoster uri={movie.poster} style={styles.lovedImage} />
              </Pressable>
            ))}
            {/* Keep the posters' size when there are fewer than four. */}
            {Array.from({ length: LOVED_SHOWN - loved.length }, (_, index) => (
              <View key={index} style={styles.lovedPoster} />
            ))}
          </View>
        </>
      )}
      <PrimaryButton
        label={t("Start a night")}
        icon={<Users size={18} color={colors.brandText} strokeWidth={2} />}
        onPress={() => navigation.navigate("WatchTogether")}
        style={styles.nightButton}
      />
    </Card>
  );
};

// Replay: your month in one bold card — how many, how long, your top genre
// and your favourites fanned out — opening the recap. Nothing this month
// yet: last month's, in this one's first week.
export const ReplayCard = ({ onPress, language, style }) => {
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const watched = useMovieStore((state) => state.watched);
  const periods = getRecapPeriods();
  const choices = [periods[0], new Date().getDate() <= 7 ? periods[1] : null].filter(Boolean);
  const found = choices
    .map((period) => ({ period, recap: buildRecap(watched, period) }))
    .find(({ recap }) => recap.count > 0);
  if (!found) return null;
  const { period, recap } = found;
  const month = period.date.toLocaleDateString(language === "ar" ? "ar" : "en", { month: "long" });
  const topGenre = recap.topGenres[0]?.key;
  const posters = recap.favourites.slice(0, 3).map(({ movie }) => movie);

  return (
    <Pressable
      style={({ pressed }) => [styles.replay, style, pressed && styles.pressed]}
      onPress={() => onPress(period.key)}
      accessibilityRole="button"
      accessibilityLabel={`${t("Replay")} ${month}`}
    >
      <LinearGradient
        colors={REPLAY_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.replayWords}>
        <Text style={styles.replayLabel}>{t("Replay")}</Text>
        <Text style={styles.replayMonth} numberOfLines={1} adjustsFontSizeToFit>
          {month}
        </Text>
        <Text style={styles.replayStat}>
          {t("{count} films", { count: recap.count })}
          {recap.minutes > 0 ? ` · ${formatRuntime(recap.minutes)}` : ""}
        </Text>
        {!!topGenre && (
          <Text style={styles.replayStat}>{t("Mostly {genre}", { genre: t(topGenre) })}</Text>
        )}
      </View>
      {/* Your favourites, fanned. */}
      <View style={styles.fan}>
        {posters.map((movie, index) => (
          <MoviePoster
            key={movie.id}
            uri={movie.poster}
            style={[
              styles.fanPoster,
              { zIndex: 3 - index, transform: [{ translateX: index * -26 }, { rotate: `${index * -7 + 4}deg` }] },
            ]}
          />
        ))}
      </View>
    </Pressable>
  );
};

// Your progress, in one row: your title, your ranks and your milestones —
// opening Profile, where your achievements are.
export const ProgressRow = ({ onPress, style }) => {
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const watched = useMovieStore((state) => state.watched);
  const summary = useRankSummary();
  const medals = getMilestones(watched).filter((milestone) => milestone.reachedAt).length;
  return (
    <Card onPress={onPress} style={style} accessibilityLabel={t("Achievements")}>
      <View style={styles.headRow}>
        <View style={[styles.roundIcon, { backgroundColor: `${colors.rating}2E` }]}>
          <Trophy size={20} color={colors.rating} strokeWidth={2} />
        </View>
        <View style={styles.headWords}>
          <Text style={styles.cardTitle}>{t(summary.title.name)}</Text>
          <Text style={styles.cardHint} numberOfLines={1}>
            {t("{count} ranks", { count: summary.count })} · {t("{count} medals", { count: medals })}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} strokeWidth={2.4} />
      </View>
    </Card>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      padding: spacing.md + 2,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      overflow: "hidden",
    },
    pressed: {
      opacity: 0.8,
    },
    headRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    headWords: {
      flex: 1,
      gap: 2,
    },
    roundIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.buttonFill,
      borderRadius: 20,
    },
    cardTitle: {
      fontFamily: fonts.bold,
      fontSize: 16,
      lineHeight: 21,
      color: colors.textPrimary,
    },
    cardHint: {
      ...typography.caption,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    faces: {
      flexDirection: "row",
    },
    faceOverlap: {
      marginStart: -12,
      borderWidth: 2,
    },
    smallLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.xs + 2,
    },
    lovedRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    lovedPoster: {
      flex: 1,
    },
    lovedImage: {
      width: "100%",
      height: undefined,
      aspectRatio: 2 / 3,
    },
    nightButton: {
      marginTop: spacing.md,
    },
    replay: {
      height: 168,
      flexDirection: "row",
      borderRadius: shape.card,
      overflow: "hidden",
    },
    replayWords: {
      flex: 1,
      padding: spacing.md + 2,
      justifyContent: "flex-end",
    },
    replayLabel: {
      ...typography.section,
      color: "rgba(255, 255, 255, 0.85)",
    },
    replayMonth: {
      fontFamily: fonts.extraBold,
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.5,
      color: "#FFFFFF",
    },
    replayStat: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: "rgba(255, 255, 255, 0.92)",
    },
    fan: {
      width: 150,
      justifyContent: "center",
    },
    fanPoster: {
      position: "absolute",
      end: spacing.md + 2,
      width: 72,
      height: 108,
    },
  });

import {
  ChevronRight,
  Compass,
  RotateCw,
  Shuffle,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import * as Haptics from "expo-haptics";

import { ChallengeCard } from "../components/ChallengeCard";
import { CollectionContinueCard } from "../components/CollectionContinueCard";
import { RankGemIcon } from "../components/icons/RankGemIcon";
import { TargetIcon } from "../components/icons/TabIcons";
import { DockHeader, useDockHeader } from "../components/ScreenHeader";
import { MoviePoster } from "../components/MoviePoster";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { TonightsPickCard } from "../components/TonightsPickCard";
import { getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getBadges, getLatestBadge } from "../utils/badges";
import {
  getCompletedCollectionsCount,
  getInProgressCollections,
} from "../utils/collections";
import { getRank } from "../utils/league";
import { MOODS, pickMovieForMood } from "../utils/moods";
import { openChallengeGenerator } from "../utils/openChallengeGenerator";
import {
  DIFFICULTY,
  getChallengeXP,
  getCompletedChallengesCount,
  getLevel,
  getRewatchXP,
  getUserXP,
} from "../utils/xp";

const RECENT_COUNT = 10;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Home's live line — "Friday night, Yazan". Worked out at render, which
// happens whenever any store Home reads changes, so it never goes stale
// for long.
const getTimeGreeting = (date, name) => {
  const hour = date.getHours();
  const part =
    hour < 5
      ? "night"
      : hour < 12
        ? "morning"
        : hour < 17
          ? "afternoon"
          : hour < 21
            ? "evening"
            : "night";
  return `${DAY_NAMES[date.getDay()]} ${part}, ${name}`;
};
const WATCHLIST_COUNT = 10;

// The hardest difficulty the generator actually hands out — so the
// "up to" on the challenge prompt is a real number, not marketing.
const MAX_CHALLENGE_XP = DIFFICULTY.HARD.max;

const DECIDE_MODES = [
  { label: "Swipe", Icon: Shuffle, route: "Swipe" },
  { label: "Spin", Icon: RotateCw, route: "Spin" },
  { label: "Ask AI", Icon: Sparkles, route: "Preferences" },
];

// Home's top slot when there's no Tonight's Pick: the header asks "Bored?",
// so the first thing under it is the way out — straight into Swipe, Spin
// or AI. A brand-new account (nothing watched or saved yet) gets one
// "Start Discovering" button instead, since there's no taste to work from.
const DecideHeroCard = ({ isFreshAccount, navigation, styles, colors }) => {
  const setMoodPick = useMovieStore((state) => state.setMoodPick);

  if (isFreshAccount) {
    return (
      <View style={styles.decideCard}>
        <Text style={styles.decideEyebrow}>WELCOME</Text>
        <Text style={styles.decideTitle}>Find your first movie</Text>
        <Pressable
          style={styles.decideButtonSolid}
          onPress={() => navigation.navigate("Discover")}
        >
          <Compass size={16} color={colors.accent} />
          <Text style={styles.decideButtonTextSolid}>Start Discovering</Text>
        </Pressable>
      </View>
    );
  }

  const pickForMood = (moodKey) => {
    const movie = pickMovieForMood(moodKey);
    if (!movie) return;
    Haptics.selectionAsync();
    setMoodPick(movie.id, moodKey);
  };

  return (
    <View style={styles.decideCard}>
      <Text style={styles.decideEyebrow}>WHAT ARE WE WATCHING?</Text>
      <Text style={styles.decideTitle}>
        Pick a mood, we&apos;ll pick the movie.
      </Text>
      <View style={styles.moodGrid}>
        {MOODS.map((mood) => (
          <Pressable
            key={mood.key}
            style={({ pressed }) => [
              styles.moodChip,
              pressed && styles.moodChipPressed,
            ]}
            onPress={() => pickForMood(mood.key)}
          >
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text style={styles.moodLabel} numberOfLines={1}>
              {mood.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.modesRow}>
        <Text style={styles.modesOr}>or</Text>
        {DECIDE_MODES.map(({ label, Icon, route }) => (
          <Pressable
            key={label}
            style={styles.modeLink}
            onPress={() => navigation.navigate(route)}
            hitSlop={6}
          >
            <Icon size={14} color={colors.accentContrast} />
            <Text style={styles.modeLinkText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

// An empty challenge slot shouldn't take as much room as a full one — one
// slim row instead of the big dashed empty card.
const ChallengePrompt = ({ onPress, styles, colors }) => (
  <Pressable style={styles.promptRow} onPress={onPress}>
    <View style={styles.promptIcon}>
      <TargetIcon size={18} color={colors.accentLight} />
    </View>
    <View style={styles.promptText}>
      <Text style={styles.promptTitle}>Start a challenge</Text>
      <Text style={styles.promptSubtitle}>
        Earn up to +{MAX_CHALLENGE_XP.toLocaleString()} XP
      </Text>
    </View>
    <ChevronRight size={18} color={colors.textSecondary} />
  </Pressable>
);

// Newest-saved first — the freshest "I want to see that" is the likeliest
// pick for tonight.
const WatchlistRail = ({ bucketList, navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  if (bucketList.length === 0) return null;

  const movies = [...bucketList]
    .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
    .slice(0, WATCHLIST_COUNT)
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean);

  return (
    <View style={styles.railSection}>
      <View style={[styles.sectionHeaderRow, styles.railLabelPadding]}>
        <Text style={styles.sectionLabel}>From Your Watchlist</Text>
        <Pressable
          hitSlop={8}
          onPress={() =>
            navigation.navigate("Library", { initialTab: "bucketlist" })
          }
        >
          <Text style={styles.seeAllText}>See All</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {movies.map((movie) => (
          <Pressable
            key={movie.id}
            style={styles.railCard}
            onPress={() =>
              navigation.navigate("MovieDetails", { movieId: movie.id })
            }
          >
            <MoviePoster
              uri={movie.poster}
              radius={0}
              style={styles.railPoster}
            />
            <View style={styles.imdbBadge}>
              <Star size={10} color={colors.rating} fill={colors.rating} />
              <Text style={styles.imdbBadgeText}>
                {movie.rating.toFixed(1)}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

// Replaces the old "Latest Achievement" card: real progress (XP to the next
// level) plus the newest badge's name, in one slim tappable strip.
const ProgressStrip = ({ level, latestBadge, onPress, styles }) => {
  const xpToGo = Math.max(0, Math.ceil(level.requiredXP - level.currentXP));
  return (
    <Pressable style={styles.progressStrip} onPress={onPress}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLevel}>
          Lv {level.level} → {level.level + 1}
        </Text>
        <Text style={styles.progressToGo}>
          {xpToGo.toLocaleString()} XP to go
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${level.progress * 100}%` }]}
        />
      </View>
      {latestBadge && (
        <Text style={styles.progressBadge} numberOfLines={1}>
          Latest badge:{" "}
          <Text style={styles.progressBadgeName}>{latestBadge.label}</Text>
        </Text>
      )}
    </Pressable>
  );
};

const RecentlyWatchedRail = ({ watched, navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  if (watched.length === 0) return null;

  return (
    <View style={styles.railSection}>
      <Text style={[styles.sectionLabel, styles.railLabelPadding]}>
        Recently Watched
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {watched.slice(0, RECENT_COUNT).map((entry) => {
          const movie = getMovieById(entry.movieId);
          if (!movie) return null;
          return (
            <Pressable
              key={entry.movieId}
              style={styles.railCard}
              onPress={() =>
                navigation.navigate("MovieDetails", { movieId: movie.id })
              }
            >
              <MoviePoster
                uri={movie.poster}
                radius={0}
                style={styles.railPoster}
              />
              {entry.rating != null && (
                <View style={styles.userRatingBadge}>
                  <Star
                    size={10}
                    color={colors.accentContrast}
                    fill={colors.accentContrast}
                  />
                  <Text style={styles.userRatingBadgeText}>
                    {entry.rating.toFixed(1)}
                  </Text>
                </View>
              )}
              {(entry.watchCount ?? 1) > 1 && (
                <View style={styles.rewatchBadge}>
                  <Text style={styles.rewatchBadgeText}>
                    ×{entry.watchCount}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export const HomeScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  const displayName = useProfileStore((state) => state.displayName);
  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);
  const skipChallenge = useChallengeStore((state) => state.skipChallenge);
  const challengeHistory = useChallengeStore((state) => state.history);

  const queuedCount = bucketList.length;
  const watchedCount = watched.length;
  const ratedCount = watched.filter((entry) => entry.rating != null).length;
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const completedCollectionsCount = getCompletedCollectionsCount(watchedIds);
  const completedChallengesCount =
    getCompletedChallengesCount(challengeHistory);
  const rewatchedCount = watched.filter(
    (entry) => (entry.watchCount ?? 1) > 1,
  ).length;
  const badges = getBadges({
    watchedCount,
    ratedCount,
    queuedCount,
    completedCollectionsCount,
    completedChallengesCount,
    rewatchedCount,
    watchedIds,
  });
  const earnedBadgeCount = badges.filter((badge) => badge.earned).length;
  const xp = getUserXP({
    watchedCount,
    ratedCount,
    challengeXP: getChallengeXP(challengeHistory),
    rewatchXP: getRewatchXP(watched),
    completedCollectionsCount,
    earnedBadgeCount,
  });
  const rank = getRank(xp);
  const level = getLevel(xp);
  const latestBadge = getLatestBadge(badges);
  const inProgressCollections = getInProgressCollections(watchedIds, 4);
  const isFreshAccount =
    !pickedMovieId &&
    !activeChallenge &&
    watchedCount === 0 &&
    queuedCount === 0;

  const header = useDockHeader();

  const handleCreateChallenge = () => {
    if (activeChallenge) skipChallenge();
    openChallengeGenerator(navigation);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: header.contentInset,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        <View style={[styles.section, styles.firstSection]}>
          {pickedMovieId ? (
            <TonightsPickCard navigation={navigation} />
          ) : (
            <DecideHeroCard
              isFreshAccount={isFreshAccount}
              navigation={navigation}
              styles={styles}
              colors={colors}
            />
          )}
        </View>

        <View style={styles.section}>
          {activeChallenge ? (
            <>
              <Text style={styles.sectionLabel}>Your Challenge</Text>
              <ChallengeCard
                challenge={activeChallenge}
                mode="active"
                onContinue={() =>
                  navigation.navigate("MovieDetails", {
                    movieId: activeChallenge.targetMovieId,
                  })
                }
                onNewChallenge={handleCreateChallenge}
              />
            </>
          ) : (
            <ChallengePrompt
              onPress={handleCreateChallenge}
              styles={styles}
              colors={colors}
            />
          )}
        </View>

        <WatchlistRail bucketList={bucketList} navigation={navigation} />

        {inProgressCollections.length > 0 && (
          <View style={styles.railSection}>
            <View style={[styles.sectionHeaderRow, styles.railLabelPadding]}>
              <Text style={styles.sectionLabel}>Continue a Collection</Text>
              <View style={styles.sectionHeaderActions}>
                {completedCollectionsCount > 0 && (
                  <Pressable
                    hitSlop={8}
                    style={styles.trophyLink}
                    onPress={() =>
                      navigation.navigate("Library", {
                        initialTab: "collections",
                      })
                    }
                  >
                    <Trophy size={12} color={colors.rating} />
                    <Text style={styles.trophyLinkText}>
                      {completedCollectionsCount} completed
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    navigation.navigate("Library", {
                      initialTab: "collections",
                    })
                  }
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </Pressable>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railContent}
            >
              {inProgressCollections.map((collection) => (
                <View key={collection.id} style={styles.collectionCardWrap}>
                  <CollectionContinueCard
                    collection={collection}
                    watchedIds={watchedIds}
                    onPress={() =>
                      navigation.navigate("CollectionDetails", {
                        collectionId: collection.id,
                      })
                    }
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <RecentlyWatchedRail watched={watched} navigation={navigation} />

        <View style={styles.section}>
          <ProgressStrip
            level={level}
            latestBadge={latestBadge}
            onPress={() => navigation.navigate("Profile")}
            styles={styles}
          />
        </View>
      </Animated.ScrollView>
      <ScreenBottomFade />
      <DockHeader
        {...header.props}
        eyebrow={getTimeGreeting(new Date(), displayName)}
        title="Bored? Let's fix that."
        right={
          <Pressable
            style={styles.levelBadge}
            onPress={() => navigation.navigate("Profile")}
          >
            <RankGemIcon size={18} color={rank.color} />
            <Text style={styles.levelBadgeText}>Lv {level.level}</Text>
          </Pressable>
        }
      />
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    levelBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.cardElevatedLight,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    levelBadgeText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    section: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    // Same vertical rhythm as `section`, but no horizontal padding — used
    // for the two horizontal-scroll rails, so the scrollable row itself
    // reaches both screen edges. Only the label above it keeps the normal
    // margin, via railLabelPadding.
    railSection: {
      marginTop: spacing.lg,
    },
    railLabelPadding: {
      paddingHorizontal: spacing.md,
    },
    // The header inset already leaves the gap under the header.
    firstSection: {
      marginTop: 0,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    trophyLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: spacing.sm,
    },
    trophyLinkText: {
      ...typography.label,
      color: colors.rating,
    },
    seeAllText: {
      ...typography.label,
      color: colors.accentLight,
      marginBottom: spacing.sm,
    },
    railContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    collectionCardWrap: {
      width: 220,
    },
    railCard: {
      width: 104,
    },
    railPoster: {
      width: 104,
      aspectRatio: 2 / 3,
    },
    userRatingBadge: {
      position: "absolute",
      top: 6,
      left: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    userRatingBadgeText: {
      ...typography.label,
      fontSize: 10,
      color: colors.accentContrast,
    },
    rewatchBadge: {
      position: "absolute",
      bottom: 6,
      right: 6,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: "rgba(2, 0, 2, 0.65)",
    },
    rewatchBadgeText: {
      ...typography.label,
      fontSize: 10,
      color: "#FFFFFF",
    },
    decideCard: {
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      padding: spacing.md,
    },
    decideEyebrow: {
      ...typography.label,
      color: "rgba(255, 255, 255, 0.8)",
    },
    decideTitle: {
      ...typography.title,
      color: colors.accentContrast,
      marginTop: spacing.xs,
    },
    moodGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    // Three per row: (100% - 2 gaps) / 3, with the gap as a percentage-ish
    // allowance so it holds on any width.
    moodChip: {
      width: "31.5%",
      alignItems: "center",
      gap: 4,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.sm,
      backgroundColor: "rgba(255, 255, 255, 0.16)",
    },
    moodChipPressed: {
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      transform: [{ scale: 0.96 }],
    },
    moodEmoji: {
      fontSize: 22,
    },
    moodLabel: {
      ...typography.label,
      fontSize: 11,
      letterSpacing: 0.2,
      textTransform: "none",
      color: colors.accentContrast,
    },
    modesRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: spacing.md,
      marginTop: spacing.md,
      paddingTop: spacing.sm + 2,
      borderTopWidth: 1,
      borderTopColor: "rgba(255, 255, 255, 0.18)",
    },
    modesOr: {
      ...typography.caption,
      color: "rgba(255, 255, 255, 0.7)",
    },
    modeLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    modeLinkText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.accentContrast,
    },
    decideButtonSolid: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      marginTop: spacing.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.accentContrast,
    },
    decideButtonTextSolid: {
      ...typography.label,
      color: colors.accent,
    },
    promptRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm + 2,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    promptIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(141, 96, 226, 0.16)",
    },
    promptText: {
      flex: 1,
    },
    promptTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    promptSubtitle: {
      ...typography.caption,
      color: colors.rating,
      marginTop: 1,
    },
    imdbBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: colors.scrim,
    },
    imdbBadgeText: {
      ...typography.label,
      fontSize: 10,
      color: colors.rating,
    },
    progressStrip: {
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    progressHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    progressLevel: {
      ...typography.label,
      color: colors.textPrimary,
    },
    progressToGo: {
      ...typography.caption,
      color: colors.accentLight,
    },
    progressTrack: {
      height: 6,
      borderRadius: radius.pill,
      marginTop: spacing.sm,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: radius.pill,
      backgroundColor: colors.accentLight,
    },
    progressBadge: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    progressBadgeName: {
      color: colors.textPrimary,
    },
  });

export default HomeScreen;

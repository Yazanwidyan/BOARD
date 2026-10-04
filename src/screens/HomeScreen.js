import { Compass, Star } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ChallengeCard } from "../components/ChallengeCard";
import { ChallengeEmptyCard } from "../components/ChallengeEmptyCard";
import { CollectionContinueCard } from "../components/CollectionContinueCard";
import { BoardBIcon } from "../components/icons/TabIcons";
import { RankGemIcon } from "../components/icons/RankGemIcon";
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
import { openChallengeGenerator } from "../utils/openChallengeGenerator";
import {
  getChallengeXP,
  getCompletedChallengesCount,
  getLevel,
  getRewatchXP,
  getUserXP,
} from "../utils/xp";

const RECENT_COUNT = 10;

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

  const handleCreateChallenge = () => {
    if (activeChallenge) skipChallenge();
    openChallengeGenerator(navigation);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <BoardBIcon size={20} color={colors.accent} />
            <Text style={styles.brandText}>BOARD</Text>
          </View>
          <Pressable
            style={styles.levelBadge}
            onPress={() => navigation.navigate("Profile")}
          >
            <RankGemIcon size={18} color={rank.color} />
            <Text style={styles.levelBadgeText}>Lv {level.level}</Text>
          </Pressable>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Hey, {displayName}</Text>
          <Text style={styles.title}>Bored? Let&apos;s fix that.</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        {pickedMovieId && (
          <View style={[styles.section, styles.firstSection]}>
            <TonightsPickCard navigation={navigation} />
          </View>
        )}

        {isFreshAccount && (
          <View style={[styles.section, styles.firstSection]}>
            <ChallengeEmptyCard
              title="Nothing to Watch Yet"
              subtitle="Discover movies to build your watchlist and start earning XP."
              buttonLabel="Start Discovering"
              icon={<Compass size={18} color={colors.accentContrast} />}
              onPress={() => navigation.navigate("Discover")}
            />
          </View>
        )}

        <View style={[styles.section, !pickedMovieId && styles.firstSection]}>
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
            <ChallengeEmptyCard onPress={handleCreateChallenge} />
          )}
        </View>

        {inProgressCollections.length > 0 && (
          <View style={styles.railSection}>
            <View style={[styles.sectionHeaderRow, styles.railLabelPadding]}>
              <Text style={styles.sectionLabel}>Continue a Collection</Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  navigation.navigate("Library", { initialTab: "collections" })
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

        {latestBadge && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Latest Achievement</Text>
            <Pressable
              style={styles.achievementCard}
              onPress={() => navigation.navigate("Profile")}
            >
              <RankGemIcon size={40} color={colors.accent} />
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementLabel}>{latestBadge.label}</Text>
                <Text style={styles.achievementSubtitle}>Unlocked</Text>
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <ScreenBottomFade />
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    brandText: {
      ...typography.title,
      fontSize: 15,
      letterSpacing: 1,
      color: colors.textPrimary,
    },
    headerText: {
      marginTop: spacing.sm,
    },
    greeting: {
      ...typography.body,
      color: colors.textSecondary,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: 2,
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
      marginTop: spacing.md,
    },
    // Same vertical rhythm as `section`, but no horizontal padding — used
    // for the two horizontal-scroll rails, so the scrollable row itself
    // reaches both screen edges. Only the label above it keeps the normal
    // margin, via railLabelPadding.
    railSection: {
      marginTop: spacing.md,
    },
    railLabelPadding: {
      paddingHorizontal: spacing.md,
    },
    firstSection: {
      marginTop: spacing.md,
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
    achievementCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: spacing.md,
    },
    achievementInfo: {
      flex: 1,
      gap: 2,
    },
    achievementLabel: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    achievementSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });

export default HomeScreen;

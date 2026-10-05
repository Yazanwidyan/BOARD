import * as Clipboard from "expo-clipboard";
import {
  Award,
  Bell,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Plus,
  Settings as SettingsIcon,
  Share2,
  Star,
  UserPlus,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import { AvatarLevelRing } from "../components/AvatarLevelRing";
import { BottomSheet } from "../components/BottomSheet";
import { RankGemIcon } from "../components/icons/RankGemIcon";
import {
  DockHeader,
  HeaderIconButton,
  useDockHeader,
} from "../components/ScreenHeader";
import { LevelRankCard } from "../components/LevelRankCard";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { showToast } from "../store/toastStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getBadges } from "../utils/badges";
import { getCompletedCollectionsCount } from "../utils/collections";
import { TIERS, getRank } from "../utils/league";
import { getTasteProfile } from "../utils/taste";
import {
  BADGE_XP,
  COLLECTION_XP,
  RATE_XP,
  REWATCH_XP,
  WATCH_XP,
  getChallengeXP,
  getCompletedChallengesCount,
  getLevel,
  getRewatchXP,
  getUserXP,
} from "../utils/xp";

const showAddFriendsStub = () => showToast("Adding friends is coming soon");

const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-placholder.png");
// The taste bar's three genre segments, strongest first.
const GENRE_BAR_COLORS = (colors) => [
  colors.accent,
  colors.accentLight,
  colors.rating,
];

const getHandle = (name) =>
  `@${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") || "you"
  }`;

export const ProfileScreen = ({ navigation, route }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [isLeagueSheetOpen, setIsLeagueSheetOpen] = useState(false);

  // "View Details" on the watched/challenge XP alert deep-links straight
  // into this sheet instead of just landing on the plain profile page.
  useEffect(() => {
    if (route?.params?.openLeagueSheet) {
      setIsLeagueSheetOpen(true);
      navigation.setParams({ openLeagueSheet: undefined });
    }
  }, [route?.params?.openLeagueSheet, navigation]);

  const bucketListEntries = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const displayName = useProfileStore((state) => state.displayName);
  const bio = useProfileStore((state) => state.bio);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  const challengeHistory = useChallengeStore((state) => state.history);

  const queuedCount = bucketListEntries.length;
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
  const header = useDockHeader();

  const taste = getTasteProfile(watched);
  // No earned-at timestamps exist for badges, so "recent" = the most
  // demanding ones earned (same approximation as getLatestBadge).
  const recentBadges = badges
    .filter((badge) => badge.earned)
    .sort((a, b) => b.threshold - a.threshold)
    .slice(0, 3);

  const handleShare = () => {
    const genres = taste.topGenres.map(({ genre }) => genre).join(" · ");
    const four = taste.favoriteFour.map(({ movie }) => movie.title).join(", ");
    const lines = [
      `My BOARD taste card 🎬`,
      genres && `Into: ${genres}`,
      four && `Favorite four: ${four}`,
      `${watchedCount} movies · ${Math.round(taste.minutesWatched / 60)} hours`,
      `Level ${level.level} · ${rank.tier}`,
    ].filter(Boolean);
    Share.share({ message: lines.join("\n") });
  };

  const handleCopyHandle = async () => {
    await Clipboard.setStringAsync(getHandle(displayName));
    showToast("Handle copied", { tone: "success" });
  };

  const goToLibrary = (initialTab) => {
    navigation.navigate("Library", { initialTab });
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: header.contentInset }}
      >
        <View style={styles.profileWrap}>
          {/* Identity: avatar (with its level ring) beside name, handle, bio */}
          <View style={styles.identityRow}>
            <AvatarLevelRing
              source={avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE}
              level={level}
              avatarSize={72}
            />
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              <Pressable onPress={handleCopyHandle} hitSlop={6}>
                <Text style={styles.handle}>
                  {getHandle(displayName)} · Copy
                </Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate("Settings")}
                hitSlop={6}
                style={styles.bioButton}
              >
                {!bio && (
                  <Plus
                    size={12}
                    color={colors.accentLight}
                    strokeWidth={2.4}
                  />
                )}
                <Text
                  style={[styles.bio, !bio && styles.bioPlaceholder]}
                  numberOfLines={2}
                >
                  {bio || "Add a bio"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Favorite Four */}
          <Text style={styles.sectionLabel}>Favorite four</Text>
          <View style={styles.favoriteRow}>
            {Array.from({ length: 4 }, (_, index) => {
              const favorite = taste.favoriteFour[index];
              return favorite ? (
                <Pressable
                  key={favorite.movie.id}
                  style={styles.favoriteSlot}
                  onPress={() =>
                    navigation.navigate("MovieDetails", {
                      movieId: favorite.movie.id,
                    })
                  }
                >
                  <MoviePoster
                    uri={favorite.movie.poster}
                    style={styles.favoritePoster}
                  />
                  <View style={styles.favoriteRating}>
                    <Star
                      size={9}
                      color={colors.accentContrast}
                      fill={colors.accentContrast}
                    />
                    <Text style={styles.favoriteRatingText}>
                      {favorite.rating.toFixed(1)}
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  key={`empty-${index}`}
                  style={[styles.favoriteSlot, styles.favoriteEmpty]}
                  onPress={() => goToLibrary("watched")}
                >
                  <Star size={16} color={colors.textMuted} />
                  <Text style={styles.favoriteEmptyText}>Rate a movie</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Taste */}
          {taste.topGenres.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Taste</Text>
              <View style={styles.tasteCard}>
                <View style={styles.genreBar}>
                  {taste.topGenres.map(({ genre, share }, index) => (
                    <View
                      key={genre}
                      style={{
                        flex: share,
                        backgroundColor: GENRE_BAR_COLORS(colors)[index],
                      }}
                    />
                  ))}
                  <View
                    style={{
                      flex: Math.max(
                        0,
                        1 -
                          taste.topGenres.reduce(
                            (sum, { share }) => sum + share,
                            0,
                          ),
                      ),
                      backgroundColor: colors.surfaceSoft,
                    }}
                  />
                </View>
                <View style={styles.genreLegend}>
                  {taste.topGenres.map(({ genre, share }, index) => (
                    <View key={genre} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          {
                            backgroundColor: GENRE_BAR_COLORS(colors)[index],
                          },
                        ]}
                      />
                      <Text style={styles.legendText}>
                        {genre} {Math.round(share * 100)}%
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.tasteFacts}>
                  {taste.director && (
                    <Pressable
                      style={styles.tasteFact}
                      disabled={!taste.director.collectionId}
                      onPress={() =>
                        navigation.navigate("CollectionDetails", {
                          collectionId: taste.director.collectionId,
                        })
                      }
                    >
                      <Clapperboard size={15} color={colors.accentLight} />
                      <View style={styles.tasteFactText}>
                        <Text style={styles.tasteFactLabel}>
                          Most-watched director
                        </Text>
                        <Text style={styles.tasteFactValue} numberOfLines={1}>
                          {taste.director.name} · {taste.director.count}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                  {taste.decade && (
                    <Pressable
                      style={styles.tasteFact}
                      disabled={!taste.decade.collectionId}
                      onPress={() =>
                        navigation.navigate("CollectionDetails", {
                          collectionId: taste.decade.collectionId,
                        })
                      }
                    >
                      <CalendarDays size={15} color={colors.accentLight} />
                      <View style={styles.tasteFactText}>
                        <Text style={styles.tasteFactLabel}>
                          Favorite decade
                        </Text>
                        <Text style={styles.tasteFactValue}>
                          The {taste.decade.label}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                </View>

                {taste.criticDelta != null && (
                  <View style={styles.criticRow}>
                    <Star
                      size={14}
                      color={colors.rating}
                      fill={colors.rating}
                    />
                    <Text style={styles.criticText}>
                      {Math.abs(taste.criticDelta) < 0.15
                        ? "You rate right in line with IMDb."
                        : taste.criticDelta < 0
                          ? `You rate ${Math.abs(taste.criticDelta).toFixed(1)} below IMDb — tough critic.`
                          : `You rate ${taste.criticDelta.toFixed(1)} above IMDb — generous.`}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Headline stats */}
          <View style={styles.statsRow}>
            <Pressable
              style={styles.statTile}
              onPress={() => goToLibrary("watched")}
            >
              <Text style={styles.statValue}>{watchedCount}</Text>
              <Text style={styles.statLabel}>movies watched</Text>
            </Pressable>
            <Pressable
              style={styles.statTile}
              onPress={() => goToLibrary("watched")}
            >
              <Text style={styles.statValue}>
                {Math.round(taste.minutesWatched / 60)}h
              </Text>
              <Text style={styles.statLabel}>watch time</Text>
            </Pressable>
            <Pressable
              style={styles.statTile}
              onPress={() => navigation.navigate("Badges")}
            >
              <Text style={styles.statValue}>{earnedBadgeCount}</Text>
              <Text style={styles.statLabel}>badges</Text>
            </Pressable>
          </View>

          {/* Level (numeric, fine-grained) and Rank (permanent, coarse) are
              kept visually distinct per the product spec — same underlying
              XP, two different lenses on it. */}
          <View style={styles.progressWrap}>
            <LevelRankCard
              level={level}
              rank={rank}
              onPress={() => setIsLeagueSheetOpen(true)}
            />
          </View>

          {/* Recent badges */}
          {recentBadges.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, styles.sectionLabelInline]}>
                  Recent badges
                </Text>
                <Pressable
                  onPress={() => navigation.navigate("Badges")}
                  hitSlop={8}
                >
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              </View>
              <View style={styles.badgeRow}>
                {recentBadges.map((badge) => (
                  <Pressable
                    key={badge.id}
                    style={styles.badgePill}
                    onPress={() => navigation.navigate("Badges")}
                  >
                    <View style={styles.badgeIcon}>
                      <Award size={14} color={colors.rating} />
                    </View>
                    <Text style={styles.badgeLabel} numberOfLines={1}>
                      {badge.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <PrimaryButton
            label="Share my taste card"
            variant="secondary"
            icon={
              <Share2 size={16} color={colors.textPrimary} strokeWidth={2.2} />
            }
            onPress={handleShare}
            style={styles.shareButton}
          />

          <Pressable style={styles.friendsRow} onPress={showAddFriendsStub}>
            <UserPlus
              size={16}
              color={colors.textSecondary}
              strokeWidth={2.2}
            />
            <Text style={styles.friendsRowText}>Friends</Text>
            <Text style={styles.friendsRowMeta}>coming soon</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={{ height: insets.bottom + TAB_BAR_CLEARANCE }} />
      </Animated.ScrollView>
      <ScreenBottomFade />
      <DockHeader
        {...header.props}
        title="Profile"
        right={
          <>
            <HeaderIconButton onPress={() => navigation.navigate("Activity")}>
              <Bell size={18} color={colors.textPrimary} strokeWidth={2} />
            </HeaderIconButton>
            <HeaderIconButton onPress={() => navigation.navigate("Settings")}>
              <SettingsIcon
                size={18}
                color={colors.textPrimary}
                strokeWidth={2}
              />
            </HeaderIconButton>
          </>
        }
      />

      <BottomSheet
        visible={isLeagueSheetOpen}
        onClose={() => setIsLeagueSheetOpen(false)}
        title="Level & Rank"
        subtitle={`Level ${level.level} · ${rank.tier}`}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.leagueSummary}>
            <RankGemIcon size={64} color={rank.color} />
            <Text style={styles.leagueSummaryLabel}>
              Level {level.level} · {level.name}
            </Text>
            <Text style={[styles.leagueSummaryRank, { color: rank.color }]}>
              {rank.tier} Rank
            </Text>
            <Text style={styles.leagueSummaryScore}>
              {xp.toLocaleString()} XP total
            </Text>
            {rank.nextLabel ? (
              <Text style={styles.leagueSummaryNext}>
                {rank.xpToNext.toLocaleString()} XP to {rank.nextLabel}
              </Text>
            ) : (
              <Text style={styles.leagueSummaryNext}>Top rank reached</Text>
            )}
          </View>

          <Text style={styles.badgeSectionTitle}>How XP is earned</Text>
          <View style={styles.leagueFormulaCard}>
            <Text style={styles.leagueFormulaRow}>
              Watched movie · {WATCH_XP} XP each
            </Text>
            <Text style={styles.leagueFormulaRow}>
              Rated movie · {RATE_XP} XP each
            </Text>
            <Text style={styles.leagueFormulaRow}>
              Rewatched movie · {REWATCH_XP} XP each
            </Text>
            <Text style={styles.leagueFormulaRow}>
              Completed challenge · varies by difficulty
            </Text>
            <Text style={styles.leagueFormulaRow}>
              Completed collection · {COLLECTION_XP} XP each
            </Text>
            <Text style={styles.leagueFormulaRow}>
              Earned badge · {BADGE_XP} XP each
            </Text>
          </View>

          <Text style={styles.badgeSectionTitle}>Ranks</Text>
          {TIERS.map((tier) => (
            <View
              key={tier.tier}
              style={[
                styles.leagueTierRow,
                tier.tier === rank.tier && styles.leagueTierRowActive,
              ]}
            >
              <RankGemIcon size={24} color={tier.color} />
              <Text
                style={[
                  styles.leagueTierLabel,
                  tier.tier === rank.tier && styles.leagueTierLabelActive,
                ]}
              >
                {tier.tier}
              </Text>
              <Text style={styles.leagueTierMin}>
                {tier.min.toLocaleString()}+ XP
              </Text>
            </View>
          ))}

          <View style={{ height: insets.bottom + spacing.md }} />
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    profileWrap: {
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    identityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    identityText: {
      flex: 1,
      gap: 2,
    },
    name: {
      ...typography.title,
      fontSize: 20,
      color: colors.textPrimary,
    },
    handle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    bioButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: spacing.xs,
    },
    bio: {
      ...typography.body,
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 17,
      flexShrink: 1,
    },
    bioPlaceholder: {
      color: colors.accentLight,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    sectionLabelInline: {
      marginTop: 0,
      marginBottom: 0,
    },
    seeAll: {
      ...typography.label,
      color: colors.accentLight,
    },
    favoriteRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    favoriteSlot: {
      flex: 1,
      aspectRatio: 2 / 3,
    },
    favoritePoster: {
      width: "100%",
      height: "100%",
    },
    favoriteRating: {
      position: "absolute",
      left: 4,
      bottom: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: radius.xs,
      backgroundColor: colors.accent,
    },
    favoriteRatingText: {
      ...typography.label,
      fontSize: 9,
      letterSpacing: 0,
      color: colors.accentContrast,
    },
    favoriteEmpty: {
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.border,
    },
    favoriteEmptyText: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textMuted,
      textAlign: "center",
    },
    tasteCard: {
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    genreBar: {
      flexDirection: "row",
      height: 10,
      borderRadius: radius.pill,
      overflow: "hidden",
    },
    genreLegend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    tasteFacts: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    tasteFact: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceSoft,
    },
    tasteFactText: {
      flex: 1,
    },
    tasteFactLabel: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textMuted,
    },
    tasteFactValue: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    criticRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
      marginTop: spacing.md,
    },
    criticText: {
      ...typography.caption,
      flex: 1,
      color: colors.textSecondary,
    },
    statsRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    statTile: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    statValue: {
      ...typography.hero,
      fontSize: 22,
      lineHeight: 26,
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    progressWrap: {
      marginTop: spacing.md,
    },
    badgeRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    badgePill: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      padding: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    badgeIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.rating}24`,
    },
    badgeLabel: {
      ...typography.caption,
      fontSize: 11,
      flex: 1,
      color: colors.textPrimary,
    },
    shareButton: {
      marginTop: spacing.lg,
    },
    friendsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    friendsRowText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    friendsRowMeta: {
      ...typography.caption,
      flex: 1,
      color: colors.textMuted,
    },
    badgeSectionTitle: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    leagueSummary: {
      alignItems: "center",
      marginBottom: spacing.xl,
    },
    leagueSummaryLabel: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    leagueSummaryRank: {
      ...typography.bodyBold,
      marginTop: 2,
    },
    leagueSummaryScore: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 2,
    },
    leagueSummaryNext: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    leagueFormulaCard: {
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: spacing.md,
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    leagueFormulaRow: {
      ...typography.body,
      color: colors.textSecondary,
    },
    leagueTierRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
    },
    leagueTierRowActive: {
      backgroundColor: colors.card,
    },
    leagueTierLabel: {
      ...typography.bodyBold,
      color: colors.textSecondary,
      flex: 1,
    },
    leagueTierLabelActive: {
      color: colors.textPrimary,
    },
    leagueTierMin: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });

export default ProfileScreen;

import * as Clipboard from "expo-clipboard";
import {
  Award,
  Bell,
  Bookmark,
  CheckCircle,
  Plus,
  Settings as SettingsIcon,
  Share2,
  UserPlus,
  UserRound,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Image,
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
import { LayersIcon, TargetIcon } from "../components/icons/TabIcons";
import {
  HeaderBar,
  HeaderIconButton,
  LargeTitle,
  useCollapsingHeader,
  useHeaderInset,
} from "../components/ScreenHeader";
import { LevelRankCard } from "../components/LevelRankCard";
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
const DEFAULT_FRIEND_ONE = require("../../assets/friend-1.png");
const DEFAULT_FRIEND_TWO = require("../../assets/friend-2.png");
const DEFAULT_FRIEND_THREE = require("../../assets/friend-3.png");

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
  const { scrollY, onScroll } = useCollapsingHeader();
  const headerInset = useHeaderInset();

  const handleShare = () => {
    Share.share({
      message: `I'm queuing up movies on BOARD — ${queuedCount} on my watchlist, ${watchedCount} watched so far.`,
    });
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
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerInset }}
      >
        <LargeTitle
          title="Profile"
          subtitle={
            rank.nextLabel
              ? `${rank.tier} · ${rank.xpToNext.toLocaleString()} XP to ${rank.nextLabel}`
              : `${rank.tier} · Top rank`
          }
        />
        <View style={[styles.profileWrap, { marginTop: spacing.md }]}>
          <View style={styles.identityRow}>
            <AvatarLevelRing
              source={avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE}
              level={level}
            />
            <Text style={styles.name}>{displayName}</Text>
            <Pressable onPress={handleCopyHandle} hitSlop={6}>
              <Text style={styles.handle}>{getHandle(displayName)}</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              hitSlop={6}
              style={styles.bioButton}
            >
              {!bio && (
                <Plus size={13} color={colors.textPrimary} strokeWidth={2.2} />
              )}
              <Text
                style={[styles.bio, !bio && styles.bioPlaceholder]}
                numberOfLines={3}
              >
                {bio || "Add a bio"}
              </Text>
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

          <View style={styles.statsRow}>
            <Pressable
              style={styles.statTile}
              onPress={() => goToLibrary("watched")}
            >
              <CheckCircle
                size={20}
                color={colors.textPrimary}
                strokeWidth={1.8}
              />
              <Text style={styles.statValue}>{watchedCount}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                Watched
              </Text>
            </Pressable>
            <Pressable
              style={styles.statTile}
              onPress={() => goToLibrary("bucketlist")}
            >
              <Bookmark
                size={20}
                color={colors.textPrimary}
                strokeWidth={1.8}
              />
              <Text style={styles.statValue}>{queuedCount}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                Watchlist
              </Text>
            </Pressable>
            <Pressable
              style={styles.statTile}
              onPress={() => goToLibrary("collections")}
            >
              <LayersIcon size={20} color={colors.textPrimary} />
              <Text style={styles.statValue}>{completedCollectionsCount}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                Collections
              </Text>
            </Pressable>
            <Pressable
              style={styles.statTile}
              onPress={() => navigation.navigate("Decide")}
            >
              <TargetIcon size={20} color={colors.textPrimary} />
              <Text style={styles.statValue}>{completedChallengesCount}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                Challenges
              </Text>
            </Pressable>
            <Pressable
              style={styles.statTile}
              onPress={() => navigation.navigate("Badges")}
            >
              <Award size={20} color={colors.textPrimary} strokeWidth={1.8} />
              <Text style={styles.statValue}>{earnedBadgeCount}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                Badges
              </Text>
            </Pressable>
          </View>

          <PrimaryButton
            label="Share My Profile"
            variant="outline"
            dense
            icon={
              <Share2 size={16} color={colors.textPrimary} strokeWidth={2.2} />
            }
            onPress={handleShare}
            style={styles.shareButton}
          />
        </View>

        <View style={styles.friendsSection}>
          <View style={styles.friendsHeaderRow}>
            <Text style={styles.friendsTitle}>Friends</Text>
            <Pressable
              style={styles.addFriendsLink}
              onPress={showAddFriendsStub}
            >
              <UserPlus
                size={14}
                color={colors.textPrimary}
                strokeWidth={2.2}
              />
              <Text style={styles.addFriendsText}>Add friends</Text>
            </Pressable>
          </View>
          <View style={styles.friendsComingSoon}>
            <View style={styles.friendsAvatarRow}>
              <View style={[styles.friendsAvatar, styles.friendsAvatarBack]}>
                <Image source={DEFAULT_FRIEND_ONE} style={styles.avatarImage} />
              </View>

              <View style={[styles.friendsAvatar, styles.friendsAvatarFront]}>
                <Image source={DEFAULT_FRIEND_TWO} style={styles.avatarImage} />
              </View>
              <View style={[styles.friendsAvatar, styles.friendsAvatarBack]}>
                <Image
                  source={DEFAULT_FRIEND_THREE}
                  style={styles.avatarImage}
                />
              </View>
            </View>
            <Text style={styles.friendsComingSoonText}>
              Discovering movies is more fun together with friends.
            </Text>
          </View>
        </View>

        <View style={{ height: insets.bottom + TAB_BAR_CLEARANCE }} />
      </Animated.ScrollView>
      <ScreenBottomFade />
      <HeaderBar
        title="Profile"
        scrollY={scrollY}
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
      alignItems: "center",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    name: {
      ...typography.subtitle,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    handle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    bioButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    bio: {
      ...typography.body,
      fontSize: 13,
      color: "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
      lineHeight: 17,
    },
    bioPlaceholder: {
      color: colors.textPrimary,
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
    shareButton: {
      marginTop: spacing.md + spacing.xs,
      alignSelf: "center",
      borderWidth: 1.5,
      borderColor: "#FFFFFF",
      borderRadius: radius.sm,
    },
    progressWrap: {
      width: "100%",
      marginTop: spacing.md + spacing.xs,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginTop: spacing.md + spacing.xs,
      gap: spacing.xs,
    },
    statTile: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: 2,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
      gap: spacing.xs,
    },
    statValue: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textSecondary,
    },
    friendsSection: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    friendsHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    friendsTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    addFriendsLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    addFriendsText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    friendsComingSoon: {
      alignItems: "center",
      borderWidth: 2.5,
      borderStyle: "dashed",
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    friendsAvatarRow: {
      flexDirection: "row",
      alignItems: "space-between",
      marginBottom: spacing.md,
    },
    friendsAvatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: "center",
      justifyContent: "center",
    },
    friendsAvatarBack: {
      marginHorizontal: 0,
    },
    friendsAvatarFront: {
      zIndex: 1,
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    friendsComingSoonText: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 18,
      maxWidth: 240,
    },
  });

export default ProfileScreen;

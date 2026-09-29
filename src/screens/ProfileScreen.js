import {
  Award,
  Bell,
  CheckCircle,
  Plus,
  Settings as SettingsIcon,
  Share2,
  UserPlus,
  UserRound,
  X,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BottomSheet } from "../components/BottomSheet";
import { RankGemIcon } from "../components/icons/RankGemIcon";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getBadges } from "../utils/badges";
import { getCompletedCollectionsCount } from "../utils/collections";
import {
  COLLECTION_POINTS,
  QUEUED_POINTS,
  RATED_POINTS,
  TIERS,
  WATCHED_POINTS,
  getLeagueRank,
} from "../utils/league";

const BIO_MAX_LENGTH = 140;

const BADGE_SECTIONS = [
  { category: "watched", title: "Watched Movies" },
  { category: "critic", title: "Critic" },
  { category: "watchlist", title: "Watchlist" },
  { category: "collections", title: "Collections" },
];

const showAddFriendsStub = () => Alert.alert("Add Friends", "Coming soon.");

const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-placholder.png");

const getHandle = (name) =>
  `@${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") || "you"
  }`;

const BadgeRow = ({ badge, colors, styles }) => (
  <View style={styles.badgeRow}>
    <View style={!badge.earned && styles.badgeGemLocked}>
      <RankGemIcon size={32} color={badge.earned ? colors.accent : colors.textMuted} />
    </View>
    <View style={styles.badgeInfo}>
      <Text style={[styles.badgeLabel, !badge.earned && styles.badgeLabelLocked]}>
        {badge.label}
      </Text>
      <Text style={styles.badgeProgress}>
        {Math.min(badge.progress, badge.threshold)}/{badge.threshold}
      </Text>
    </View>
  </View>
);

export const ProfileScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [isBioSheetOpen, setIsBioSheetOpen] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [isBadgesSheetOpen, setIsBadgesSheetOpen] = useState(false);
  const [isLeagueSheetOpen, setIsLeagueSheetOpen] = useState(false);

  const bucketListIds = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const displayName = useProfileStore((state) => state.displayName);
  const bio = useProfileStore((state) => state.bio);
  const setBio = useProfileStore((state) => state.setBio);

  const queuedCount = bucketListIds.length;
  const watchedCount = watched.length;
  const ratedCount = watched.filter((entry) => entry.rating != null).length;
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const completedCollectionsCount = getCompletedCollectionsCount(watchedIds);
  const badges = getBadges({
    watchedCount,
    ratedCount,
    queuedCount,
    completedCollectionsCount,
    watchedIds,
  });
  const earnedBadgeCount = badges.filter((badge) => badge.earned).length;
  const rank = getLeagueRank({
    watchedCount,
    ratedCount,
    queuedCount,
    completedCollectionsCount,
  });

  const handleShare = () => {
    Share.share({
      message: `I'm queuing up movies on URWatch — ${queuedCount} on my watchlist, ${watchedCount} watched so far.`,
    });
  };

  const handleCopyHandle = async () => {
    await Clipboard.setStringAsync(getHandle(displayName));
    Alert.alert("Copied", "Handle copied to clipboard.");
  };

  const goToLibrary = (initialTab) => {
    navigation.navigate("Library", { initialTab });
  };

  const openBioSheet = () => {
    setBioDraft(bio);
    setIsBioSheetOpen(true);
  };

  const handleSaveBio = () => {
    setBio(bioDraft);
    setIsBioSheetOpen(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.headerIconButton}
          onPress={() => navigation.navigate("Activity")}
        >
          <Bell size={18} color={colors.textPrimary} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.title, { paddingTop: spacing.md }]}>Profile</Text>
        <Pressable
          style={styles.headerIconButton}
          onPress={() => navigation.navigate("Settings")}
        >
          <SettingsIcon size={18} color={colors.textPrimary} strokeWidth={2} />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.profileWrap, { marginTop: spacing.md }]}>
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Image source={DEFAULT_AVATAR_SOURCE} style={styles.avatarImage} />
            </View>
            <Text style={styles.name}>{displayName}</Text>
            <Pressable onPress={handleCopyHandle} hitSlop={6}>
              <Text style={styles.handle}>{getHandle(displayName)}</Text>
            </Pressable>
            <Pressable
              onPress={openBioSheet}
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

          <View style={styles.statsRow}>
            <Pressable
              style={styles.statTile}
              onPress={() => goToLibrary("watched")}
            >
              <CheckCircle
                size={26}
                color={colors.textPrimary}
                strokeWidth={1.8}
              />
              <Text style={styles.statValue}>{watchedCount}</Text>
              <Text style={styles.statLabel}>Watched</Text>
            </Pressable>
            <Pressable
              style={styles.statTile}
              onPress={() => setIsBadgesSheetOpen(true)}
            >
              <Award size={26} color={colors.textPrimary} strokeWidth={1.8} />
              <Text style={styles.statValue}>{earnedBadgeCount}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </Pressable>
            <Pressable
              style={styles.statTile}
              onPress={() => setIsLeagueSheetOpen(true)}
            >
              <RankGemIcon size={26} color={rank.color} />
              <Text style={styles.statValue}>{rank.tier}</Text>
              <Text style={styles.statLabel}>League</Text>
            </Pressable>
          </View>

          <PrimaryButton
            label="Share My Profile"
            variant="outline"
            dense
            icon={
              <Share2
                size={16}
                color={colors.textPrimary}
                strokeWidth={2.2}
              />
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
                <UserRound
                  size={22}
                  color={colors.textMuted}
                  strokeWidth={1.8}
                />
              </View>
              <View style={[styles.friendsAvatar, styles.friendsAvatarFront]}>
                <UserRound
                  size={24}
                  color={colors.textSecondary}
                  strokeWidth={1.8}
                />
              </View>
              <View style={[styles.friendsAvatar, styles.friendsAvatarBack]}>
                <UserRound
                  size={22}
                  color={colors.textMuted}
                  strokeWidth={1.8}
                />
              </View>
            </View>
            <Text style={styles.friendsComingSoonText}>
              Discovering movies is more fun together with friends.
            </Text>
          </View>
        </View>

        <View style={{ height: insets.bottom + TAB_BAR_CLEARANCE }} />
      </ScrollView>
      <ScreenBottomFade />

      <BottomSheet
        visible={isBioSheetOpen}
        onClose={() => setIsBioSheetOpen(false)}
      >
        <View style={styles.sheetHeaderRow}>
          <Text style={styles.sheetTitle}>Edit Bio</Text>
          <Pressable onPress={() => setIsBioSheetOpen(false)} hitSlop={8}>
            <X size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <TextInput
          value={bioDraft}
          onChangeText={setBioDraft}
          placeholder="Tell people what you love to watch..."
          placeholderTextColor={colors.textMuted}
          style={styles.bioInput}
          multiline
          maxLength={BIO_MAX_LENGTH}
          autoFocus
        />
        <Text style={styles.bioCounter}>
          {bioDraft.length}/{BIO_MAX_LENGTH}
        </Text>

        <PrimaryButton
          label="Save"
          onPress={handleSaveBio}
          style={styles.bioSaveButton}
        />
      </BottomSheet>

      <BottomSheet
        visible={isBadgesSheetOpen}
        onClose={() => setIsBadgesSheetOpen(false)}
      >
        <View style={styles.sheetHeaderRow}>
          <Text style={styles.sheetTitle}>Badges</Text>
          <Pressable onPress={() => setIsBadgesSheetOpen(false)} hitSlop={8}>
            <X size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {BADGE_SECTIONS.map((section) => (
            <View key={section.category} style={styles.badgeSection}>
              <Text style={styles.badgeSectionTitle}>{section.title}</Text>
              {badges
                .filter((badge) => badge.category === section.category)
                .map((badge) => (
                  <BadgeRow
                    key={badge.id}
                    badge={badge}
                    colors={colors}
                    styles={styles}
                  />
                ))}
            </View>
          ))}
          <View style={{ height: insets.bottom + spacing.md }} />
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={isLeagueSheetOpen}
        onClose={() => setIsLeagueSheetOpen(false)}
      >
        <View style={styles.sheetHeaderRow}>
          <Text style={styles.sheetTitle}>League</Text>
          <Pressable onPress={() => setIsLeagueSheetOpen(false)} hitSlop={8}>
            <X size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.leagueSummary}>
            <RankGemIcon size={64} color={rank.color} />
            <Text style={styles.leagueSummaryLabel}>{rank.label}</Text>
            <Text style={styles.leagueSummaryScore}>{rank.score} pts</Text>
            {rank.nextLabel ? (
              <Text style={styles.leagueSummaryNext}>
                {rank.pointsToNext} pts to {rank.nextLabel}
              </Text>
            ) : (
              <Text style={styles.leagueSummaryNext}>Top rank reached</Text>
            )}
          </View>

          <Text style={styles.badgeSectionTitle}>How it&apos;s scored</Text>
          <View style={styles.leagueFormulaCard}>
            <Text style={styles.leagueFormulaRow}>
              Watched movie · {WATCHED_POINTS} pts each ({watchedCount})
            </Text>
            <Text style={styles.leagueFormulaRow}>
              Rated movie · {RATED_POINTS} pts each ({ratedCount})
            </Text>
            <Text style={styles.leagueFormulaRow}>
              Watchlisted movie · {QUEUED_POINTS} pt each ({queuedCount})
            </Text>
            <Text style={styles.leagueFormulaRow}>
              Completed collection · {COLLECTION_POINTS} pts each (
              {completedCollectionsCount})
            </Text>
          </View>

          <Text style={styles.badgeSectionTitle}>Ranks</Text>
          {TIERS.map((tier) => (
            <View
              key={tier.tier}
              style={[styles.leagueTierRow, tier.tier === rank.tier && styles.leagueTierRowActive]}
            >
              <RankGemIcon size={24} color={tier.color} />
              <Text
                style={[styles.leagueTierLabel, tier.tier === rank.tier && styles.leagueTierLabelActive]}
              >
                {tier.tier}
              </Text>
              <Text style={styles.leagueTierMin}>{tier.min}+ pts</Text>
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
    },
    headerIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    profileWrap: {
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    identityRow: {
      alignItems: "center",
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    name: {
      ...typography.subtitle,
      color: colors.textPrimary,
      marginTop: spacing.sm,
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
    sheetHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    sheetTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    bioInput: {
      ...typography.body,
      color: colors.textPrimary,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.md,
      minHeight: 100,
      textAlignVertical: "top",
    },
    bioCounter: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "right",
      marginTop: spacing.xs,
    },
    bioSaveButton: {
      marginTop: spacing.md,
    },
    badgeSection: {
      marginBottom: spacing.md,
    },
    badgeSectionTitle: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    badgeGemLocked: {
      opacity: 0.5,
    },
    badgeInfo: {
      flex: 1,
      gap: 2,
    },
    badgeLabel: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    badgeLabelLocked: {
      color: colors.textMuted,
    },
    badgeProgress: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
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
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginTop: spacing.md + spacing.xs,
      gap: spacing.md,
    },
    statTile: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.md + spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
      gap: spacing.sm,
    },
    statValue: {
      ...typography.title,
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    friendsSection: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.xl,
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
      alignItems: "center",
      marginBottom: spacing.md,
    },
    friendsAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 2,
      borderColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    friendsAvatarBack: {
      marginHorizontal: -10,
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

import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { RankGemIcon } from "../components/icons/RankGemIcon";
import { PrimaryButton } from "../components/PrimaryButton";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getBadges } from "../utils/badges";
import { getCompletedCollectionsCount } from "../utils/collections";
import { getCompletedChallengesCount } from "../utils/xp";

const BADGE_SECTIONS = [
  { category: "watched", title: "Watched Movies", emoji: "🎬" },
  { category: "critic", title: "Critic", emoji: "✍️" },
  { category: "watchlist", title: "Watchlist", emoji: "📌" },
  { category: "collections", title: "Collections", emoji: "🗂️" },
  { category: "challenges", title: "Challenges", emoji: "🎯" },
];

const ROW_SIZE = 4;

const chunk = (items, size) => {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
};

const BadgeNode = ({ badge, colors, styles, onSelect }) => (
  <Pressable
    style={[styles.badgeNode, !badge.earned && styles.badgeNodeLocked]}
    onPress={() => onSelect(badge)}
  >
    <RankGemIcon
      size={28}
      color={badge.earned ? colors.accent : colors.textMuted}
    />
  </Pressable>
);

const BadgeRow = ({ row, colors, styles, onSelect }) => (
  <View style={styles.badgeRow}>
    {row.map((badge, index) => (
      <View key={badge.id} style={styles.badgeRowItem}>
        <BadgeNode
          badge={badge}
          colors={colors}
          styles={styles}
          onSelect={onSelect}
        />
        {index < row.length - 1 && <View style={styles.connector} />}
      </View>
    ))}
  </View>
);

const BadgeSection = ({ section, badges, colors, styles, onSelect }) => {
  const sectionBadges = badges.filter(
    (badge) => badge.category === section.category,
  );
  if (sectionBadges.length === 0) return null;
  const rows = chunk(sectionBadges, ROW_SIZE);

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>
          {section.title} {section.emoji}
        </Text>
        <View style={styles.sectionDivider} />
      </View>
      {rows.map((row, index) => (
        <BadgeRow
          key={index}
          row={row}
          colors={colors}
          styles={styles}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
};

export const BadgesScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [selectedBadge, setSelectedBadge] = useState(null);

  const bucketListEntries = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
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

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Badges</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        {BADGE_SECTIONS.map((section) => (
          <BadgeSection
            key={section.category}
            section={section}
            badges={badges}
            colors={colors}
            styles={styles}
            onSelect={setSelectedBadge}
          />
        ))}
      </ScrollView>

      {selectedBadge && (
        <Modal
          visible
          transparent
          animationType="none"
          onRequestClose={() => setSelectedBadge(null)}
        >
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(150)}
            style={styles.modalOverlay}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedBadge(null)}
            />

            <Animated.View
              entering={ZoomIn.duration(280)}
              exiting={FadeOut.duration(150)}
              style={styles.modalCard}
            >
              <View
                style={[
                  styles.modalGlow,
                  selectedBadge.earned && styles.modalGlowEarned,
                ]}
              >
                <RankGemIcon
                  size={56}
                  color={
                    selectedBadge.earned ? colors.accent : colors.textMuted
                  }
                />
              </View>

              <Text style={styles.modalTitle}>{selectedBadge.label}</Text>
              <Text style={styles.modalStatus}>
                {selectedBadge.earned ? "Earned" : "In Progress"}
              </Text>

              <View style={styles.modalProgressTrack}>
                <View
                  style={[
                    styles.modalProgressFill,
                    {
                      width: `${Math.min(
                        100,
                        (selectedBadge.progress / selectedBadge.threshold) *
                          100,
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.modalProgressText}>
                {Math.min(selectedBadge.progress, selectedBadge.threshold)} /{" "}
                {selectedBadge.threshold}
              </Text>

              <PrimaryButton
                label="Close"
                variant="ghost"
                dense
                onPress={() => setSelectedBadge(null)}
                style={styles.modalCloseButton}
              />
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const NODE_SIZE = 64;

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
    headerTitle: {
      ...typography.title,
      color: colors.textPrimary,
    },
    headerSpacer: {
      width: 40,
      height: 40,
    },
    section: {
      marginTop: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    sectionDivider: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    sectionTitle: {
      ...typography.subtitle,
      color: colors.textSecondary,
    },
    badgeRow: {
      flexDirection: "row",
      marginBottom: spacing.xl,
    },
    badgeRowItem: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    badgeNode: {
      width: NODE_SIZE,
      height: NODE_SIZE,
      borderRadius: NODE_SIZE / 2,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeNodeLocked: {
      opacity: 0.45,
    },
    connector: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 2,
    },
    modalOverlay: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(2, 0, 2, 0.6)",
      paddingHorizontal: spacing.xl,
    },
    modalCard: {
      width: "100%",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.xl,
      gap: spacing.xs,
    },
    modalGlow: {
      width: 108,
      height: 108,
      borderRadius: 54,
      backgroundColor: colors.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    modalGlowEarned: {
      backgroundColor: "rgba(141, 96, 226, 0.16)",
    },
    modalTitle: {
      ...typography.hero,
      fontSize: 22,
      color: colors.textPrimary,
      textAlign: "center",
    },
    modalStatus: {
      ...typography.bodyBold,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 2,
    },
    modalProgressTrack: {
      width: "100%",
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.cardElevatedLight,
      overflow: "hidden",
      marginTop: spacing.md,
    },
    modalProgressFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    modalProgressText: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    modalCloseButton: {
      marginTop: spacing.md,
    },
  });

export default BadgesScreen;

import { Check, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/AppText";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { StackHeader } from "../components/ScreenHeader";
import { BottomSheet } from "../components/BottomSheet";
import {
  BADGE_CATEGORIES as CATEGORIES,
  BADGE_CATEGORY_BY_KEY as CATEGORY_BY_KEY,
  Medal,
  ProgressRing,
} from "../components/BadgeMedal";
import { badgeTrackColor } from "../components/BadgeArt";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { isRated } from "../utils/tiers";
import { getBadges } from "../utils/badges";
import {
  getCollectionById,
  getCompletedCollectionsCount,
} from "../utils/collections";
import { getCompletedChallengesCount } from "../utils/xp";
import { t } from "../i18n";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "earned", label: "Earned" },
  { key: "progress", label: "In progress" },
];

const MEDAL_SIZE = 56;
const NODE_WIDTH = 78;
const SUMMARY_RING = 76;

const formatThreshold = (value) =>
  value >= 1000 ? `${value / 1000}k` : String(value);

export const BadgesScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("all");
  // Kept after closing so the sheet's content doesn't vanish mid-slide;
  // only isDetailOpen drives visibility.
  const [selected, setSelected] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const bucketListEntries = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const challengeHistory = useChallengeStore((state) => state.history);
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const badges = getBadges({
    watchedCount: watched.length,
    ratedCount: watched.filter(isRated).length,
    queuedCount: bucketListEntries.length,
    completedCollectionsCount: getCompletedCollectionsCount(watchedIds),
    completedChallengesCount: getCompletedChallengesCount(challengeHistory),
    rewatchedCount: watched.filter((entry) => (entry.watchCount ?? 1) > 1)
      .length,
    watchedIds,
  });

  const earnedCount = badges.filter((badge) => badge.earned).length;
  // The unearned badge you're proportionally closest to.
  const nextUp = badges
    .filter((badge) => !badge.earned)
    .sort((a, b) => b.progress / b.threshold - a.progress / a.threshold)[0];

  const passesFilter = (badge) =>
    filter === "all" || (filter === "earned" ? badge.earned : !badge.earned);

  // Per track, the first unearned tier is the one "in progress".
  const tracks = CATEGORIES.map((category) => {
    const tierBadges = badges.filter(
      (badge) => badge.category === category.key,
    );
    const currentId = tierBadges.find((badge) => !badge.earned)?.id;
    return {
      category,
      earned: tierBadges.filter((badge) => badge.earned).length,
      total: tierBadges.length,
      nodes: tierBadges
        .map((badge, tierIndex) => ({
          badge,
          metal: badgeTrackColor(category.key),
          tierIndex,
          state: badge.earned
            ? "earned"
            : badge.id === currentId
              ? "current"
              : "locked",
        }))
        .filter(({ badge }) => passesFilter(badge)),
    };
  }).filter((track) => track.nodes.length > 0);

  const marquee = badges
    .filter((badge) => badge.category === "marquee")
    .filter(passesFilter);

  const openSelected = (badge, metal, state, tierIndex) => {
    setSelected({ badge, metal, state, tierIndex });
    setIsDetailOpen(true);
  };

  const describe = (badge) => {
    if (badge.category === "marquee") {
      const collection = getCollectionById(badge.collectionId);
      return t("Watch every movie in {title}", {
        title: collection?.title ?? t("this collection"),
      });
    }
    const category = CATEGORY_BY_KEY[badge.category];
    return `${category.verb} ${badge.threshold.toLocaleString()} ${category.unit}`;
  };

  const goToEarn = (badge) => {
    setIsDetailOpen(false);
    if (badge.category === "marquee") {
      navigation.navigate("CollectionDetails", {
        collectionId: badge.collectionId,
      });
      return;
    }
    const { route, params } = CATEGORY_BY_KEY[badge.category].cta;
    navigation.navigate("Main", { screen: route, params });
  };

  const nextUpCategory = nextUp && CATEGORY_BY_KEY[nextUp.category];
  const selectedCategory = selected && CATEGORY_BY_KEY[selected.badge.category];

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StackHeader title={t("Badges")} onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        <View style={styles.summary}>
          <View style={styles.summaryRing}>
            <ProgressRing
              size={SUMMARY_RING}
              stroke={7}
              progress={earnedCount / badges.length}
              color={colors.rating}
              trackColor={colors.surfaceSoft}
            />
            <Text style={styles.summaryCount}>{earnedCount}</Text>
            <Text style={styles.summaryTotal}>of {badges.length}</Text>
          </View>
          {nextUp ? (
            <Pressable
              style={styles.nextUp}
              onPress={() =>
                openSelected(
                  nextUp,
                  badgeTrackColor(nextUp.category),
                  "current",
                  badges
                    .filter((badge) => badge.category === nextUp.category)
                    .findIndex((badge) => badge.id === nextUp.id),
                )
              }
            >
              <Text style={styles.nextUpEyebrow}>{t("Next up")}</Text>
              <Text style={styles.nextUpTitle} numberOfLines={1}>
                {nextUp.label}
              </Text>
              <View style={styles.bar}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, (nextUp.progress / nextUp.threshold) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.nextUpMeta} numberOfLines={1}>
                {(nextUp.threshold - nextUp.progress).toLocaleString()} more
                {nextUpCategory ? ` ${nextUpCategory.unit}` : t(" to go")}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.nextUp}>
              <Text style={styles.nextUpTitle}>{t("Every badge earned.")}</Text>
              <Text style={styles.nextUpMeta}>{t("Legend behaviour.")}</Text>
            </View>
          )}
        </View>

        <View style={styles.filters}>
          {FILTERS.map(({ key, label }) => (
            <Pressable
              key={key}
              style={[
                styles.filterChip,
                filter === key && styles.filterChipActive,
              ]}
              onPress={() => setFilter(key)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === key && styles.filterTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tracks.map(({ category, earned, total, nodes }) => (
          <View key={category.key} style={styles.track}>
            <View style={styles.trackHeader}>
              <category.Icon size={16} color={colors.textSecondary} />
              <Text style={styles.trackTitle}>{category.title}</Text>
              <Text style={styles.trackCount}>
                {earned} / {total}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ladder}
            >
              {nodes.map(({ badge, metal, tierIndex, state }, index) => (
                <View key={badge.id} style={styles.node}>
                  {index > 0 && (
                    <View
                      style={[
                        styles.connector,
                        state === "earned" && { backgroundColor: metal },
                      ]}
                    />
                  )}
                  <Pressable
                    onPress={() => openSelected(badge, metal, state, tierIndex)}
                    hitSlop={4}
                  >
                    <Medal
                      badge={badge}
                      metal={metal}
                      tierIndex={tierIndex}
                      state={state}
                      size={MEDAL_SIZE}
                    />
                  </Pressable>
                  <Text
                    style={[
                      styles.nodeLabel,
                      state === "locked" && styles.nodeLabelLocked,
                    ]}
                    numberOfLines={2}
                  >
                    {badge.label}
                  </Text>
                  <Text style={styles.nodeThreshold}>
                    {state === "current"
                      ? `${badge.progress}/${formatThreshold(badge.threshold)}`
                      : formatThreshold(badge.threshold)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ))}

        {marquee.length > 0 && (
          <View style={styles.track}>
            <View style={styles.trackHeader}>
              <Sparkles size={16} color={colors.rating} />
              <Text style={styles.trackTitle}>{t("Marquee")}</Text>
              <Text style={styles.trackCount}>
                {marquee.filter((badge) => badge.earned).length} /{" "}
                {marquee.length}
              </Text>
            </View>
            <View style={styles.marqueeGrid}>
              {marquee.map((badge) => {
                const collection = getCollectionById(badge.collectionId);
                return (
                  <Pressable
                    key={badge.id}
                    style={[
                      styles.marqueeCard,
                      badge.earned && styles.marqueeCardEarned,
                    ]}
                    onPress={() =>
                      openSelected(
                        badge,
                        badgeTrackColor("marquee"),
                        badge.earned ? "earned" : "current",
                      )
                    }
                  >
                    <View style={styles.marqueeArt}>
                      {collection?.movies.slice(0, 3).map((movie, index) => (
                        <MoviePoster
                          key={movie.id}
                          uri={movie.poster}
                          radius={0}
                          style={[
                            styles.marqueePoster,
                            {
                              start: index * 22,
                              zIndex: 3 - index,
                              transform: [{ rotate: `${(index - 1) * 6}deg` }],
                            },
                            !badge.earned && styles.marqueePosterDim,
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.marqueeTitle} numberOfLines={1}>
                      {badge.label}
                    </Text>
                    {badge.earned ? (
                      <View style={styles.marqueeEarnedRow}>
                        <Check
                          size={12}
                          color={colors.rating}
                          strokeWidth={3}
                        />
                        <Text style={styles.marqueeEarnedText}>
                          {t("Earned")}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.bar}>
                          <View
                            style={[
                              styles.barFill,
                              styles.barFillGold,
                              {
                                width: `${(badge.progress / badge.threshold) * 100}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.marqueeMeta}>
                          {badge.progress}/{badge.threshold} watched
                        </Text>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <BottomSheet
        visible={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        size="auto"
      >
        {selected && (
          <View style={styles.detail}>
            <Medal
              badge={selected.badge}
              metal={selected.metal}
              tierIndex={selected.tierIndex}
              state={selected.state}
              size={92}
            />
            <Text style={styles.detailTitle}>{selected.badge.label}</Text>
            <Text style={styles.detailDescription}>
              {describe(selected.badge)}
            </Text>
            <View style={[styles.bar, styles.detailBar]}>
              <View
                style={[
                  styles.barFill,
                  selected.badge.earned && { backgroundColor: selected.metal },
                  {
                    width: `${Math.min(100, (selected.badge.progress / selected.badge.threshold) * 100)}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.detailMetaRow}>
              <Text style={styles.detailMeta}>
                {Math.min(
                  selected.badge.progress,
                  selected.badge.threshold,
                ).toLocaleString()}{" "}
                / {selected.badge.threshold.toLocaleString()}
              </Text>
              {selected.badge.earned && (
                <Text style={styles.earnedText}>{t("Earned")}</Text>
              )}
            </View>
            {!selected.badge.earned && (
              <PrimaryButton
                label={
                  selected.badge.category === "marquee"
                    ? t("Open collection")
                    : selectedCategory.cta.label
                }
                onPress={() => goToEarn(selected.badge)}
                style={styles.detailButton}
              />
            )}
          </View>
        )}
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

    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.card,
    },
    summaryRing: {
      width: SUMMARY_RING,
      height: SUMMARY_RING,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryCount: {
      ...typography.title,
      color: colors.textPrimary,
    },
    summaryTotal: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    nextUp: {
      flex: 1,
    },
    nextUpEyebrow: {
      ...typography.caption,
      color: colors.textMuted,
    },
    nextUpTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
      marginTop: 2,
    },
    nextUpMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    earnedText: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.success,
    },
    bar: {
      height: 3,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
      marginTop: spacing.sm,
    },
    barFill: {
      height: "100%",
      backgroundColor: colors.textPrimary,
    },
    barFillGold: {
      backgroundColor: colors.rating,
    },

    filters: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      backgroundColor: colors.card,
    },
    filterChipActive: {
      backgroundColor: colors.selected,
    },
    filterText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    filterTextActive: {
      color: colors.selectedText,
    },

    track: {
      marginTop: spacing.lg,
    },
    trackHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    trackTitle: {
      ...typography.caption,
      color: colors.textMuted,
      flex: 1,
    },
    trackCount: {
      ...typography.caption,
      color: colors.textMuted,
    },
    ladder: {
      paddingHorizontal: spacing.md,
    },
    node: {
      width: NODE_WIDTH,
      alignItems: "center",
    },
    // Joins this medal to the previous one, centered on the medals.
    connector: {
      position: "absolute",
      top: MEDAL_SIZE / 2 - 1,
      end: NODE_WIDTH / 2 + MEDAL_SIZE / 2,
      width: NODE_WIDTH - MEDAL_SIZE,
      height: 2,
      backgroundColor: colors.border,
    },
    nodeLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.xs + 2,
      minHeight: 28,
    },
    nodeLabelLocked: {
      color: colors.textMuted,
    },
    nodeThreshold: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
    },

    marqueeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    marqueeCard: {
      width: "48.5%",
      padding: spacing.sm + 2,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: "transparent",
    },
    marqueeCardEarned: {
      borderColor: `${colors.rating}66`,
    },
    marqueeArt: {
      height: 78,
      marginBottom: spacing.sm,
    },
    marqueePoster: {
      position: "absolute",
      top: 4,
      width: 48,
      aspectRatio: 2 / 3,
    },
    marqueePosterDim: {
      opacity: 0.5,
    },
    marqueeTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    marqueeEarnedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: spacing.xs,
    },
    marqueeEarnedText: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.rating,
    },
    marqueeMeta: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },

    detail: {
      alignItems: "center",
      paddingBottom: spacing.md,
    },
    detailTitle: {
      ...typography.hero,
      fontSize: 24,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.md,
    },
    detailDescription: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    detailBar: {
      alignSelf: "stretch",
      marginTop: spacing.lg,
    },
    detailMetaRow: {
      alignSelf: "stretch",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.xs + 2,
    },
    detailMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    detailButton: {
      alignSelf: "stretch",
      marginTop: spacing.lg,
    },
  });

export default BadgesScreen;

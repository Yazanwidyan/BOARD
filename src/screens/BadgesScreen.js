import {
  Bookmark,
  Check,
  Film,
  Layers,
  Lock,
  RotateCw,
  Sparkles,
  Star,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { BackButton } from "../components/BackButton";
import { BottomSheet } from "../components/BottomSheet";
import { TargetIcon } from "../components/icons/TabIcons";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getBadges } from "../utils/badges";
import {
  getCollectionById,
  getCompletedCollectionsCount,
} from "../utils/collections";
import { TIERS } from "../utils/league";
import { BADGE_XP, getCompletedChallengesCount } from "../utils/xp";

// One track per category: its medal icon, what the count measures (for
// "3 more movies" / "Watch 10 movies"), and where "How to earn" goes.
const CATEGORIES = [
  {
    key: "watched",
    title: "Watching",
    Icon: Film,
    verb: "Watch",
    unit: "movies",
    cta: { label: "Find something to watch", route: "Discover" },
  },
  {
    key: "critic",
    title: "Critic",
    Icon: Star,
    verb: "Rate",
    unit: "movies",
    cta: {
      label: "Rate what you've watched",
      route: "Library",
      params: { initialTab: "watched" },
    },
  },
  {
    key: "rewatch",
    title: "Rewatch",
    Icon: RotateCw,
    verb: "Rewatch",
    unit: "different movies",
    cta: {
      label: "Revisit a favorite",
      route: "Library",
      params: { initialTab: "watched" },
    },
  },
  {
    key: "collections",
    title: "Collections",
    Icon: Layers,
    verb: "Complete",
    unit: "collections",
    cta: {
      label: "Continue a collection",
      route: "Library",
      params: { initialTab: "collections" },
    },
  },
  {
    key: "challenges",
    title: "Challenges",
    Icon: TargetIcon,
    verb: "Complete",
    unit: "challenges",
    cta: { label: "Start a challenge", route: "Decide" },
  },
  {
    key: "watchlist",
    title: "Watchlist",
    Icon: Bookmark,
    verb: "Save",
    unit: "movies to your watchlist",
    cta: { label: "Build your watchlist", route: "Discover" },
  },
];
const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

const FILTERS = [
  { key: "all", label: "All" },
  { key: "earned", label: "Earned" },
  { key: "progress", label: "In progress" },
];

const MEDAL_SIZE = 56;
const NODE_WIDTH = 78;
const SUMMARY_RING = 76;

// Tier "metal" — climbs the league's own color ladder (bronze, silver,
// gold, platinum, diamond, master) as a track's tiers rise, so a higher
// badge looks more valuable than a lower one.
const metalFor = (tierIndex) =>
  TIERS[Math.min(tierIndex + 1, TIERS.length - 1)].color;

const ProgressRing = ({ size, stroke, progress, color, trackColor }) => {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={trackColor}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(1, progress))}
        fill="none"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};

// earned → filled in its metal; current (next to earn) → progress ring;
// locked → dim with a lock.
const Medal = ({ badge, Icon, metal, state, size, colors, styles }) => (
  <View style={{ width: size, height: size }}>
    {state === "current" && (
      <ProgressRing
        size={size}
        stroke={4}
        progress={badge.progress / badge.threshold}
        color={colors.accentLight}
        trackColor={colors.surfaceSoft}
      />
    )}
    <View
      style={[
        styles.medal,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        state === "earned" && {
          backgroundColor: `${metal}2E`,
          borderColor: metal,
        },
        state === "current" && styles.medalCurrent,
        state === "locked" && styles.medalLocked,
      ]}
    >
      <Icon
        size={size * 0.4}
        color={state === "earned" ? metal : colors.textMuted}
        strokeWidth={2}
      />
    </View>
    {state === "locked" && (
      <View style={styles.lockBadge}>
        <Lock size={10} color={colors.textMuted} strokeWidth={2.5} />
      </View>
    )}
    {state === "earned" && (
      <View style={[styles.checkBadge, { backgroundColor: metal }]}>
        <Check size={10} color={colors.background} strokeWidth={3.5} />
      </View>
    )}
  </View>
);

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
    ratedCount: watched.filter((entry) => entry.rating != null).length,
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
          metal: metalFor(tierIndex),
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

  const openSelected = (badge, metal, state) => {
    setSelected({ badge, metal, state });
    setIsDetailOpen(true);
  };

  const describe = (badge) => {
    if (badge.category === "marquee") {
      const collection = getCollectionById(badge.collectionId);
      return `Watch every movie in ${collection?.title ?? "this collection"}`;
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
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Badges</Text>
        <View style={styles.headerSpacer} />
      </View>

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
                openSelected(nextUp, colors.accentLight, "current")
              }
            >
              <Text style={styles.nextUpEyebrow}>NEXT UP</Text>
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
                {nextUpCategory ? ` ${nextUpCategory.unit}` : " to go"} ·{" "}
                <Text style={styles.xpText}>+{BADGE_XP} XP</Text>
              </Text>
            </Pressable>
          ) : (
            <View style={styles.nextUp}>
              <Text style={styles.nextUpTitle}>Every badge earned.</Text>
              <Text style={styles.nextUpMeta}>Legend behaviour.</Text>
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
              {nodes.map(({ badge, metal, state }, index) => (
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
                    onPress={() => openSelected(badge, metal, state)}
                    hitSlop={4}
                  >
                    <Medal
                      badge={badge}
                      Icon={category.Icon}
                      metal={metal}
                      state={state}
                      size={MEDAL_SIZE}
                      colors={colors}
                      styles={styles}
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
              <Text style={styles.trackTitle}>Marquee</Text>
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
                        colors.rating,
                        badge.earned ? "earned" : "current",
                      )
                    }
                  >
                    <View style={styles.marqueeArt}>
                      {collection?.movies.slice(0, 3).map((movie, index) => (
                        <MoviePoster
                          key={movie.id}
                          uri={movie.poster}
                          radius={radius.xs}
                          style={[
                            styles.marqueePoster,
                            {
                              left: index * 22,
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
                        <Text style={styles.marqueeEarnedText}>Earned</Text>
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
              Icon={
                selected.badge.category === "marquee"
                  ? Sparkles
                  : selectedCategory.Icon
              }
              metal={selected.metal}
              state={selected.state}
              size={92}
              colors={colors}
              styles={styles}
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
              <Text style={styles.xpText}>
                {selected.badge.earned ? "Earned" : "Worth"} +{BADGE_XP} XP
              </Text>
            </View>
            {!selected.badge.earned && (
              <PrimaryButton
                label={
                  selected.badge.category === "marquee"
                    ? "Open collection"
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    headerSpacer: {
      width: 40,
    },

    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.sm,
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
      fontSize: 10,
      color: colors.textSecondary,
    },
    nextUp: {
      flex: 1,
    },
    nextUpEyebrow: {
      ...typography.label,
      color: colors.accentLight,
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
    xpText: {
      ...typography.label,
      color: colors.rating,
    },
    bar: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
      marginTop: spacing.sm,
    },
    barFill: {
      height: "100%",
      borderRadius: radius.pill,
      backgroundColor: colors.accentLight,
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
      borderRadius: radius.pill,
      backgroundColor: colors.card,
    },
    filterChipActive: {
      backgroundColor: colors.accent,
    },
    filterText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    filterTextActive: {
      color: colors.accentContrast,
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
      ...typography.label,
      flex: 1,
      color: colors.textSecondary,
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
      right: NODE_WIDTH / 2 + MEDAL_SIZE / 2,
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
      ...typography.label,
      fontSize: 10,
      color: colors.textMuted,
    },
    medal: {
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    medalCurrent: {
      borderWidth: 0,
      backgroundColor: colors.card,
      transform: [{ scale: 0.82 }],
    },
    medalLocked: {
      opacity: 0.45,
    },
    lockBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    checkBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.background,
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
      borderRadius: radius.sm,
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
      ...typography.label,
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

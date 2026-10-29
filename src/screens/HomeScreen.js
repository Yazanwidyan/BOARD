import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Bell, ChevronRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { CollectionCollage } from "../components/CollectionCollage";
import { BENTO_GAP, FriendsNightCard, ProgressRow, ReplayCard } from "../components/HomeBento";
import { HomeHero } from "../components/HomeHero";
import { MixRail } from "../components/MixRail";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { DecideWays } from "../components/QuickPickBento";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { ShelfRail } from "../components/ShelfRail";
import { DockHeader, HeaderIconButton, useDockHeader } from "../components/ScreenHeader";
import { SwipeSheet } from "../components/SwipeSheet";
import { useTabBarClearance } from "../components/TonightBar";
import { WildcardSheet } from "../components/WildcardSheet";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { t, useIsRTL } from "../i18n";
import { api } from "../services/api";
import { useChallengeStore } from "../store/challengeStore";
import { useFriends, useNotificationCount } from "../store/friendsStore";
import { useLanguageStore } from "../store/languageStore";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { useTasteStore } from "../store/tasteStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getInProgressCollections, getSuggestedCollections } from "../utils/collections";
import { buildMixes, pickLovedFilm } from "../utils/mixes";
import { openChallengeGenerator } from "../utils/openChallengeGenerator";
import { getTier, getTierInfo } from "../utils/tiers";
import { getTonightSuggestions } from "../utils/tonightPick";
import { countFinishedDares } from "../utils/useRanks";

// The space above each of Home's sections.
const SECTION_GAP = spacing.section;
// How many suggestions the mixes are drawn from.
const POOL_SIZE = 60;
// Recently watched: how many, and how wide each poster.
const RECENT_COUNT = 12;
const RECENT_WIDTH = 96;
// Collections: how many under way, how many new ones to start, and each
// collage's width (it includes the rail's own side padding).
const COLLECTIONS_UNDER_WAY = 6;
const COLLECTIONS_TO_START = 3;
const COLLECTION_ITEM = 118;
// The same query as Similar's, so the two share what they fetch.
const LIKE_COUNT = 30;

// A section's heading, as in Apple Music: big and bold, with a › when it
// opens somewhere (the whole heading is the button).
const SectionHeading = ({ title, onPress, styles, colors }) => {
  const rtl = useIsRTL();
  const content = (
    <>
      <Text style={styles.heading} numberOfLines={1}>
        {title}
      </Text>
      {onPress && (
        <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.6} style={rtl && styles.flipped} />
      )}
    </>
  );
  return onPress ? (
    <Pressable
      style={({ pressed }) => [styles.headingRow, pressed && styles.pressed]}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.headingRow}>{content}</View>
  );
};

// Home — your board for tonight, laid out like Apple Music's Home: the
// header's large title, then
//   Top picks for you   the mixes (utils/mixes): big cards to pick from,
//                       each a page with Sort this pile / Pick one for me
//   the decide ways     Surprise me, Sort a pile, More like…, your dare
//   Watch with friends  the same night, shared
//   Continue a collection  the ones under way, then new ones to start
//   Recently watched    tap one to tier it
//   Replay              your month
//   Your progress       one row: your title, ranks and medals (Profile)
// Tonight's pick itself docks above the tabs (TonightBar). A brand-new
// account gets a welcome card first, since there's no taste to work from.
export const HomeScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarClearance();
  const header = useDockHeader();
  const notificationCount = useNotificationCount();
  const language = useLanguageStore((state) => state.language);

  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);
  const skipChallenge = useChallengeStore((state) => state.skipChallenge);
  const dares = countFinishedDares(useChallengeStore((state) => state.history));
  const passes = useTasteStore((state) => state.passes);
  const startSession = useSessionStore((state) => state.startSession);
  const { refresh: refreshFriends } = useFriends();
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const [isWildcardOpen, setIsWildcardOpen] = useState(false);

  const startSwiping = (movies) => {
    setIsSwipeOpen(false);
    startSession(movies);
    navigation.navigate("Swipe");
  };
  // A new dare replaces the one you have.
  const startDare = () => {
    if (activeChallenge) skipChallenge();
    openChallengeGenerator(navigation);
  };

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const unlockedCollectionIds = useMovieStore((state) => state.unlockedCollections);
  const inProgressCollections = getInProgressCollections(watchedIds, COLLECTIONS_UNDER_WAY);
  const collectionsToStart = getSuggestedCollections(watched, unlockedCollectionIds, COLLECTIONS_TO_START).map(
    (item) => item.collection,
  );
  const isFreshAccount =
    !pickedMovieId && !activeChallenge && watched.length === 0 && bucketList.length === 0;

  // The mixes: tonight's suggestions, and films like one you loved.
  const pool = useMemo(
    () => getTonightSuggestions(watched, bucketList, dares, passes, POOL_SIZE),
    [watched, bucketList, dares, passes],
  );
  const lovedId = pickLovedFilm(watched);
  const like = useQuery({
    queryKey: ["movie", lovedId, "like", LIKE_COUNT, "director"],
    queryFn: () => api.get(`/movies/${lovedId}/like?count=${LIKE_COUNT}&sameDirector=true`),
    enabled: !!lovedId,
    staleTime: 60 * 60 * 1000,
  });
  // A pull to refresh turns each mix to its next films.
  const [turn, setTurn] = useState(0);
  const mixes = buildMixes({
    pool,
    bucketList,
    watchedIds,
    loved: lovedId ? getMovieById(lovedId) : null,
    lovedSimilar: like.data?.similar?.map((item) => getMovieById(item.id)).filter(Boolean) ?? null,
  }).map((mix) => {
    const shift = (turn * 4) % mix.movies.length;
    return { ...mix, movies: [...mix.movies.slice(shift), ...mix.movies.slice(0, shift)] };
  });
  const openMix = (mix) =>
    navigation.navigate("Mix", {
      title: mix.title,
      titleIsName: !!mix.titleIsName,
      eyebrow: mix.eyebrow,
      hint: mix.hint,
      tint: mix.tint,
      movieIds: mix.movies.map((movie) => movie.id),
    });

  const recent = [...watched]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, RECENT_COUNT)
    .map((entry) => ({ entry, movie: getMovieById(entry.movieId) }))
    .filter(({ movie }) => movie);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.selectionAsync();
    setTurn((value) => value + 1);
    try {
      await refreshFriends();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={header.barBottom}
            tintColor={colors.textSecondary}
            colors={[colors.textPrimary]}
            progressBackgroundColor={colors.card}
          />
        }
        contentContainerStyle={{
          paddingTop: header.barBottom + spacing.underHeader,
          paddingBottom: insets.bottom + tabBarClearance,
        }}
      >

        {isFreshAccount && (
          <View style={styles.heroTile}>
            <HomeHero
              eyebrow={t("Welcome")}
              title={t("Find your first movie")}
              meta={t(
                "Save what you want to see and tier what you've watched — ReelBoard learns from both.",
              )}
              actions={
                <PrimaryButton
                  label={t("Start discovering")}
                  onPress={() => navigation.navigate("Discover")}
                  style={styles.heroMain}
                  contentStyle={styles.heroSquare}
                />
              }
            />
          </View>
        )}

        {/* Top picks, and the other ways to choose under them. */}
        {mixes.length > 0 && (
          <>
            <SectionHeading title={t("Top picks for you")} styles={styles} colors={colors} />
            <MixRail mixes={mixes} onOpen={openMix} />
          </>
        )}
        {!isFreshAccount && (
          <View style={styles.chips}>
            <DecideWays
              chips
              onWildcard={() => setIsWildcardOpen(true)}
              onSwipe={() => setIsSwipeOpen(true)}
              onSimilar={() => navigation.navigate("Similar")}
              dare={activeChallenge}
              onDare={() =>
                activeChallenge
                  ? navigation.navigate("MovieDetails", { movieId: activeChallenge.targetMovieId })
                  : startDare()
              }
              onNewDare={startDare}
            />
          </View>
        )}

        <View style={styles.section}>
          <SectionHeading
            title={t("Watch with friends")}
            onPress={() => navigation.navigate("FriendsHub")}
            styles={styles}
            colors={colors}
          />
          <FriendsNightCard navigation={navigation} style={styles.inset} />
        </View>

        {/* Collections: the ones under way (how far), then new ones to start. */}
        {inProgressCollections.length + collectionsToStart.length > 0 && (
          <View style={styles.section}>
            <SectionHeading
              title={t("Continue a collection")}
              onPress={() => navigation.navigate("Library", { initialTab: "collections", openedAt: Date.now() })}
              styles={styles}
              colors={colors}
            />
            <ShelfRail
              itemWidth={COLLECTION_ITEM}
              items={[...inProgressCollections, ...collectionsToStart].map((collection) => {
                const seen = collection.movieIds.filter((id) => watchedIds.has(id)).length;
                return {
                  key: collection.id,
                  onPress: () => navigation.navigate("CollectionDetails", { collectionId: collection.id }),
                  content: (
                    <CollectionCollage collection={collection} watchedIds={watchedIds} size={COLLECTION_ITEM - 2} />
                  ),
                  title: collection.title,
                  meta:
                    seen > 0
                      ? t("{seen} of {moviesCount} watched", { seen, moviesCount: collection.movieIds.length })
                      : t("{count} films", { count: collection.movieIds.length }),
                };
              })}
            />
          </View>
        )}

        {recent.length > 0 && (
          <View style={styles.section}>
            <SectionHeading
              title={t("Recently watched")}
              onPress={() => navigation.navigate("Library", { initialTab: "watched", openedAt: Date.now() })}
              styles={styles}
              colors={colors}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
              {recent.map(({ entry, movie }) => {
                const tier = getTier(entry);
                return (
                  <Pressable
                    key={movie.id}
                    style={({ pressed }) => [styles.recentItem, pressed && styles.pressed]}
                    onPress={() =>
                      navigation.navigate(tier ? "MovieDetails" : "TierMovie", { movieId: movie.id })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={tier ? movie.title : `${t("Tier it")}: ${movie.title}`}
                  >
                    <MoviePoster uri={movie.poster} style={styles.recentPoster} />
                    {/* Its tier, or a nudge to give it one. */}
                    {tier ? (
                      <View style={[styles.tierBadge, { backgroundColor: getTierInfo(tier)?.color }]}>
                        <Text style={styles.tierText}>{tier}</Text>
                      </View>
                    ) : (
                      <View style={styles.tierIt}>
                        <Text style={styles.tierItText}>{t("Tier it")}</Text>
                      </View>
                    )}
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {movie.title}
                    </Text>
                    <Text style={styles.recentMeta} numberOfLines={1}>
                      {movie.year}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <ReplayCard
          style={[styles.inset, styles.sectionGap]}
          language={language}
          onPress={(period) => navigation.navigate("Recap", { period })}
        />

        {!isFreshAccount && (
          <View style={styles.section}>
            <SectionHeading title={t("Your progress")} styles={styles} colors={colors} />
            <ProgressRow onPress={() => navigation.navigate("Profile")} style={styles.inset} />
          </View>
        )}
      </Animated.ScrollView>
      <ScreenBottomFade />

      <SwipeSheet visible={isSwipeOpen} onClose={() => setIsSwipeOpen(false)} onStart={startSwiping} />
      <WildcardSheet
        visible={isWildcardOpen}
        onClose={() => setIsWildcardOpen(false)}
        onGo={() => {
          setIsWildcardOpen(false);
          navigation.navigate("Wildcard");
        }}
      />
      <DockHeader
        {...header.props}
        title={t("Tonight")}
        right={
          <HeaderIconButton
            onPress={() => {
              Haptics.selectionAsync();
              navigation.navigate("FriendsHub");
            }}
            accessibilityLabel={t("Activity")}
            badge={notificationCount}
          >
            <Bell size={22} strokeWidth={1.75} color={colors.textPrimary} />
          </HeaderIconButton>
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
    section: {
      marginTop: SECTION_GAP,
    },
    sectionGap: {
      marginTop: SECTION_GAP,
    },
    // Inside the page's margins.
    inset: {
      marginHorizontal: spacing.md,
    },
    chips: {
      marginTop: BENTO_GAP,
    },
    // A new account's welcome, as a card.
    heroTile: {
      marginHorizontal: spacing.md,
      marginBottom: BENTO_GAP,
      borderRadius: shape.card,
      overflow: "hidden",
    },
    heroMain: {
      flex: 1,
    },
    heroSquare: {
      borderRadius: shape.control,
      minHeight: 48,
    },
    headingRow: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 2,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm + 2,
    },
    heading: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      lineHeight: 27,
      letterSpacing: -0.3,
      flexShrink: 1,
      color: colors.textPrimary,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    pressed: {
      opacity: 0.75,
    },
    recentRow: {
      gap: spacing.rail,
      paddingHorizontal: spacing.md,
    },
    recentItem: {
      width: RECENT_WIDTH,
    },
    recentPoster: {
      width: RECENT_WIDTH,
      height: RECENT_WIDTH * 1.5,
    },
    recentTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textPrimary,
      marginTop: spacing.xs + 2,
    },
    recentMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    // On the poster's corner.
    tierBadge: {
      position: "absolute",
      top: RECENT_WIDTH * 1.5 - 28,
      start: 6,
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
    },
    tierText: {
      fontFamily: fonts.extraBold,
      fontSize: 12,
      lineHeight: 15,
      color: "#14181C",
    },
    tierIt: {
      position: "absolute",
      top: RECENT_WIDTH * 1.5 - 28,
      start: 6,
      height: 22,
      justifyContent: "center",
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.brand,
      borderRadius: shape.chip,
    },
    tierItText: {
      ...typography.micro,
      fontFamily: fonts.bold,
      color: colors.brandText,
    },
  });

export default HomeScreen;

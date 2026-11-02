import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Bell, ChevronRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { CollectionCollage } from "../components/CollectionCollage";
import { BENTO_GAP, FriendsNightCard, ReplayCard } from "../components/HomeBento";
import { HomeHero } from "../components/HomeHero";
import { MixRail } from "../components/MixRail";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { DecideWays } from "../components/QuickPickBento";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { ShelfRail } from "../components/ShelfRail";
import { SlotStrip } from "../components/SlotStrip";
import { DockHeader, HeaderIconButton, useDockHeader } from "../components/ScreenHeader";
import { SwipeSheet } from "../components/SwipeSheet";
import { TierNudgeCard } from "../components/TierNudgeCard";
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
import { getSuggestedCollections } from "../utils/collections";
import { buildMixes, pickLovedFilm } from "../utils/mixes";
import { getPathNext, subjectOf, usePaths } from "../utils/paths";
import { toCollection } from "../utils/collections";
import { openChallengeGenerator } from "../utils/openChallengeGenerator";
import { getTier, getTierInfo } from "../utils/tiers";
import { matchWord } from "../utils/tasteWords";
import { getTonightSuggestions } from "../utils/tonightPick";
import { features } from "../config/features";

// The space above each of Home's sections.
const SECTION_GAP = spacing.section;
// How many suggestions the mixes are drawn from, and how many of the best
// "One for tonight" steps through.
const POOL_SIZE = 60;
const ONE_PICK_POOL = 10;
// Recently watched: how many, and how wide each poster.
const RECENT_COUNT = 12;
const RECENT_WIDTH = 96;
// Your collections: how many, and each card's width. With none under way,
// a few to start instead (each collage's width includes the rail's own
// side padding).
const PATHS_SHOWN = 6;
const PATH_WIDTH = 132;
const COLLECTIONS_TO_START = 3;
const COLLECTION_ITEM = 118;
// The same query as Similar's, so the two share what they fetch.
const LIKE_COUNT = 30;

// A section's heading, as in Apple Music: big and bold, with a › when it
// opens somewhere (the whole heading is the button).
// `subtitle`: a quiet line under it, saying what the section is.
const SectionHeading = ({ title, subtitle, onPress, styles, colors }) => {
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
  const heading = onPress ? (
    <Pressable
      style={({ pressed }) => [styles.headingRow, !!subtitle && styles.headingRowTight, pressed && styles.pressed]}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  ) : (
    <View style={[styles.headingRow, !!subtitle && styles.headingRowTight]}>{content}</View>
  );
  if (!subtitle) return heading;
  return (
    <>
      {heading}
      <Text style={styles.headingSubtitle} numberOfLines={1}>
        {subtitle}
      </Text>
    </>
  );
};

// Home — your board for tonight, laid out like Apple Music's Home: the
// header's large title, then
//   How was it?         the morning after a watch, until it's tiered
//   Top picks for you   one film for tonight, then the mixes (utils/mixes):
//                       big cards to pick from,
//                       each a page with Sort this pile / Pick one for me
//   the decide ways     Surprise me, Sort a pile, More like…, your dare
//   Watch with friends  the same night, shared
//   Your collections    the sets of films under way (a director's, a
//                       series'): each its cover, a slot per film, what
//                       it's about and the film next (or, with none,
//                       ones to start)
//   Recently watched    tap one to tier it
//   Replay              your month
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
  const rtl = useIsRTL();
  const notificationCount = useNotificationCount();
  const language = useLanguageStore((state) => state.language);

  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);
  const skipChallenge = useChallengeStore((state) => state.skipChallenge);
  const passes = useTasteStore((state) => state.passes);
  const startSession = useSessionStore((state) => state.startSession);
  const { friends, refresh: refreshFriends } = useFriends();
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
  const paths = usePaths();
  const collectionsToStart = getSuggestedCollections(watched, unlockedCollectionIds, COLLECTIONS_TO_START).map(
    (item) => item.collection,
  );
  const isFreshAccount =
    !pickedMovieId && !activeChallenge && watched.length === 0 && bucketList.length === 0;

  // The mixes: tonight's suggestions, and films like one you loved.
  const pool = useMemo(
    () => getTonightSuggestions(watched, bucketList, passes, POOL_SIZE),
    [watched, bucketList, passes],
  );
  // Each collection under way, as the film to watch next — the best fit
  // for your taste of its next few. The closest to done also leads
  // Tonight's mix.
  const rankedIds = pool.map((item) => item.movie.id);
  const passedIds = new Set(passes.map((pass) => pass.movieId));
  const underWay = paths
    .map((path) => ({ path, movie: getMovieById(getPathNext(path, rankedIds)) }))
    .filter(({ movie }) => movie && !passedIds.has(movie.id))
    .slice(0, PATHS_SHOWN);
  // One for tonight: the best fit of the suggestions, ⇄ stepping through
  // the next few.
  const [pickTurn, setPickTurn] = useState(0);
  const onePickPool = pool.filter((item) => !passedIds.has(item.movie.id)).slice(0, ONE_PICK_POOL);
  const onePickItem = onePickPool.length ? onePickPool[pickTurn % onePickPool.length] : null;
  // Its reason first — the one about the film you most recently put in S
  // or A, when there's one, so a tier shows up in tonight's pick — then how
  // well it fits, in a word (never a % from a few taps).
  const lastLoved = getMovieById(
    [...watched].filter((entry) => entry.tier === "S" || entry.tier === "A").sort((a, b) => b.timestamp - a.timestamp)[0]
      ?.movieId,
  );
  const onePickReason =
    (lastLoved && (onePickItem?.reasons ?? []).find((reason) => reason.includes(lastLoved.title))) ??
    onePickItem?.reason;
  const onePick = onePickItem && {
    movie: onePickItem.movie,
    why:
      [onePickReason, matchWord(onePickItem.match)].filter(Boolean).join(" · ") ||
      t(onePickItem.angle?.label ?? ""),
    picked: pickedMovieId === onePickItem.movie.id,
  };
  // Films watched but not tiered: tiering a few sharpens tonight's pick.
  const untieredCount = watched.filter((entry) => !getTier(entry)).length;
  const pickForTonight = (movieId) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    useMovieStore.getState().setPickedMovie(movieId);
  };
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
    lead: underWay[0]?.movie ?? null,
    leadTag: underWay[0] ? t("Next in your {subject} collection", { subject: subjectOf(underWay[0].path) }) : null,
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

        {/* The morning after: how was last night's film? */}
        <TierNudgeCard navigation={navigation} style={[styles.inset, styles.nudge]} />

        {/* Top picks, and the other ways to choose under them. */}
        {(mixes.length > 0 || onePick) && (
          <>
            <SectionHeading title={t("Top picks for you")} styles={styles} colors={colors} />
            <MixRail
              mixes={mixes}
              onOpen={openMix}
              onePick={onePick}
              onOpenMovie={(movieId) => navigation.navigate("MovieDetails", { movieId })}
              onPick={pickForTonight}
              onSwap={() => {
                Haptics.selectionAsync();
                setPickTurn((turn) => turn + 1);
              }}
            />
            {/* Watched but not tiered: a few tiers sharpen the pick above. */}
            {untieredCount > 0 && (
              <Pressable
                style={({ pressed }) => [styles.sharpen, pressed && styles.pressed]}
                onPress={() => navigation.navigate("Library", { showUntiered: true })}
                accessibilityRole="button"
              >
                <Text style={styles.sharpenText} numberOfLines={1}>
                  {t("Tier {count} more to sharpen tonight's pick", { count: Math.min(untieredCount, 3) })}
                </Text>
                <ChevronRight size={16} color={colors.brand} strokeWidth={2.4} style={rtl && styles.flipped} />
              </Pressable>
            )}
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

        {/* Only once you have friends — an empty card just says you're
            alone. */}
        {friends.length > 0 && (
          <View style={styles.section}>
            <SectionHeading
              title={t("Watch with friends")}
              onPress={() => navigation.navigate("FriendsHub")}
              styles={styles}
              colors={colors}
            />
            <FriendsNightCard navigation={navigation} style={styles.inset} />
          </View>
        )}

        {/* Your collections: each set under way as a set — its cover, a
            slot per film (filled when seen), what it's about, how many
            seen and the film next. Tap for the collection. */}
        {underWay.length > 0 ? (
          <View style={styles.section}>
            <SectionHeading
              title={t("Your collections")}
              subtitle={t("Watch every film to complete one")}
              onPress={() => navigation.navigate("Library", { initialTab: "collections", openedAt: Date.now() })}
              styles={styles}
              colors={colors}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
              {underWay.map(({ path, movie }) => {
                const subject = subjectOf(path);
                const seen = path.essentials
                  ? t("{count} essentials · {watched} seen", { count: path.total, watched: path.watched })
                  : t("{watched} of {total} seen", { watched: path.watched, total: path.total });
                // The playful name, when there is one, comes second.
                const meta = path.title !== subject ? `${path.title} · ${seen}` : seen;
                return (
                  <Pressable
                    key={path.id}
                    style={({ pressed }) => [styles.pathItem, pressed && styles.pressed]}
                    onPress={() => navigation.navigate("CollectionDetails", { collectionId: path.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`${subject}, ${seen}`}
                  >
                    <CollectionCollage
                      collection={toCollection(path)}
                      watchedIds={watchedIds}
                      size={PATH_WIDTH}
                      bar={false}
                    />
                    <SlotStrip movieIds={path.movieIds} watchedIds={watchedIds} style={styles.pathSlots} />
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {subject}
                    </Text>
                    <Text style={styles.recentMeta} numberOfLines={1}>
                      {meta}
                    </Text>
                    <Text style={styles.pathNext} numberOfLines={1}>
                      {t("Next: {title}", { title: movie.title })}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          collectionsToStart.length > 0 && (
            <View style={styles.section}>
              <SectionHeading
                title={t("Start a collection")}
                subtitle={t("Pick a director or series. Watch every film.")}
                onPress={() => navigation.navigate("Library", { initialTab: "collections", openedAt: Date.now() })}
                styles={styles}
                colors={colors}
              />
              <ShelfRail
                itemWidth={COLLECTION_ITEM}
                items={collectionsToStart.map((collection) => ({
                  key: collection.id,
                  onPress: () => navigation.navigate("CollectionDetails", { collectionId: collection.id }),
                  content: (
                    <CollectionCollage collection={collection} watchedIds={watchedIds} size={COLLECTION_ITEM - 2} />
                  ),
                  title: collection.subject ?? collection.title,
                  meta: t("{count} films", { count: collection.movieIds.length }),
                }))}
              />
            </View>
          )
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

        {features.replay && (
          <ReplayCard
            style={[styles.inset, styles.sectionGap]}
            language={language}
            onPress={(period) => navigation.navigate("Recap", { period })}
          />
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
    nudge: {
      marginBottom: SECTION_GAP,
    },
    sharpen: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      alignSelf: "flex-start",
      marginTop: spacing.sm + 2,
      paddingHorizontal: spacing.md,
    },
    sharpenText: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.brand,
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
    // With a line under it: that line takes the gap instead.
    headingRowTight: {
      marginBottom: 2,
    },
    headingSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
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
    pathItem: {
      width: PATH_WIDTH,
    },
    // Under a collection's cover: a slot per film.
    pathSlots: {
      marginTop: spacing.sm,
    },
    pathNext: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
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

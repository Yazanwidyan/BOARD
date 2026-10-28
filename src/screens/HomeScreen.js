import * as Haptics from "expo-haptics";
import { Bell, Check, Flame, Plus, Shuffle, ThumbsDown } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "../components/AppText";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { CollectionCollage } from "../components/CollectionCollage";
import { HomeHero } from "../components/HomeHero";
import { RoundAction } from "../components/RoundAction";
import { TonightIcon } from "../components/icons/TonightIcon";
import { ReelBoardIcon } from "../components/icons/TabIcons";
import { PrimaryButton } from "../components/PrimaryButton";
import { DecideWays } from "../components/QuickPickBento";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import {
  DockHeader,
  HeaderIconButton,
  useDockHeader,
} from "../components/ScreenHeader";
import { ShelfRail } from "../components/ShelfRail";
import { SwipeSheet } from "../components/SwipeSheet";
import { WildcardSheet } from "../components/WildcardSheet";
import { SPIN_STOP_MS } from "../components/RefreshSpin";
import { TonightsPickCard } from "../components/TonightsPickCard";
import { useMoviesVersion } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useLanguageStore } from "../store/languageStore";
import { useSessionStore } from "../store/sessionStore";
import { useMovieStore } from "../store/movieStore";
import { recordPass, undoPass, useTasteStore } from "../store/tasteStore";
import { showToast } from "../store/toastStore";
import { TAB_BAR_CLEARANCE, shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { toggleBucketListWithFeedback } from "../utils/achievementFeedback";
import { getInProgressCollections } from "../utils/collections";
import { openChallengeGenerator } from "../utils/openChallengeGenerator";
import { formatRuntime } from "../utils/movieFilters";
import { getTonightSuggestions } from "../utils/tonightPick";
import { countFinishedDares } from "../utils/useRanks";
import { buildRecap, getRecapPeriods } from "../utils/recap";
import { t } from "../i18n";
import { useFriends, useNotificationCount } from "../store/friendsStore";
import { FirstVisitTip } from "../components/FirstVisitTip";
import { HomeFriends } from "../components/HomeFriends";

// The space between Home's sections.
const SECTION_GAP = 20;
// How long a pass can be undone.
const UNDO_MS = 4000;
// Shelf rail item width (it includes its own side padding).
const BOX_ITEM = 142;

// Section labels as the little tags clipped to a store shelf, with an
// optional link on the right.
// `inset`: already inside the page's margins (no padding of its own).
const ShelfTag = ({ label, right, styles, inset = false }) => (
  <View style={[styles.tagRow, inset && styles.tagRowInset]}>
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
    {right}
  </View>
);

// Home's top slot when there's no Tonight's Pick: a suggestion for
// tonight. A brand-new account (nothing watched or saved yet) gets one "Start
// discovering" card instead, since there's no taste to work from.
const DecideHeroCard = ({
  isFreshAccount,
  navigation,
  styles,
  colors,
  refreshCount,
  scrollY,
}) => {
  if (isFreshAccount) {
    return (
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
    );
  }

  // Its name is inside the card, as its eyebrow.
  return <SuggestionCard navigation={navigation} refreshCount={refreshCount} scrollY={scrollY} />;
};

const DAY_MS = 24 * 60 * 60 * 1000;
// Up to seven to step through, then round again.
const SUGGESTION_PAGES = 7;

const timeAgo = (timestamp) => {
  const days = Math.floor((Date.now() - timestamp) / DAY_MS);
  if (days < 1) return t("today");
  if (days === 1) return t("yesterday");
  if (days < 14) return t("{count} days ago", { count: days });
  if (days < 60) return t("{count} weeks ago", { count: Math.round(days / 7) });
  return t("{count} months ago", { count: Math.round(days / 30) });
};

// Home's slot when there's no Tonight's Pick: one suggestion at a time, in
// the same card as Tonight's pick (HomeHero) — the best fits for your taste
// (utils/tonightPick), lifted when they're on your watchlist or move a saga
// along — with why and how well it fits, a button to make it tonight's
// pick, and ⇄ (or a pull to refresh) to step to the next, which fades
// in.
const SuggestionCard = ({ navigation, refreshCount, scrollY }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const dares = countFinishedDares(useChallengeStore((state) => state.history));
  const [step, setStep] = useState(0);
  const passes = useTasteStore((state) => state.passes);
  // After an Undo: the film to bring back into view.
  const [focusId, setFocusId] = useState(null);
  const candidates = useMemo(
    () => getTonightSuggestions(watched, bucketList, dares, passes),
    [watched, bucketList, dares, passes],
  );
  // Back to the film you undid "Not for me" on, once it's in the list again.
  useEffect(() => {
    if (!focusId) return;
    const index = candidates.findIndex((item) => item.movie.id === focusId);
    if (index >= 0) setStep(index);
    setFocusId(null);
  }, [candidates, focusId]);

  // A pull to refresh steps on too.
  const lastRefresh = useRef(refreshCount);
  useEffect(() => {
    if (refreshCount !== lastRefresh.current) {
      lastRefresh.current = refreshCount;
      setStep((value) => value + 1);
    }
  }, [refreshCount]);

  if (candidates.length === 0) return null;

  const pageCount = Math.min(candidates.length, SUGGESTION_PAGES);
  const page = step % pageCount;
  const suggestion = candidates[page];
  const { movie, savedAt, angle } = suggestion;
  const isSaved = bucketList.some((entry) => entry.movieId === movie.id);
  const next = () => {
    Haptics.selectionAsync();
    setStep((value) => value + 1);
  };
  // Why it's here, as its tag — a watchlist save says when.
  const tag =
    angle.key === "saved"
      ? {
          text: savedAt
            ? t("On your watchlist · saved {addedAt}", { addedAt: timeAgo(savedAt) })
            : t("On your watchlist"),
        }
      : {
          text: t(angle.label),
          color:
            angle.key === "rank" || angle.key === "craft"
              ? colors.rating
              : angle.key === "saga"
                ? colors.collection
                : undefined,
        };
  return (
    // Keyed on the film, so each new one fades in fresh (its logo too).
    <Animated.View key={movie.id} entering={FadeIn.duration(350)}>
    <HomeHero
      scrollY={scrollY}
      posterUri={movie.poster}
      backdropUri={movie.backdrop}
      logo={movie.details?.logo}
      eyebrow={t("Suggested for tonight")}
      eyebrowIcon={Flame}
      title={movie.title}
      meta={[movie.year, movie.genres?.[0] && t(movie.genres[0]), movie.runtime ? formatRuntime(movie.runtime) : null]
        .filter(Boolean)
        .join(" · ")}
      rated={movie.details?.rated}
      description={movie.description}
      match={suggestion.match}
      tag={tag}
      onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
      actions={
        <>
          <RoundAction
            Icon={TonightIcon}
            label={t("Tonight")}
            a11yLabel={t("Pick for tonight")}
            onPress={() => {
              Haptics.selectionAsync();
              togglePickedMovie(movie.id);
            }}
          />
          <RoundAction
            Icon={isSaved ? Check : Plus}
            on={isSaved}
            label={isSaved ? t("Saved") : t("Watchlist")}
            onPress={() => toggleBucketListWithFeedback(movie.id)}
          />
          <RoundAction
            Icon={ThumbsDown}
            label={t("Not for me")}
            onPress={() => {
              // A pass, straight away: this film won't come back, and films
              // like it drop — the list refreshes, so the next one is
              // already in its place. Undo takes it back.
              const passed = movie.id;
              Haptics.selectionAsync();
              recordPass(passed);
              showToast(t("Got it — fewer like this"), {
                duration: UNDO_MS,
                action: {
                  label: t("Undo"),
                  onPress: () => {
                    undoPass(passed);
                    setFocusId(passed);
                  },
                },
              });
            }}
          />
          {pageCount > 1 && (
            <RoundAction Icon={Shuffle} label={t("Try another")} onPress={next} />
          )}
        </>
      }
    />
    </Animated.View>
  );
};

export const HomeScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const notificationCount = useNotificationCount();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);
  const skipChallenge = useChallengeStore((state) => state.skipChallenge);
  const startSession = useSessionStore((state) => state.startSession);
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  // Home's two sides: what's for you tonight, and your friends.
  const [homeTab, setHomeTab] = useState("you");
  const { refresh: refreshFriends } = useFriends();
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

  const queuedCount = bucketList.length;
  const watchedCount = watched.length;
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const inProgressCollections = getInProgressCollections(watchedIds, 4);
  const isFreshAccount =
    !pickedMovieId &&
    !activeChallenge &&
    watchedCount === 0 &&
    queuedCount === 0;

  const header = useDockHeader();

  // In a month's first week, last month's recap (if anything was watched).
  const language = useLanguageStore((state) => state.language);
  const lastMonthRecap = (() => {
    if (new Date().getDate() > 7) return null;
    const period = getRecapPeriods().find((item) => item.key === "last-month");
    const { count } = buildRecap(watched, period);
    if (count === 0) return null;
    const name = period.date.toLocaleDateString(language === "ar" ? "ar" : "en", {
      month: "long",
    });
    return { count, name };
  })();

  // Pull to refresh: a fresh suggestion (and the latest data on re-render).
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  // The logo spins while it refreshes, then eases to a stop; the new
  // suggestion arrives halfway through that whole spin.
  const REFRESH_MS = 1100;
  const onRefresh = () => {
    setRefreshing(true);
    if (homeTab === "friends") refreshFriends();
    Haptics.selectionAsync();
    setTimeout(() => setRefreshing(false), REFRESH_MS);
    setTimeout(
      () => setRefreshCount((value) => value + 1),
      (REFRESH_MS + SPIN_STOP_MS) / 2,
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* For you / Friends: pinned under the header, outside the scroll,
          so pulling to refresh moves only the page below them. */}
      <View style={[styles.tabsBar, { paddingTop: header.barBottom }]}>
        <View style={styles.tabs} accessibilityRole="tablist">
          {[
            { key: "you", label: t("For you") },
            { key: "friends", label: t("Friends") },
          ].map((tab) => {
            const selected = tab.key === homeTab;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, selected && styles.tabOn]}
                onPress={() => {
                  if (selected) return;
                  Haptics.selectionAsync();
                  setHomeTab(tab.key);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.tabText, selected && styles.tabTextOn]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            // The page starts under the tabs, so the spinner does too.
            progressViewOffset={0}
            // iOS: no spinner — the header logo spins instead.
            // Android can't report the pull, so it keeps its spinner.
            tintColor={
              Platform.OS === "ios" ? "transparent" : colors.textSecondary
            }
            colors={[colors.textPrimary]}
            progressBackgroundColor={colors.card}
          />
        }
        contentContainerStyle={{
          // For you's top card meets the tabs; Friends keeps the usual gap.
          paddingTop: homeTab === "you" ? 0 : spacing.md,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        {homeTab === "friends" ? (
          <HomeFriends navigation={navigation} />
        ) : (
        <>
        <View style={[styles.section, styles.firstSection, styles.heroSection]}>
          {pickedMovieId ? (
            <TonightsPickCard
              navigation={navigation}
              scrollY={header.scrollY}
            />
          ) : (
            <DecideHeroCard
              isFreshAccount={isFreshAccount}
              navigation={navigation}
              styles={styles}
              colors={colors}
              refreshCount={refreshCount}
              scrollY={header.scrollY}
            />
          )}
        </View>

        {/* Not that one? The other ways to choose, and your dare. */}
        {!isFreshAccount && (
          <View style={styles.railSection}>
            <ShelfTag label={t("Decide another way")} styles={styles} />
            <DecideWays
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

        {inProgressCollections.length > 0 && (
          <View style={styles.railSection}>
            <ShelfTag
              label={t("Continue a collection")}
              styles={styles}
              right={
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    navigation.navigate("Library", {
                      initialTab: "collections",
                    })
                  }
                >
                  <Text style={styles.seeAllText}>{t("See all")}</Text>
                </Pressable>
              }
            />
            <ShelfRail
              itemWidth={BOX_ITEM}
              items={inProgressCollections.map((collection) => {
                const seen = collection.movieIds.filter((id) =>
                  watchedIds.has(id),
                ).length;
                return {
                  key: collection.id,
                  onPress: () =>
                    navigation.navigate("CollectionDetails", {
                      collectionId: collection.id,
                    }),
                  content: (
                    <CollectionCollage
                      collection={collection}
                      watchedIds={watchedIds}
                      size={BOX_ITEM - 2}
                    />
                  ),
                  title: collection.title,
                  meta: t("{seen} of {moviesCount} watched", {
                    seen: seen,
                    moviesCount: collection.movieIds.length,
                  }),
                };
              })}
            />
          </View>
        )}

        {/* First week of the month: last month's recap is ready. */}
        {lastMonthRecap && (
          <Pressable
            style={({ pressed }) => [styles.recapBanner, pressed && { opacity: 0.8 }]}
            onPress={() => navigation.navigate("Recap", { period: "last-month" })}
            accessibilityRole="button"
          >
            <Text style={styles.recapTitle}>
              {t("Your {month} recap is ready", { month: lastMonthRecap.name })}
            </Text>
            <Text style={styles.recapHint}>
              {t("{count} movies · see your favourites", { count: lastMonthRecap.count })} ›
            </Text>
          </Pressable>
        )}

        </>
        )}
      </Animated.ScrollView>
      <ScreenBottomFade />
      <FirstVisitTip id="home" />

      <SwipeSheet
        visible={isSwipeOpen}
        onClose={() => setIsSwipeOpen(false)}
        onStart={startSwiping}
      />
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
        refreshing={refreshing}
        title={t("ReelBoard")}
        wordmark
        logo={<ReelBoardIcon size={24} color={colors.textPrimary} />}
        right={
          <HeaderIconButton
            onPress={() => {
              Haptics.selectionAsync();
              setHomeTab("friends");
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
    // A section: a hairline across the page above it.
    // Sections: one even gap above each.
    section: {
      paddingHorizontal: spacing.md,
      marginTop: SECTION_GAP,
    },
    railSection: {
      marginTop: SECTION_GAP,
    },
    tabsBar: {
      zIndex: 1,
      paddingBottom: spacing.sm,
      backgroundColor: colors.headerBackground,
    },
    // For you / Friends: a dark track, the open one a white pill.
    tabs: {
      flexDirection: "row",
      gap: 2,
      padding: 3,
      backgroundColor: colors.segmentTrack,
      borderRadius: shape.chip,
      marginHorizontal: spacing.md,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6,
      borderRadius: shape.chip,
    },
    tabOn: {
      backgroundColor: colors.segmentOn,
    },
    tabText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.segmentText,
    },
    tabTextOn: {
      color: colors.segmentOnText,
    },
    // The first under the tabs: no line.
    firstSection: {
      marginTop: 0,
    },
    // Home's top card runs edge to edge.
    heroSection: {
      paddingHorizontal: 0,
    },
    recapBanner: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      gap: 2,
      borderRadius: shape.card,
    },
    recapTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    recapHint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    tagRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm + 2,
    },
    tagRowInset: {
      paddingHorizontal: 0,
    },
    // Section titles: bold, sentence case, tight — matching the headers.
    tag: {
      flexShrink: 1,
    },
    // Section names: small grey capitals, so the content leads.
    tagText: {
      ...typography.section,
      color: colors.textSecondary,
    },
    seeAllText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    heroMain: {
      flex: 1,
    },
    // Rounded, like Tonight's pick.
    heroSquare: {
      borderRadius: shape.control,
      minHeight: 48,
    },
  });

export default HomeScreen;

import * as Haptics from "expo-haptics";
import { Bell, Search, Shuffle } from "lucide-react-native";
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
import { ReelBoardIcon } from "../components/icons/TabIcons";
import { PickInsight } from "../components/PickInsight";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import {
  DockHeader,
  HeaderIconButton,
  useDockHeader,
} from "../components/ScreenHeader";
import { ShelfRail } from "../components/ShelfRail";
import { SPIN_STOP_MS } from "../components/RefreshSpin";
import { TonightsPickCard } from "../components/TonightsPickCard";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useLanguageStore } from "../store/languageStore";
import { useMovieStore } from "../store/movieStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getInProgressCollections } from "../utils/collections";
import { formatRuntime } from "../utils/movieFilters";
import { getEndTime, getTonightSuggestions } from "../utils/tonightPick";
import { countFinishedDares } from "../utils/useRanks";
import { buildRecap, getRecapPeriods } from "../utils/recap";
import { t } from "../i18n";
import { useNotificationCount } from "../store/friendsStore";
import { FirstVisitTip } from "../components/FirstVisitTip";

const RECENT_COUNT = 10;

const WATCHLIST_COUNT = 10;
// Shelf rail item widths (each includes its own side padding).
const POSTER_ITEM = 122;
const BOX_ITEM = 142;

// Section labels as the little tags clipped to a store shelf, with an
// optional link on the right.
const ShelfTag = ({ label, right, styles }) => (
  <View style={styles.tagRow}>
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
    {right}
  </View>
);

// Home's top slot when there's no Tonight's Pick: the header asks "Bored?",
// so the first thing under it is the way out — straight into Swipe, Spin
// or AI. A brand-new account (nothing watched or saved yet) gets one
// "Start Discovering" button instead, since there's no taste to work from.
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
        scrollY={scrollY}
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

  return (
    <WatchlistSuggestion
      navigation={navigation}
      styles={styles}
      colors={colors}
      refreshCount={refreshCount}
      scrollY={scrollY}
    />
  );
};

const DAY_MS = 24 * 60 * 60 * 1000;

const timeAgo = (timestamp) => {
  const days = Math.floor((Date.now() - timestamp) / DAY_MS);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return t("{count} days ago", { count: days });
  if (days < 60) return t("{count} weeks ago", { count: Math.round(days / 7) });
  return t("{count} months ago", { count: Math.round(days / 30) });
};

// Home's slot when there's no Tonight's Pick: one concrete suggestion for
// tonight (utils/tonightPick) — the best fit for your taste, lifted when
// it's on your watchlist or moves a saga along — with why (PickInsight),
// a one-tap "make it tonight's pick" and ⇄ to step to the next one.
// `scrollY`: Home's scroll position, so the banner stretches on a pull.
const WatchlistSuggestion = ({
  navigation,
  styles,
  colors,
  refreshCount,
  scrollY,
}) => {
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const dares = countFinishedDares(useChallengeStore((state) => state.history));
  const [offset, setOffset] = useState(0);
  // Pull to refresh on Home steps to the next suggestion.
  const lastRefresh = useRef(refreshCount);
  useEffect(() => {
    if (refreshCount !== lastRefresh.current) {
      lastRefresh.current = refreshCount;
      setOffset((value) => value + 1);
    }
  }, [refreshCount]);

  const candidates = useMemo(
    () => getTonightSuggestions(watched, bucketList, dares),
    [watched, bucketList, dares],
  );
  if (candidates.length === 0) return null;

  const suggestion = candidates[offset % candidates.length];
  const { movie, savedAt, angle } = suggestion;
  const endsAt = getEndTime(movie);
  // Why it's here (its angle) — a watchlist save says when it was saved.
  const tag =
    angle.key === "saved"
      ? {
          text: savedAt
            ? t("On your watchlist · saved {addedAt}", { addedAt: timeAgo(savedAt) })
            : t("On your watchlist"),
        }
      : { text: t(angle.label), color: angle.key === "rank" ? colors.rating : undefined };
  const insight = {
    ...suggestion,
    // With too little history there's no taste to explain it.
    reason:
      suggestion.reason ??
      (suggestion.match == null && !suggestion.saved
        ? t("Highly rated, and you haven't seen it")
        : null),
  };

  // Keyed on the movie, so each new suggestion fades in rather than
  // popping in place.
  return (
    <Animated.View key={movie.id} entering={FadeIn.duration(280)}>
      <HomeHero
        scrollY={scrollY}
        posterUri={movie.poster}
        backdropUri={movie.backdrop}
        eyebrow={t("Suggested for tonight")}
        title={movie.title}
        meta={[
          movie.year,
          movie.genres[0],
          formatRuntime(movie.runtime),
          endsAt && t("ends {time}", { time: endsAt }),
        ]
          .filter(Boolean)
          .join(" · ")}
        details={<PickInsight insight={insight} tag={tag} />}
        onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
        actions={
          <>
            <PrimaryButton
              label={t("Make it tonight's pick")}
              onPress={() => {
                Haptics.selectionAsync();
                togglePickedMovie(movie.id);
              }}
              style={styles.heroMain}
              contentStyle={styles.heroSquare}
            />
            {candidates.length > 1 && (
              <Pressable
                style={styles.heroRound}
                onPress={() => {
                  Haptics.selectionAsync();
                  setOffset((value) => value + 1);
                }}
                hitSlop={4}
                accessibilityLabel={t("Suggest another")}
              >
                <Shuffle size={18} color={colors.textPrimary} />
              </Pressable>
            )}
          </>
        }
      />
    </Animated.View>
  );
};

// Newest-saved first — the freshest "I want to see that" is the likeliest
// pick for tonight.
const WatchlistRail = ({ bucketList, navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  if (bucketList.length === 0) return null;

  const movies = [...bucketList]
    .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
    .slice(0, WATCHLIST_COUNT)
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean);

  return (
    <View style={styles.railSection}>
      <ShelfTag
        label={t("From your watchlist")}
        styles={styles}
        right={
          <Pressable
            hitSlop={8}
            onPress={() =>
              navigation.navigate("Library", { initialTab: "bucketlist" })
            }
          >
            <Text style={styles.seeAllText}>{t("See all")}</Text>
          </Pressable>
        }
      />
      <ShelfRail
        itemWidth={POSTER_ITEM}
        items={movies.map((movie) => ({
          key: movie.id,
          onPress: () =>
            navigation.navigate("MovieDetails", { movieId: movie.id }),
          content: (
            <MoviePoster uri={movie.poster} shadow style={styles.railPoster} />
          ),
          title: movie.title,
          meta: String(movie.year),
        }))}
      />
    </View>
  );
};

const RecentlyWatchedRail = ({ watched, navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  if (watched.length === 0) return null;

  return (
    <View style={styles.railSection}>
      <ShelfTag label={t("Recently watched")} styles={styles} />
      <ShelfRail
        itemWidth={POSTER_ITEM}
        items={[...watched]
          // Newest watch date first (dates can be changed after the fact).
          .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
          .slice(0, RECENT_COUNT)
          .map((entry) => ({ entry, movie: getMovieById(entry.movieId) }))
          .filter(({ movie }) => movie)
          .map(({ entry, movie }) => ({
            key: entry.movieId,
            title: movie.title,
            meta: String(movie.year),
            onPress: () =>
              navigation.navigate("MovieDetails", { movieId: movie.id }),
            content: (
              <MoviePoster
                uri={movie.poster}
                shadow
                style={styles.railPoster}
              />
            ),
          }))}
      />
    </View>
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
    Haptics.selectionAsync();
    setTimeout(() => setRefreshing(false), REFRESH_MS);
    setTimeout(
      () => setRefreshCount((value) => value + 1),
      (REFRESH_MS + SPIN_STOP_MS) / 2,
    );
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
            // The page runs up under the header; Android's spinner comes
            // down below it.
            progressViewOffset={header.barBottom}
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
          paddingTop: header.contentInset,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        <View style={[styles.section, styles.firstSection]}>
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

        <WatchlistRail bucketList={bucketList} navigation={navigation} />

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

        <RecentlyWatchedRail watched={watched} navigation={navigation} />
      </Animated.ScrollView>
      <ScreenBottomFade />
      <FirstVisitTip id="home" />
      <DockHeader
        {...header.props}
        refreshing={refreshing}
        title={t("ReelBoard")}
        italicTitle
        logo={<ReelBoardIcon size={24} color={colors.textPrimary} />}
        right={
          <>
            <HeaderIconButton
              onPress={() => navigation.navigate("Activity")}
              accessibilityLabel={t("Activity")}
              badge={notificationCount}
            >
              <Bell size={22} strokeWidth={1.75} color={colors.textPrimary} />
            </HeaderIconButton>
            <HeaderIconButton
              onPress={() => navigation.navigate("Search")}
              accessibilityLabel={t("Search")}
            >
              <Search size={22} strokeWidth={1.75} color={colors.textPrimary} />
            </HeaderIconButton>
          </>
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
      paddingHorizontal: spacing.md,
      marginTop: spacing.xl,
    },
    // Same vertical rhythm as `section`, but no horizontal padding — used
    // for the two horizontal-scroll rails, so the scrollable row itself
    // reaches both screen edges. Only the label above it keeps the normal
    // margin, via railLabelPadding.
    railSection: {
      marginTop: spacing.xl,
    },
    // The header inset already leaves the gap under the header.
    firstSection: {
      marginTop: 0,
    },
    recapBanner: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      gap: 2,
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
    // Section titles: bold, sentence case, tight — matching the headers.
    tag: {
      flexShrink: 1,
    },
    tagText: {
      ...typography.title,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.3,
      color: colors.textPrimary,
    },
    seeAllText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },
    railPoster: {
      width: POSTER_ITEM - 2,
      aspectRatio: 2 / 3,
    },
    heroMain: {
      flex: 1,
    },
    // Square filled boxes, like Tonight's pick.
    heroSquare: {
      borderRadius: 0,
      minHeight: 48,
    },
    heroRound: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
  });

export default HomeScreen;

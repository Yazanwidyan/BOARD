import * as Haptics from "expo-haptics";
import { Bell, Search, Shuffle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../components/AppText";
import Animated from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ChallengeCard, ChallengePrompt } from "../components/ChallengeCard";
import { CollectionCollage } from "../components/CollectionCollage";
import { HomeHero } from "../components/HomeHero";
import { ReelBoardIcon } from "../components/icons/TabIcons";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import {
  DockHeader,
  HeaderIconButton,
  useDockHeader,
} from "../components/ScreenHeader";
import { ShelfRail } from "../components/ShelfRail";
import { TonightsPickCard } from "../components/TonightsPickCard";
import { MOVIES, getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getInProgressCollections } from "../utils/collections";
import { formatRuntime } from "../utils/movieFilters";
import { openChallengeGenerator } from "../utils/openChallengeGenerator";
import { getLevel, getUserXP } from "../utils/xp";
import { t } from "../i18n";

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
const DecideHeroCard = ({ isFreshAccount, navigation, styles, colors }) => {
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

  return (
    <WatchlistSuggestion
      navigation={navigation}
      styles={styles}
      colors={colors}
    />
  );
};

const SUGGESTION_FALLBACK_POOL = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const timeAgo = (timestamp) => {
  const days = Math.floor((Date.now() - timestamp) / DAY_MS);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return t("{count} days ago", { count: days });
  if (days < 60) return t("{count} weeks ago", { count: Math.round(days / 7) });
  return t("{count} months ago", { count: Math.round(days / 30) });
};

// Home's slot when there's no Tonight's Pick: one concrete suggestion from
// the user's own watchlist — oldest saves first, so things saved long ago
// finally get watched — with a one-tap "make it tonight's pick" and ⇄ to
// step to the next one. With nothing (unwatched) saved, it suggests
// well-rated movies they haven't seen instead.
const WatchlistSuggestion = ({ navigation, styles, colors }) => {
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const [offset, setOffset] = useState(0);

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const saved = [...bucketList]
    .filter((entry) => !watchedIds.has(entry.movieId))
    .sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0))
    .map((entry) => ({
      movie: getMovieById(entry.movieId),
      addedAt: entry.addedAt,
    }))
    .filter((item) => item.movie);
  const fromWatchlist = saved.length > 0;
  const candidates = fromWatchlist
    ? saved
    : MOVIES.filter((movie) => !watchedIds.has(movie.id))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, SUGGESTION_FALLBACK_POOL)
        .map((movie) => ({ movie, addedAt: null }));
  if (candidates.length === 0) return null;

  const { movie, addedAt } = candidates[offset % candidates.length];

  return (
    <HomeHero
      posterUri={movie.poster}
      eyebrow={t("No pick for tonight yet")}
      title={movie.title}
      meta={`${movie.year} · ${movie.genres[0]} · ${formatRuntime(movie.runtime)}`}
      reason={
        <Text style={styles.suggestReason} numberOfLines={1}>
          {fromWatchlist
            ? addedAt
              ? t("On your watchlist · saved {addedAt}", {
                  addedAt: timeAgo(addedAt),
                })
              : t("On your watchlist")
            : t("Highly rated, and you haven't seen it")}
        </Text>
      }
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
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);
  const skipChallenge = useChallengeStore((state) => state.skipChallenge);

  const queuedCount = bucketList.length;
  const watchedCount = watched.length;
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const level = getLevel(getUserXP(watched));
  const inProgressCollections = getInProgressCollections(watchedIds, 4);
  const isFreshAccount =
    !pickedMovieId &&
    !activeChallenge &&
    watchedCount === 0 &&
    queuedCount === 0;

  const header = useDockHeader();

  const handleCreateChallenge = () => {
    if (activeChallenge) skipChallenge();
    openChallengeGenerator(navigation);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: header.contentInset,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        <View style={[styles.section, styles.firstSection]}>
          {pickedMovieId ? (
            <TonightsPickCard navigation={navigation} />
          ) : (
            <DecideHeroCard
              isFreshAccount={isFreshAccount}
              navigation={navigation}
              styles={styles}
              colors={colors}
            />
          )}
        </View>

        <View style={styles.section}>
          {activeChallenge ? (
            <ChallengeCard
              challenge={activeChallenge}
              mode="active"
              onContinue={() =>
                navigation.navigate("MovieDetails", {
                  movieId: activeChallenge.targetMovieId,
                })
              }
              onNewChallenge={handleCreateChallenge}
            />
          ) : (
            <ChallengePrompt onStart={handleCreateChallenge} />
          )}
        </View>

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
                const seen = collection.movies.filter((movie) =>
                  watchedIds.has(movie.id),
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
                    moviesCount: collection.movies.length,
                  }),
                };
              })}
            />
          </View>
        )}

        <RecentlyWatchedRail watched={watched} navigation={navigation} />
      </Animated.ScrollView>
      <ScreenBottomFade />
      <DockHeader
        {...header.props}
        title={t("ReelBoard")}
        italicTitle
        logo={<ReelBoardIcon size={24} color={colors.textPrimary} />}
        right={
          <>
            <HeaderIconButton
              onPress={() => navigation.navigate("Activity")}
              accessibilityLabel={t("Activity")}
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
    suggestReason: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
  });

export default HomeScreen;

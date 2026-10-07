import { ChevronRight, Compass, Shuffle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import * as Haptics from "expo-haptics";

import { ChallengeCard } from "../components/ChallengeCard";
import { BoxSet } from "../components/BoxSet";
import { DvdCase } from "../components/DvdShelf";
import { RankGemIcon } from "../components/icons/RankGemIcon";
import { MarqueeSign } from "../components/MarqueeSign";
import { DockHeader, useDockHeader } from "../components/ScreenHeader";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { SealedChallengeTicket } from "../components/SealedChallengeTicket";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { ShelfRail } from "../components/ShelfRail";
import { TonightsPickCard } from "../components/TonightsPickCard";
import { MOVIES, getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getInProgressCollections } from "../utils/collections";
import { openChallengeGenerator } from "../utils/openChallengeGenerator";
import { formatRuntime } from "../utils/movieFilters";
import { getLevel, getUserXP } from "../utils/xp";

const RECENT_COUNT = 10;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Home's live line — "Friday night, Yazan". Worked out at render, which
// happens whenever any store Home reads changes, so it never goes stale
// for long.
const getTimeGreeting = (date, name) => {
  const hour = date.getHours();
  const part =
    hour < 5
      ? "night"
      : hour < 12
        ? "morning"
        : hour < 17
          ? "afternoon"
          : hour < 21
            ? "evening"
            : "night";
  return `${DAY_NAMES[date.getDay()]} ${part}, ${name}`;
};
const WATCHLIST_COUNT = 10;
// Shelf rail item widths (each includes its own side padding).
const POSTER_ITEM = 112;
const BOX_ITEM = 140;
const DVD_ITEM = 124;

// Section labels as the little tags clipped to a store shelf, with an
// optional link on the right.
const ShelfTag = ({ label, right, styles }) => (
  <View style={styles.tagRow}>
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label.toUpperCase()}</Text>
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
      <MarqueeSign label="OPENING NIGHT">
        <Text style={styles.decideTitle}>Find your first movie</Text>
        <Pressable
          style={styles.decideButtonSolid}
          onPress={() => navigation.navigate("Discover")}
        >
          <Compass size={16} color={colors.accent} />
          <Text style={styles.decideButtonTextSolid}>Start Discovering</Text>
        </Pressable>
      </MarqueeSign>
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
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
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
    <MarqueeSign label="NOTHING SHOWING YET" backdropUri={movie.poster}>
      <Pressable
        style={styles.suggestBody}
        onPress={() =>
          navigation.navigate("MovieDetails", { movieId: movie.id })
        }
      >
        <MoviePoster uri={movie.poster} style={styles.suggestPoster} />
        <View style={styles.suggestInfo}>
          <Text style={styles.suggestLead}>How about</Text>
          <Text style={styles.suggestTitle} numberOfLines={2}>
            {movie.title}?
          </Text>
          <Text style={styles.suggestMeta} numberOfLines={1}>
            {movie.year} · {movie.genres[0]} · {formatRuntime(movie.runtime)}
          </Text>
          <Text style={styles.suggestReason} numberOfLines={1}>
            {fromWatchlist
              ? addedAt
                ? `On your watchlist · saved ${timeAgo(addedAt)}`
                : "On your watchlist"
              : "Highly rated, and you haven't seen it"}
          </Text>
        </View>
      </Pressable>
      <View style={styles.suggestActions}>
        <PrimaryButton
          label="Make it tonight's pick"
          onPress={() => {
            Haptics.selectionAsync();
            togglePickedMovie(movie.id);
          }}
          style={styles.suggestMain}
          contentStyle={styles.suggestButtonContent}
        />
        {candidates.length > 1 && (
          <Pressable
            style={styles.suggestSwap}
            onPress={() => {
              Haptics.selectionAsync();
              setOffset((value) => value + 1);
            }}
            hitSlop={4}
            accessibilityLabel="Suggest another"
          >
            <Shuffle size={18} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>
      <Pressable
        style={styles.suggestLink}
        onPress={() => navigation.navigate("Decide")}
        hitSlop={6}
      >
        <Text style={styles.suggestLinkText}>Open Decide</Text>
        <ChevronRight size={14} color={colors.accentLight} />
      </Pressable>
    </MarqueeSign>
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
        label="From your watchlist"
        styles={styles}
        right={
          <Pressable
            hitSlop={8}
            onPress={() =>
              navigation.navigate("Library", { initialTab: "bucketlist" })
            }
          >
            <Text style={styles.seeAllText}>See All</Text>
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
      <ShelfTag label="Recently watched" styles={styles} />
      <ShelfRail
        itemWidth={DVD_ITEM}
        items={watched
          .slice(0, RECENT_COUNT)
          .map((entry) => ({ entry, movie: getMovieById(entry.movieId) }))
          .filter(({ movie }) => movie)
          .map(({ entry, movie }) => ({
            key: entry.movieId,
            onPress: () =>
              navigation.navigate("MovieDetails", { movieId: movie.id }),
            content: (
              <DvdCase
                movie={movie}
                watchCount={entry.watchCount ?? 1}
                columnWidth={DVD_ITEM - spacing.sm * 2}
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

  const displayName = useProfileStore((state) => state.displayName);
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
            <>
              <ShelfTag label="Your challenge" styles={styles} />
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
            </>
          ) : (
            <>
              <ShelfTag label="Your challenge" styles={styles} />
              <SealedChallengeTicket onPress={handleCreateChallenge} />
            </>
          )}
        </View>

        <WatchlistRail bucketList={bucketList} navigation={navigation} />

        {inProgressCollections.length > 0 && (
          <View style={styles.railSection}>
            <ShelfTag
              label="Continue a collection"
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
                  <Text style={styles.seeAllText}>See All</Text>
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
                    <BoxSet
                      collection={collection}
                      watchedIds={watchedIds}
                      state="progress"
                      size={BOX_ITEM - spacing.sm * 2}
                    />
                  ),
                  title: collection.title,
                  meta: `${seen} of ${collection.movies.length} watched`,
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
        eyebrow={getTimeGreeting(new Date(), displayName)}
        title="Bored? Let's fix that."
        right={
          <Pressable
            style={styles.levelBadge}
            onPress={() => navigation.navigate("Profile")}
          >
            <RankGemIcon size={18} color={colors.accent} />
            <Text style={styles.levelBadgeText}>Lv {level.level}</Text>
          </Pressable>
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
    levelBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.cardElevatedLight,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    levelBadgeText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    section: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    // Same vertical rhythm as `section`, but no horizontal padding — used
    // for the two horizontal-scroll rails, so the scrollable row itself
    // reaches both screen edges. Only the label above it keeps the normal
    // margin, via railLabelPadding.
    railSection: {
      marginTop: spacing.lg,
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
    tag: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      borderRadius: radius.xs,
      backgroundColor: colors.cardElevated,
    },
    tagText: {
      ...typography.label,
      color: colors.textSecondary,
      letterSpacing: 1.2,
    },
    seeAllText: {
      ...typography.label,
      color: colors.accentLight,
    },
    railPoster: {
      width: POSTER_ITEM - spacing.sm * 2,
      aspectRatio: 2 / 3,
    },
    decideTitle: {
      ...typography.title,
      color: colors.textPrimary,
    },
    // Three per row: (100% - 2 gaps) / 3, with the gap as a percentage-ish
    // allowance so it holds on any width.
    suggestBody: {
      flexDirection: "row",
      gap: spacing.md,
    },
    suggestPoster: {
      width: 84,
      aspectRatio: 2 / 3,
    },
    suggestInfo: {
      flex: 1,
      justifyContent: "center",
      gap: 3,
    },
    suggestLead: {
      ...typography.caption,
      color: colors.textMuted,
    },
    suggestTitle: {
      ...typography.title,
      color: colors.textPrimary,
    },
    suggestMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    suggestReason: {
      ...typography.caption,
      color: colors.accentLight,
    },
    suggestActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    suggestMain: {
      flex: 1,
    },
    suggestButtonContent: {
      paddingVertical: 10,
    },
    suggestSwap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
    },
    suggestLink: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: 2,
      marginTop: spacing.sm + 2,
    },
    suggestLinkText: {
      ...typography.label,
      color: colors.accentLight,
    },
    decideButtonSolid: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      marginTop: spacing.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.accentContrast,
    },
    decideButtonTextSolid: {
      ...typography.label,
      color: colors.accent,
    },
  });

export default HomeScreen;

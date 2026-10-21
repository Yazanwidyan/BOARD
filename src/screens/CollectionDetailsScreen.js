import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, BookmarkCheck, Check, Share2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "../components/AppText";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { FriendAvatar } from "../components/FriendAvatar";
import { MovieListRow } from "../components/MovieListRow";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { useMoviesVersion } from "../data/movies";
import { api } from "../services/api";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { openShareCard } from "../store/shareCardStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  giveWatchedFeedback,
  toggleBucketListWithFeedback,
} from "../utils/achievementFeedback";
import {
  useHeroFadeStyle,
  useStretchyBackdropStyle,
} from "../utils/scrollEffects";
import {
  getCollectionById,
  getCollectionCompletedAt,
  getCollectionProgress,
  getSagaRank,
  isSaga,
} from "../utils/collections";
import {
  byWeightedRating,
  formatRuntime,
  isInBucketList,
} from "../utils/movieFilters";
import { shuffle } from "../utils/shuffle";
import { getTastePicks } from "../utils/tasteEngine";
import { TIERS, getTier } from "../utils/tiers";
import { t } from "../i18n";

const TYPE_LABELS = {
  franchise: "Franchise",
  director: "Director",
  actor: "Actor",
  decade: "Decade",
  genre: "Genre",
};
// A saga's eyebrow, by its kind.
const SAGA_LABELS = {
  franchise: "Collection",
  studio: "Studio collection",
  theme: "Collection",
  director: "Director collection",
  actor: "Actor collection",
};

const HEADER_BAR_HEIGHT = 40;
const MARATHON_SIZE = 10;
const BACKDROP_POSTERS = 4;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const formatShortDate = (timestamp) => {
  const date = new Date(timestamp);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
};

// How the "To watch" list can be ordered.
const SORTS = [
  { key: "best", label: "Best first", compare: byWeightedRating },
  { key: "oldest", label: "Oldest", compare: (a, b) => (a.year ?? 9999) - (b.year ?? 9999) },
  {
    key: "shortest",
    label: "Shortest",
    compare: (a, b) => (a.runtime ?? 9999) - (b.runtime ?? 9999),
  },
];

// One frame per film, filled when you've watched it — gold once they all
// are. Thin frames for big collections, but always one each.
const FilmStrip = ({ movieIds, watchedIds, complete, styles }) => (
  <View style={styles.strip}>
    {movieIds.map((id) => (
      <View
        key={id}
        style={[
          styles.frame,
          watchedIds.has(id) && (complete ? styles.frameComplete : styles.frameWatched),
        ]}
      />
    ))}
  </View>
);

// The films you've watched here, as a small tier board: a row per tier you
// used, then the untiered ones — tap one of those to tier it.
const TierBoard = ({ entries, navigation, styles }) => {
  const rows = [
    ...TIERS.map((tier) => ({
      key: tier.key,
      color: tier.color,
      items: entries.filter(({ entry }) => getTier(entry) === tier.key),
    })),
    {
      key: "–",
      color: null,
      items: entries.filter(({ entry }) => !getTier(entry)),
    },
  ].filter((row) => row.items.length > 0);

  return (
    <View style={styles.board}>
      {rows.map((row) => (
        <View key={row.key} style={styles.boardRow}>
          <View style={[styles.boardTier, row.color && { backgroundColor: row.color }]}>
            <Text style={[styles.boardTierText, row.color && styles.boardTierTextOnColor]}>
              {row.key}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardItems}>
            {row.items.map(({ movie }) => (
              <Pressable
                key={movie.id}
                onPress={() =>
                  row.color
                    ? navigation.push("MovieDetails", { movieId: movie.id })
                    : navigation.navigate("TierMovie", { movieId: movie.id })
                }
                accessibilityLabel={movie.title}
              >
                <MoviePoster uri={movie.poster} radius={0} style={styles.boardPoster} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}
      {rows.some((row) => row.key === "–") && (
        <Text style={styles.hint}>{t("Tap an untiered one to tier it.")}</Text>
      )}
    </View>
  );
};

// A collection, from "what's left" to "how you ranked it":
//   the header — the actor's or director's photo, the franchise's artwork,
//     or the films' posters — with a film strip (a frame per film, filled
//     when watched) and what finishing it is worth
//   up next — the best unwatched film for you (the Taste pick engine), why,
//     and buttons to mark it watched or save it
//   to watch — the rest, as a list you can sort
//   your tiers — what you've watched here, as a tier board
//   friends — how far your friends have got
// Once it's complete: the date, the rewatch marathon and share up top, and
// your tiers first.
export const CollectionDetailsScreen = ({ route, navigation }) => {
  const { collectionId } = route.params;
  // The whole collection, with every film in it (the app may have only its
  // first few, or not know it yet), its picture and your friends' progress.
  // The films are remembered by services/api; this screen re-renders as
  // they arrive.
  useMoviesVersion();
  const page = useQuery({
    queryKey: ["collection", collectionId],
    queryFn: () => api.get(`/collections/${collectionId}`),
    staleTime: 60 * 60 * 1000,
  });
  const collection = getCollectionById(collectionId);
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const startSession = useSessionStore((state) => state.startSession);
  const [sortKey, setSortKey] = useState("best");
  // Up next's "not this one" — the films you skipped past here.
  const [skipped, setSkipped] = useState([]);

  // The header bar: transparent over the picture, then a solid bar with the
  // title fades in as the top scrolls away. (Hooks stay above the early
  // return.)
  const [heroHeight, setHeroHeight] = useState(320);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [heroHeight - 140, heroHeight - 80],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  // The title slides up into the bar as it fades in.
  const barTitleStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [heroHeight - 140, heroHeight - 80],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * 10 }],
    };
  });
  // Pull down and the picture zooms in with you; scroll up and it drifts
  // behind the page while the title block eases away.
  const backdropStyle = useStretchyBackdropStyle(scrollY, heroHeight);
  const heroContentStyle = useHeroFadeStyle(scrollY, heroHeight - 80, {
    scale: false,
  });

  const movies = collection?.movies ?? [];
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const unwatched = movies.filter((movie) => !watchedIds.has(movie.id));

  // The best unwatched film for you — the Taste pick engine, over this
  // collection's films.
  const upNext = useMemo(
    () =>
      getTastePicks(watched, {
        from: unwatched,
        watchlist: bucketList.map((entry) => entry.movieId),
        rejected: skipped,
        count: 1,
      })[0] ?? null,
    // The films and what you've watched and skipped are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unwatched.map((movie) => movie.id).join(), watched, skipped],
  );

  if (!collection) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.md }]}>
        <View style={{ flexDirection: "row" }}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        {page.isError ? (
          <Text style={styles.loadingText}>
            {t("Couldn't load this collection. Check your connection and try again.")}
          </Text>
        ) : (
          <ActivityIndicator color={colors.textSecondary} style={{ marginTop: spacing.xl * 2 }} />
        )}
      </View>
    );
  }

  const { watchedCount, total } = getCollectionProgress(collection, watchedIds);
  const isComplete = total > 0 && watchedCount === total;
  const minutesLeft = unwatched.reduce((sum, movie) => sum + (movie.runtime ?? 0), 0);
  const totalMinutes = movies.reduce((sum, movie) => sum + (movie.runtime ?? 0), 0);
  // A saga: the rank you've reached, the next one, and how many so far.
  const saga = isSaga(collection) ? getSagaRank(collection, watchedIds) : null;
  const completedAt = isComplete ? getCollectionCompletedAt(collection, watched) : null;
  const art = page.data?.art ?? null;
  const friends = page.data?.friends ?? [];

  const openMovie = (movieId) => navigation.push("MovieDetails", { movieId });

  const markWatched = (movieId) => {
    const { watched: watchedBefore, bucketList: bucketListBefore } =
      useMovieStore.getState();
    toggleWatched(movieId);
    giveWatchedFeedback(movieId, watchedBefore, bucketListBefore);
  };

  // Opens the brag image card (posters grid + "I've seen all N …").
  const shareCollection = () => openShareCard(collection.id);

  // A completed collection's own movies as a Swipe session — pick tonight's
  // rewatch from the set you just finished.
  const startMarathon = () => {
    startSession(shuffle(movies).slice(0, MARATHON_SIZE));
    navigation.navigate("Swipe");
  };

  const sort = SORTS.find((item) => item.key === sortKey) ?? SORTS[0];
  const toWatch = unwatched
    .filter((movie) => movie.id !== upNext?.movie.id)
    .sort(sort.compare);

  const watchedEntries = watched
    .filter((entry) => collection.movieIds.includes(entry.movieId))
    .map((entry) => ({ entry, movie: movies.find((movie) => movie.id === entry.movieId) }))
    .filter((item) => item.movie);

  const headerTop = insets.top + spacing.sm;
  const progressLine = isComplete
    ? [
        t("{count} films", { count: total }),
        formatRuntime(totalMinutes),
        completedAt ? t("finished {date}", { date: formatShortDate(completedAt) }) : null,
      ]
    : [
        saga?.current ? saga.current.title : null,
        t("{watched} of {total} watched", { watched: watchedCount, total }),
        saga?.next
          ? t("{count} more to {rank}", {
              count: saga.next.at - watchedCount,
              rank: saga.next.title,
            })
          : minutesLeft > 0
            ? t("{time} to go", { time: formatRuntime(minutesLeft) })
            : null,
      ];

  const tiersSection = watchedEntries.length > 0 && (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{t("Your tiers")}</Text>
      <TierBoard entries={watchedEntries} navigation={navigation} styles={styles} />
    </View>
  );

  const friendsSection = friends.length > 0 && (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{t("Friends")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friends}>
        {friends.map(({ user, watchedCount: count }) => (
          <Pressable
            key={user.id}
            style={styles.friend}
            onPress={() => navigation.navigate("FriendProfile", { friendId: user.id })}
            accessibilityRole="button"
          >
            <FriendAvatar friend={user} size={44} />
            <Text style={styles.friendName} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={[styles.friendCount, count === total && styles.friendCountDone]}>
              {count === total ? t("All {total}", { total }) : t("{watched} of {total}", { watched: count, total })}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        <View
          style={[
            styles.hero,
            { paddingTop: headerTop + HEADER_BAR_HEIGHT + spacing.xl * 2 },
          ]}
          onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}
        >
          {/* The collection's own picture, fading into the page. */}
          <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="none">
            {art?.backdrop ? (
              <Image source={{ uri: art.backdrop }} style={styles.backdropImage} />
            ) : art?.photo ? (
              // A portrait: on the right, fading into the page on its left.
              <View style={styles.portraitWrap}>
                <Image source={{ uri: art.photo }} style={styles.portrait} />
                <LinearGradient
                  colors={[colors.background, `${colors.background}00`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.6, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            ) : (
              <View style={styles.collage}>
                {movies.slice(0, BACKDROP_POSTERS).map((movie) => (
                  <MoviePoster
                    key={movie.id}
                    uri={movie.poster}
                    blurRadius={14}
                    style={styles.collagePoster}
                  />
                ))}
              </View>
            )}
            <LinearGradient
              colors={[`${colors.background}59`, colors.background]}
              locations={[0.2, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <Animated.View style={heroContentStyle}>
            <Text style={styles.eyebrow}>
              {t(
                (saga ? SAGA_LABELS[collection.kind] : TYPE_LABELS[collection.type]) ??
                  "Collection",
              )}
              {isComplete ? t(" · Completed") : ""}
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              {collection.title}
            </Text>
            {!!collection.subtitle && (
              <Text style={styles.subtitle} numberOfLines={2}>
                {collection.subtitle}
              </Text>
            )}

            <FilmStrip
              movieIds={collection.movieIds}
              watchedIds={watchedIds}
              complete={isComplete}
              styles={styles}
            />
            <View style={styles.progressRow}>
              <Text style={styles.progressText} numberOfLines={1}>
                {progressLine.filter(Boolean).join(" · ")}
              </Text>
              {saga && (
                <View style={[styles.xpChip, isComplete && styles.xpChipEarned]}>
                  <Text style={[styles.xpText, isComplete && styles.xpTextEarned]}>
                    {isComplete
                      ? t("{count} ranks earned", { count: saga.reached.length })
                      : t("{count} of {total} ranks", {
                          count: saga.reached.length,
                          total: collection.ranks.length,
                        })}
                  </Text>
                </View>
              )}
            </View>

            {/* The ranks you climb, in order — the ones you've reached lit. */}
            {saga && collection.ranks.length > 0 && (
              <View style={styles.ranks}>
                {collection.ranks.map((rank) => {
                  const reached = watchedCount >= rank.at;
                  const isCurrent = saga.current?.title === rank.title;
                  return (
                    <View
                      key={rank.title}
                      style={[
                        styles.rank,
                        reached && styles.rankReached,
                        isCurrent && styles.rankCurrent,
                      ]}
                    >
                      <Text
                        style={[styles.rankTitle, reached && styles.rankTitleReached]}
                        numberOfLines={1}
                      >
                        {rank.title}
                      </Text>
                      <Text style={[styles.rankAt, reached && styles.rankAtReached]}>
                        {rank.at === total
                          ? t("All {total}", { total })
                          : t("{count} films", { count: rank.at })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        </View>

        {isComplete ? (
          <>
            <View style={styles.actions}>
              <PrimaryButton
                label={t("Rewatch marathon")}
                onPress={startMarathon}
                style={styles.action}
                contentStyle={styles.actionContent}
              />
              <PrimaryButton
                label={t("Share")}
                variant="secondary"
                onPress={shareCollection}
                style={styles.action}
                contentStyle={styles.actionContent}
              />
            </View>
            {tiersSection}
            {friendsSection}
          </>
        ) : (
          <>
            {upNext && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t("Up next")}</Text>
                <View style={styles.upNext}>
                  <Pressable onPress={() => openMovie(upNext.movie.id)} accessibilityLabel={upNext.movie.title}>
                    <MoviePoster uri={upNext.movie.poster} radius={0} style={styles.upNextPoster} />
                  </Pressable>
                  <View style={styles.upNextInfo}>
                    <Pressable onPress={() => openMovie(upNext.movie.id)}>
                      <Text style={styles.upNextTitle} numberOfLines={2}>
                        {upNext.movie.title}
                      </Text>
                      <Text style={styles.upNextMeta} numberOfLines={1}>
                        {[
                          upNext.movie.year,
                          upNext.movie.runtime ? formatRuntime(upNext.movie.runtime) : null,
                          upNext.movie.rating ? `★ ${upNext.movie.rating.toFixed(1)}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </Pressable>
                    {!!upNext.reasons[0] && (
                      <Text style={styles.upNextReason} numberOfLines={3}>
                        {upNext.reasons[0]}
                      </Text>
                    )}
                    <View style={styles.upNextButtons}>
                      <Pressable
                        style={({ pressed }) => [styles.upNextButton, styles.upNextPrimary, pressed && styles.pressed]}
                        onPress={() => markWatched(upNext.movie.id)}
                        accessibilityRole="button"
                      >
                        <Check size={15} color={colors.selectedText} strokeWidth={2.6} />
                        <Text style={styles.upNextPrimaryText}>{t("Watched")}</Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.upNextButton, pressed && styles.pressed]}
                        onPress={() => toggleBucketListWithFeedback(upNext.movie.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t("Watchlist")}
                      >
                        {isInBucketList(bucketList, upNext.movie.id) ? (
                          <BookmarkCheck size={16} color={colors.textPrimary} />
                        ) : (
                          <Bookmark size={16} color={colors.textSecondary} />
                        )}
                      </Pressable>
                      {unwatched.length > 1 && (
                        <Pressable
                          style={({ pressed }) => [styles.upNextButton, pressed && styles.pressed]}
                          onPress={() => setSkipped((list) => [...list, upNext.movie.id])}
                          accessibilityRole="button"
                        >
                          <Text style={styles.upNextSkipText}>{t("Another")}</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {toWatch.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={[styles.sectionLabel, styles.sectionLabelInRow]}>
                    {t("To watch · {count}", { count: toWatch.length })}
                  </Text>
                  <View style={styles.sorts}>
                    {SORTS.map((item) => {
                      const active = item.key === sort.key;
                      return (
                        <Pressable
                          key={item.key}
                          onPress={() => setSortKey(item.key)}
                          style={[styles.sort, active && styles.sortActive]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                        >
                          <Text style={[styles.sortText, active && styles.sortTextActive]}>
                            {t(item.label)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                {toWatch.map((movie) => (
                  <MovieListRow
                    key={movie.id}
                    movie={movie}
                    inQueue={isInBucketList(bucketList, movie.id)}
                    onToggleQueue={() => toggleBucketListWithFeedback(movie.id)}
                    onPress={() => openMovie(movie.id)}
                  />
                ))}
              </View>
            )}

            {tiersSection}
            {friendsSection}
          </>
        )}
      </Animated.ScrollView>

      <View
        style={[
          styles.headerBar,
          {
            paddingTop: headerTop,
            height: headerTop + HEADER_BAR_HEIGHT + spacing.sm,
          },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[styles.headerBarFill, barStyle]}
          pointerEvents="none"
        />
        {/* Same width as the share button, so the title stays centred. */}
        <View style={styles.headerSide}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <Animated.Text
          style={[styles.headerTitle, barTitleStyle]}
          numberOfLines={1}
          pointerEvents="none"
        >
          {collection.title}
        </Animated.Text>
        <Pressable
          style={styles.headerIconButton}
          onPress={shareCollection}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("Share this collection")}
        >
          <Share2 size={22} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xl * 2,
    },
    headerBar: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      paddingHorizontal: spacing.md,
      flexDirection: "row",
      alignItems: "center",
    },
    headerSide: {
      width: HEADER_BAR_HEIGHT,
      flexDirection: "row",
    },
    headerBarFill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      ...typography.title,
      flex: 1,
      fontSize: 18,
      letterSpacing: -0.3,
      textAlign: "center",
      color: colors.textPrimary,
      marginHorizontal: spacing.sm,
    },
    // Flat, like the other header icons (no circle).
    headerIconButton: {
      width: HEADER_BAR_HEIGHT,
      height: HEADER_BAR_HEIGHT,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.7,
    },

    // ---- Header
    // No overflow clipping: the picture has to grow past the hero's top
    // when you pull down.
    hero: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    backdropImage: {
      width: "100%",
      height: "100%",
      opacity: 0.7,
    },
    portraitWrap: {
      position: "absolute",
      top: 0,
      bottom: 0,
      end: 0,
      width: "62%",
    },
    portrait: {
      width: "100%",
      height: "100%",
      opacity: 0.85,
    },
    collage: {
      flex: 1,
      flexDirection: "row",
    },
    collagePoster: {
      flex: 1,
      height: "100%",
      opacity: 0.55,
    },
    eyebrow: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 2,
    },
    // A saga's ranks: a step each, side by side; reached ones gold.
    ranks: {
      flexDirection: "row",
      gap: 2,
      marginTop: spacing.md,
    },
    rank: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.card,
      gap: 2,
    },
    rankReached: {
      backgroundColor: `${colors.rating}29`,
    },
    rankCurrent: {
      backgroundColor: colors.rating,
    },
    rankTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    rankTitleReached: {
      color: colors.textPrimary,
    },
    rankAt: {
      ...typography.micro,
      color: colors.textMuted,
    },
    rankAtReached: {
      color: colors.textSecondary,
    },
    // The film strip: a frame per film, 2px apart.
    strip: {
      flexDirection: "row",
      gap: 2,
      height: 10,
      marginTop: spacing.md,
    },
    frame: {
      flex: 1,
      backgroundColor: colors.border,
    },
    frameWatched: {
      backgroundColor: colors.textPrimary,
    },
    frameComplete: {
      backgroundColor: colors.rating,
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    progressText: {
      ...typography.caption,
      flex: 1,
      color: colors.textSecondary,
    },
    xpChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      backgroundColor: colors.card,
    },
    xpChipEarned: {
      backgroundColor: colors.rating,
    },
    xpText: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.textPrimary,
    },
    xpTextEarned: {
      color: "#0C1014",
    },

    // ---- Sections
    section: {
      marginTop: spacing.lg,
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    sectionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    sectionLabelInRow: {
      paddingHorizontal: 0,
      marginBottom: 0,
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      marginTop: spacing.xs,
    },

    // ---- Up next
    upNext: {
      flexDirection: "row",
      gap: spacing.md,
      marginHorizontal: spacing.md,
      padding: spacing.sm,
      backgroundColor: colors.card,
    },
    upNextPoster: {
      width: 96,
      height: 144,
    },
    upNextInfo: {
      flex: 1,
      gap: spacing.xs,
    },
    upNextTitle: {
      ...typography.title,
      fontSize: 18,
      color: colors.textPrimary,
    },
    upNextMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    upNextReason: {
      ...typography.caption,
      color: colors.textPrimary,
      fontStyle: "italic",
    },
    upNextButtons: {
      flexDirection: "row",
      gap: 2,
      marginTop: "auto",
    },
    upNextButton: {
      height: 34,
      minWidth: 40,
      paddingHorizontal: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.background,
    },
    upNextPrimary: {
      backgroundColor: colors.selected,
      paddingHorizontal: spacing.md,
    },
    upNextPrimaryText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.selectedText,
    },
    upNextSkipText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },

    // ---- To watch: sort chips
    sorts: {
      flexDirection: "row",
      gap: 2,
    },
    sort: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      backgroundColor: colors.card,
    },
    sortActive: {
      backgroundColor: colors.selected,
    },
    sortText: {
      ...typography.bodyBold,
      fontSize: 11,
      color: colors.textSecondary,
    },
    sortTextActive: {
      color: colors.selectedText,
    },

    // ---- Your tiers
    board: {
      gap: 2,
    },
    boardRow: {
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor: colors.card,
    },
    boardTier: {
      width: 40,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
    },
    boardTierText: {
      ...typography.title,
      fontSize: 18,
      color: colors.textMuted,
    },
    boardTierTextOnColor: {
      color: "#0C1014",
    },
    boardItems: {
      gap: 2,
      padding: 2,
    },
    boardPoster: {
      width: 48,
      height: 72,
    },

    // ---- Friends
    friends: {
      gap: spacing.md,
      paddingHorizontal: spacing.md,
    },
    friend: {
      width: 72,
      alignItems: "center",
      gap: 4,
    },
    friendName: {
      ...typography.caption,
      color: colors.textPrimary,
      maxWidth: 72,
    },
    friendCount: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    friendCountDone: {
      color: colors.rating,
    },

    // ---- Done: actions
    actions: {
      flexDirection: "row",
      gap: 2,
      padding: spacing.md,
    },
    action: {
      flex: 1,
    },
    // Square, like the app's other filled boxes.
    actionContent: {
      borderRadius: 0,
      paddingVertical: 12,
    },
  });

export default CollectionDetailsScreen;

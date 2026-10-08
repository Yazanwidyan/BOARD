import {
  Bell,
  Layers,
  LayoutGrid,
  ListOrdered,
  Pin,
  Settings as SettingsIcon,
  Share2,
  Users,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../components/AppText";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { BottomSheet } from "../components/BottomSheet";
import { EmptyState } from "../components/EmptyState";
import { TopTenPicker } from "../components/TopTenPicker";
import {
  DockHeader,
  HeaderIconButton,
  useDockHeader,
} from "../components/ScreenHeader";
import { MoviePoster } from "../components/MoviePoster";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { TasteShareSheet } from "../components/TasteShareSheet";
import { WatcherCard } from "../components/WatcherCard";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { MAX_PINNED, useProfileStore } from "../store/profileStore";
import { showToast } from "../store/toastStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getMovieById } from "../data/movies";
import { getBadges } from "../utils/badges";
import { getShowcaseBadges } from "../components/BadgeMedal";
import { getCompletedCollectionsCount } from "../utils/collections";
import { FAVORITE_COUNT, getTasteProfile } from "../utils/taste";
import { TIERS, getTier, getTierInfo, isRated } from "../utils/tiers";
import {
  COLLECTION_XP,
  DIRECTOR_DEPTH_XP,
  NEW_DECADE_XP,
  NEW_GENRE_XP,
  RATE_XP,
  WATCH_XP,
  getCompletedChallengesCount,
  getLevel,
  getCompletedXPCollections,
  getXPBreakdown,
} from "../utils/xp";
import { isRTL, t } from "../i18n";

const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-default.png");

// Favorite ten: a 5 × 2 poster grid.
const FAVORITE_COLUMNS = 5;
// Completed tab: a 3-column grid of collection covers.
const COMPLETED_COLUMNS = 3;
// Tier list rows: poster size beside each tier letter.
const TIER_POSTER_WIDTH = 64;
// The blurred poster strip behind the identity.
const BACKDROP_POSTERS = 5;
const BACKDROP_HEIGHT = 190;

// Completed tab sections, in this order.
const COMPLETED_GROUPS = [
  { type: "actor", title: "Actors", unit: "movies" },
  { type: "director", title: "Directors", unit: "films" },
  { type: "franchise", title: "Franchises", unit: "movies" },
];

const PROFILE_TABS = [
  { key: "overview", label: "Overview", Icon: LayoutGrid },
  { key: "tiers", label: "Tier list", Icon: ListOrdered },
  { key: "completed", label: "Collections", Icon: Layers },
];

const getHandle = (name) =>
  `@${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") || "you"
  }`;

export const ProfileScreen = ({ navigation, route }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // Edge to edge (no page padding), 2px apart.
  // Whole pixels, so five always fit on a row without wrapping early.
  const favoriteWidth = Math.floor(
    (windowWidth - 2 * (FAVORITE_COLUMNS - 1)) / FAVORITE_COLUMNS,
  );
  // An explicit height (not aspectRatio): Yoga can mis-measure a wrapping
  // row of aspect-ratio items and clip the second row.
  const favoriteSize = { width: favoriteWidth, height: favoriteWidth * 1.5 };
  const completedWidth =
    (windowWidth - spacing.md * 2 - 2 * (COMPLETED_COLUMNS - 1)) /
    COMPLETED_COLUMNS;
  const [isLeagueSheetOpen, setIsLeagueSheetOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [profileTab, setProfileTab] = useState("overview");

  // "View Details" on the watched/challenge XP alert deep-links straight
  // into this sheet instead of just landing on the plain profile page.
  useEffect(() => {
    if (!route?.params?.openLeagueSheet) return undefined;
    navigation.setParams({ openLeagueSheet: undefined });
    // Arriving from the reward dialog: let its Modal finish closing first —
    // on iOS, presenting a Modal while another is still dismissing can
    // leave the new one stuck invisibly on top of everything.
    const timer = setTimeout(() => setIsLeagueSheetOpen(true), 350);
    return () => clearTimeout(timer);
  }, [route?.params?.openLeagueSheet, navigation]);

  const bucketListEntries = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const displayName = useProfileStore((state) => state.displayName);
  const bio = useProfileStore((state) => state.bio);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  const pinnedCollections = useProfileStore(
    (state) => state.pinnedCollections ?? [],
  );
  const togglePinnedCollection = useProfileStore(
    (state) => state.togglePinnedCollection,
  );
  const challengeHistory = useChallengeStore((state) => state.history);

  const queuedCount = bucketListEntries.length;
  const watchedCount = watched.length;
  const ratedCount = watched.filter(isRated).length;
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  // Your hand-picked top ten, in rank order (only movies still watched).
  const topTenIds = useProfileStore((state) => state.topTen) ?? [];
  const toggleTopTen = useProfileStore((state) => state.toggleTopTen);
  const topTenMovies = topTenIds
    .filter((id) => watchedIds.has(id))
    .map((id) => getMovieById(id))
    .filter(Boolean);
  const [isTopTenOpen, setIsTopTenOpen] = useState(false);
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
  const earnedBadgeCount = badges.filter((badge) => badge.earned).length;
  const xpBreakdown = getXPBreakdown(watched);
  const xp = xpBreakdown.total;
  const level = getLevel(xp);
  const xpToNextLevel = Math.max(
    0,
    Math.ceil(level.requiredXP - level.currentXP),
  );
  const header = useDockHeader();

  const taste = getTasteProfile(watched);

  // The Watcher card: same data on Profile and in the shared image.

  // Tier list: every watched movie in its tier row, most recent first.
  const watchedByRecent = [...watched].sort(
    (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0),
  );
  const tierRows = TIERS.map((tier) => ({
    ...tier,
    movies: watchedByRecent
      .filter((entry) => getTier(entry) === tier.key)
      .map((entry) => getMovieById(entry.movieId))
      .filter(Boolean),
  }));
  const untieredCount = watched.length - ratedCount;

  // Backdrop: your top ten (or, before you've picked any, what you watched
  // last).
  const backdropPosters = (
    topTenMovies.length > 0
      ? topTenMovies
      : watchedByRecent
          .map((entry) => getMovieById(entry.movieId))
          .filter(Boolean)
  ).slice(0, BACKDROP_POSTERS);

  // Fully completed director / actor / franchise sets — the brag shelf.
  // Pinned ones first (in pin order), then the rest by size.
  const completedSets = getCompletedXPCollections(watchedIds).sort((a, b) => {
    const pinA = pinnedCollections.indexOf(a.id);
    const pinB = pinnedCollections.indexOf(b.id);
    if (pinA !== -1 || pinB !== -1) {
      return (pinA === -1 ? 99 : pinA) - (pinB === -1 ? 99 : pinB);
    }
    return b.movies.length - a.movies.length;
  });

  const togglePin = (collection) => {
    const isPinned = pinnedCollections.includes(collection.id);
    if (!isPinned && pinnedCollections.length >= MAX_PINNED) {
      showToast(
        t("You can pin up to {MAX_PINNED} — unpin one first", {
          MAX_PINNED: MAX_PINNED,
        }),
      );
      return;
    }
    togglePinnedCollection(collection.id);
    showToast(
      isPinned
        ? t("Unpinned")
        : t("{title} pinned", { title: collection.title }),
      {
        tone: "success",
      },
    );
  };

  const getShareText = () => {
    const genres = taste.topGenres.map(({ genre }) => genre).join(" · ");
    const favorites = topTenMovies
      .slice(0, 5)
      .map((movie) => movie.title)
      .join(", ");
    const lines = [
      t("My ReelBoard taste card"),
      genres && t("Into: {genres}", { genres }),
      favorites && t("Favorites: {favorites}", { favorites }),
      completedSets.length > 0 &&
        t("Collections: {list}", {
          list: completedSets
            .slice(0, 3)
            .map((collection) => collection.title)
            .join(" · "),
        }),
      t("{count} movies · {hours} hours", {
        count: watchedCount,
        hours: Math.round(taste.minutesWatched / 60),
      }),
      t("Level {level} · {name}", { level: level.level, name: t(level.name) }),
    ].filter(Boolean);
    return lines.join("\n");
  };

  const watcherCardProps = {
    displayName,
    handle: getHandle(displayName),
    bio,
    avatarSource: avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE,
    level,
    earnedBadgeCount,
    showcase: getShowcaseBadges(badges),
    allBadges: badges,
    stats: {
      movies: watchedCount,
      hours: Math.round(taste.minutesWatched / 60),
      completed: completedSets.length,
    },
  };

  // ---- Swipeable profile pages ----
  // Swipe sideways over the page (or tap an icon) to switch tabs. While you
  // drag, the page follows your finger and the underline slides with it;
  // let go past a quarter of the screen (or flick) and the next page slides
  // in from that side.
  const tabIndex = PROFILE_TABS.findIndex(({ key }) => key === profileTab);
  const lastTabIndex = PROFILE_TABS.length - 1;
  const tabWidth = windowWidth / PROFILE_TABS.length;
  const tabPosition = useSharedValue(tabIndex);
  const pageShift = useSharedValue(0);
  // In Arabic (RTL) the tabs run right to left, so "next" is a swipe to
  // the right and the underline slides the other way. Movement is worked
  // out in reading direction, then flipped back for the screen.
  const flow = isRTL() ? -1 : 1;

  // direction: 1 = the next page (it comes in from the reading-end side).
  const showTab = (nextIndex, direction) => {
    setProfileTab(PROFILE_TABS[nextIndex].key);
    tabPosition.value = withTiming(nextIndex, { duration: 220 });
    pageShift.value = direction * flow * windowWidth * 0.35;
    pageShift.value = withTiming(0, { duration: 220 });
  };

  const pageSwipe = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      const along = event.translationX * flow;
      const pastEdge =
        (tabIndex === 0 && along > 0) ||
        (tabIndex === lastTabIndex && along < 0);
      // Rubber-band at the first and last page.
      const shift = pastEdge ? along * 0.2 : along;
      pageShift.value = shift * flow;
      tabPosition.value = Math.min(
        lastTabIndex,
        Math.max(0, tabIndex - shift / windowWidth),
      );
    })
    .onEnd((event) => {
      const direction = event.translationX * flow < 0 ? 1 : -1;
      const nextIndex = tabIndex + direction;
      const committed =
        Math.abs(event.translationX) > windowWidth * 0.22 ||
        Math.abs(event.velocityX) > 700;
      if (committed && nextIndex >= 0 && nextIndex <= lastTabIndex) {
        pageShift.value = withTiming(
          -direction * flow * windowWidth * 0.5,
          { duration: 120 },
          (finished) => {
            if (finished) runOnJS(showTab)(nextIndex, direction);
          },
        );
      } else {
        pageShift.value = withTiming(0, { duration: 180 });
        tabPosition.value = withTiming(tabIndex, { duration: 180 });
      }
    });

  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pageShift.value }],
    opacity: 1 - Math.min(Math.abs(pageShift.value) / windowWidth, 1) * 0.7,
  }));
  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabPosition.value * tabWidth * flow }],
  }));

  const goToLibrary = (initialTab) => {
    navigation.navigate("Library", { initialTab });
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: header.contentInset }}
      >
        {/* Backdrop — your favorites, blurred, fading into the page. */}
        {backdropPosters.length > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.backdrop,
              { height: header.contentInset + BACKDROP_HEIGHT },
            ]}
          >
            {backdropPosters.map((movie) => (
              <MoviePoster
                key={movie.id}
                uri={movie.poster}
                blurRadius={14}
                style={styles.backdropPoster}
              />
            ))}
            <LinearGradient
              colors={[`${colors.background}8C`, colors.background]}
              locations={[0, 0.95]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}

        <View style={styles.profileWrap}>
          {/* Watcher card — avatar beside the numbers (badges included),
              name and level, bio as a quote. */}
          <WatcherCard
            {...watcherCardProps}
            xpToNextLevel={xpToNextLevel}
            onPressAvatar={() => setIsLeagueSheetOpen(true)}
            onPressBio={() => navigation.navigate("Settings")}
            onPressBadges={() => navigation.navigate("Badges")}
          />

          {/* Profile tabs, Instagram-style: an icon per column over a
              hairline, the open one white with a thin underline. Swipe the
              page below to switch too. */}
          <View style={styles.tabTrack}>
            {PROFILE_TABS.map(({ key, label, Icon }, index) => {
              const isActive = profileTab === key;
              return (
                <Pressable
                  key={key}
                  style={styles.tabOption}
                  onPress={() => {
                    if (index !== tabIndex) {
                      showTab(index, index > tabIndex ? 1 : -1);
                    }
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Icon
                    size={22}
                    color={isActive ? colors.textPrimary : colors.textMuted}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <Text
                    style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
            <Animated.View
              pointerEvents="none"
              style={[styles.tabUnderline, { width: tabWidth }, underlineStyle]}
            />
          </View>

          <GestureDetector gesture={pageSwipe}>
            <Animated.View style={pageStyle}>
              {profileTab === "overview" && (
                <>
                  {/* Top ten — picked by hand, right under the tabs.
                      Tap a poster to open it, long-press to take it out;
                      empty slots open the picker. */}
                  <View style={styles.favoriteRow}>
                    {Array.from({ length: FAVORITE_COUNT }, (_, index) => {
                      const movie = topTenMovies[index];
                      return movie ? (
                        <Pressable
                          key={movie.id}
                          style={[styles.favoriteSlot, favoriteSize]}
                          onPress={() =>
                            navigation.navigate("MovieDetails", {
                              movieId: movie.id,
                            })
                          }
                          onLongPress={() => {
                            toggleTopTen(movie.id);
                            showToast(
                              t("{title} taken out of your top ten", {
                                title: movie.title,
                              }),
                            );
                          }}
                          accessibilityLabel={t("Number {value}, {title}", {
                            value: index + 1,
                            title: movie.title,
                          })}
                        >
                          <MoviePoster
                            uri={movie.poster}
                            style={styles.favoritePoster}
                          />
                          <View style={styles.favoriteRank}>
                            <Text style={styles.favoriteRankText}>
                              {index + 1}
                            </Text>
                          </View>
                        </Pressable>
                      ) : (
                        <Pressable
                          key={`empty-${index}`}
                          style={[
                            styles.favoriteSlot,
                            styles.favoriteEmpty,
                            favoriteSize,
                          ]}
                          onPress={() => setIsTopTenOpen(true)}
                          accessibilityLabel={t(
                            "Top ten number {value}, empty. Pick a movie",
                            { value: index + 1 },
                          )}
                        >
                          <Text style={styles.favoriteEmptyRank}>
                            {index + 1}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.topTenBar}>
                    <Text style={styles.topTenLabel}>
                      {t("Your top ten")}
                      {topTenMovies.length > 0 &&
                        topTenMovies.length < FAVORITE_COUNT &&
                        t(" · {topTenMoviesCount} of {FAVORITE_COUNT}", {
                          topTenMoviesCount: topTenMovies.length,
                          FAVORITE_COUNT: FAVORITE_COUNT,
                        })}
                    </Text>
                    <Pressable
                      onPress={() => setIsTopTenOpen(true)}
                      hitSlop={8}
                    >
                      <Text style={styles.topTenEdit}>
                        {topTenMovies.length > 0 ? t("Edit") : t("Pick")}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Taste */}
                  {taste.topGenres.length > 0 && (
                    <>
                      <Text style={styles.sectionLabel}>{t("Taste")}</Text>
                      <View style={styles.tasteCard}>
                        {/* Watch most vs love most */}
                        <Text style={styles.tasteInsight}>
                          {!taste.tasteInsight ? (
                            <>
                              {t(
                                "Tier a few movies to see which genres you really love.",
                              )}{" "}
                              <Text
                                style={styles.tasteInsightLink}
                                onPress={() =>
                                  navigation.navigate("Library", {
                                    showUntiered: true,
                                  })
                                }
                              >
                                {t("See untiered")}
                              </Text>
                            </>
                          ) : taste.tasteInsight.mostWatched ===
                            taste.tasteInsight.mostLoved ? (
                            <>
                              <Text style={styles.tasteInsightStrong}>
                                {taste.tasteInsight.mostWatched}
                              </Text>{" "}
                              {t(
                                "is what you watch most — and what you tier highest.",
                              )}
                            </>
                          ) : (
                            <>
                              {t("You watch")}{" "}
                              <Text style={styles.tasteInsightStrong}>
                                {taste.tasteInsight.mostWatched}
                              </Text>{" "}
                              {t("most, but")}{" "}
                              <Text style={styles.tasteInsightStrong}>
                                {taste.tasteInsight.mostLoved}
                              </Text>{" "}
                              {t("gets your best tiers.")}
                            </>
                          )}
                        </Text>

                        {/* Each top genre: how much you watch it, how you tier it */}
                        {taste.genreTiers.map(
                          ({
                            genre,
                            count,
                            tierCounts,
                            tiered,
                            typicalTier,
                          }) => (
                            <View key={genre} style={styles.genreRow}>
                              <View style={styles.genreRowHead}>
                                <Text
                                  style={styles.genreName}
                                  numberOfLines={1}
                                >
                                  {genre}
                                </Text>
                                <Text style={styles.genreCount}>
                                  {count} watched
                                </Text>
                                <View style={styles.genreSpacer} />
                                {typicalTier ? (
                                  <Text style={styles.genreTypical}>
                                    mostly{" "}
                                    <Text
                                      style={[
                                        styles.genreTypicalTier,
                                        {
                                          color: getTierInfo(typicalTier).color,
                                        },
                                      ]}
                                    >
                                      {typicalTier}
                                    </Text>
                                  </Text>
                                ) : (
                                  <Pressable
                                    onPress={() =>
                                      navigation.navigate("Library", {
                                        showUntiered: true,
                                      })
                                    }
                                    hitSlop={8}
                                  >
                                    <Text style={styles.genreUntiered}>
                                      {t("not tiered yet")}
                                    </Text>
                                  </Pressable>
                                )}
                              </View>
                              <View style={styles.tierStrip}>
                                {TIERS.filter(
                                  ({ key }) => tierCounts[key] > 0,
                                ).map(({ key, color }) => (
                                  <View
                                    key={key}
                                    style={{
                                      flex: tierCounts[key],
                                      backgroundColor: color,
                                    }}
                                  />
                                ))}
                                {count - tiered > 0 && (
                                  <View
                                    style={{
                                      flex: count - tiered,
                                      backgroundColor: colors.surfaceSoft,
                                    }}
                                  />
                                )}
                              </View>
                            </View>
                          ),
                        )}

                        <View style={styles.tasteFacts}>
                          {taste.director && (
                            <Pressable
                              style={styles.tasteFact}
                              disabled={!taste.director.collectionId}
                              onPress={() =>
                                navigation.navigate("CollectionDetails", {
                                  collectionId: taste.director.collectionId,
                                })
                              }
                            >
                              <View style={styles.tasteFactText}>
                                <Text style={styles.tasteFactLabel}>
                                  {t("Most-watched director")}
                                </Text>
                                <Text
                                  style={styles.tasteFactValue}
                                  numberOfLines={1}
                                >
                                  {taste.director.name} · {taste.director.count}
                                </Text>
                              </View>
                            </Pressable>
                          )}
                          {taste.decade && (
                            <Pressable
                              style={styles.tasteFact}
                              disabled={!taste.decade.collectionId}
                              onPress={() =>
                                navigation.navigate("CollectionDetails", {
                                  collectionId: taste.decade.collectionId,
                                })
                              }
                            >
                              <View style={styles.tasteFactText}>
                                <Text style={styles.tasteFactLabel}>
                                  {t("Favorite decade")}
                                </Text>
                                <Text style={styles.tasteFactValue}>
                                  {t("The")} {taste.decade.label}
                                </Text>
                              </View>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    </>
                  )}
                </>
              )}

              {/* Tier list — your real S → F rows */}
              {profileTab === "tiers" && (
                <View style={styles.tierList}>
                  {tierRows.map(({ key, meaning, color, movies }) => (
                    <View key={key} style={styles.tierListRow}>
                      <View
                        style={[
                          styles.tierListLetter,
                          { backgroundColor: color },
                        ]}
                      >
                        <Text style={styles.tierListLetterText}>{key}</Text>
                      </View>
                      {movies.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.tierListPosters}
                        >
                          {movies.map((movie) => (
                            <Pressable
                              key={movie.id}
                              onPress={() =>
                                navigation.navigate("MovieDetails", {
                                  movieId: movie.id,
                                })
                              }
                            >
                              <MoviePoster
                                uri={movie.poster}
                                style={styles.tierListPoster}
                              />
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : (
                        <View style={styles.tierListEmpty}>
                          <Text style={styles.tierListEmptyText}>
                            {meaning}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                  {untieredCount > 0 && (
                    <Pressable
                      style={styles.untieredLink}
                      onPress={() =>
                        navigation.navigate("Library", { showUntiered: true })
                      }
                    >
                      <Text style={styles.untieredLinkText}>
                        {untieredCount === 1
                          ? t("1 watched movie isn't tiered yet")
                          : t(
                              "{untieredCount} watched movies aren't tiered yet",
                              { untieredCount: untieredCount },
                            )}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              {/* Completed — the director / actor / franchise sets you've fully
              watched. Tap to open, long-press to pin to the front. */}
              {profileTab === "completed" && completedSets.length > 0 && (
                <Text style={styles.completedIntro}>
                  {t(
                    "Actors, directors and franchises you've seen every movie of.",
                  )}
                </Text>
              )}
              {profileTab === "completed" &&
                (completedSets.length > 0 ? (
                  COMPLETED_GROUPS.map(({ type, title, unit }) => {
                    const sets = completedSets.filter(
                      (collection) => collection.type === type,
                    );
                    if (sets.length === 0) return null;
                    return (
                      <View key={type}>
                        <View style={styles.completedHeader}>
                          <Text style={styles.completedHeaderTitle}>
                            {title}
                          </Text>
                          <Text style={styles.completedHeaderCount}>
                            {sets.length}
                          </Text>
                        </View>
                        <View style={styles.completedGrid}>
                          {sets.map((collection) => {
                            const isPinned = pinnedCollections.includes(
                              collection.id,
                            );
                            return (
                              <Pressable
                                key={collection.id}
                                style={{ width: completedWidth }}
                                onPress={() =>
                                  navigation.navigate("CollectionDetails", {
                                    collectionId: collection.id,
                                  })
                                }
                                onLongPress={() => togglePin(collection)}
                                delayLongPress={350}
                              >
                                <View
                                  style={[
                                    styles.showcaseCover,
                                    {
                                      width: completedWidth,
                                      height: completedWidth,
                                    },
                                  ]}
                                >
                                  {[0, 1, 2, 3].map((index) => {
                                    const movie =
                                      collection.movies[
                                        index % collection.movies.length
                                      ];
                                    return (
                                      <MoviePoster
                                        key={index}
                                        uri={movie.poster}
                                        style={styles.showcaseCell}
                                      />
                                    );
                                  })}
                                  {isPinned && (
                                    <View style={styles.showcasePin}>
                                      <Pin
                                        size={10}
                                        color={colors.background}
                                      />
                                    </View>
                                  )}
                                </View>
                                <Text
                                  style={styles.showcaseTitle}
                                  numberOfLines={2}
                                >
                                  {collection.title}
                                </Text>
                                <Text style={styles.showcaseMeta}>
                                  {t("Seen all")} {collection.movies.length}{" "}
                                  {unit}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <EmptyState
                    art="noCollections"
                    title={t("No collections yet")}
                    subtitle={t(
                      "Watch every film from a director, actor or franchise and it shows up here.",
                    )}
                    actionLabel={t("Continue a collection")}
                    onAction={() => goToLibrary("collections")}
                  />
                ))}
            </Animated.View>
          </GestureDetector>
        </View>

        <View style={{ height: insets.bottom + TAB_BAR_CLEARANCE }} />
      </Animated.ScrollView>
      <ScreenBottomFade />
      <DockHeader
        {...header.props}
        title={t("Profile")}
        right={
          <>
            <HeaderIconButton onPress={() => setIsShareOpen(true)}>
              <Share2 size={22} color={colors.textPrimary} strokeWidth={1.75} />
            </HeaderIconButton>
            <HeaderIconButton onPress={() => navigation.navigate("Friends")}>
              <Users size={22} color={colors.textPrimary} strokeWidth={1.75} />
            </HeaderIconButton>
            <HeaderIconButton onPress={() => navigation.navigate("Activity")}>
              <Bell size={22} color={colors.textPrimary} strokeWidth={1.75} />
            </HeaderIconButton>
            <HeaderIconButton onPress={() => navigation.navigate("Settings")}>
              <SettingsIcon
                size={22}
                color={colors.textPrimary}
                strokeWidth={1.75}
              />
            </HeaderIconButton>
          </>
        }
      />

      <TopTenPicker
        visible={isTopTenOpen}
        onClose={() => setIsTopTenOpen(false)}
        watched={watched}
      />

      <TasteShareSheet
        visible={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        cardProps={watcherCardProps}
        taste={{
          ...taste,
          favorites: topTenMovies.map((movie) => ({ movie })),
        }}
        fallbackMessage={getShareText()}
      />

      <BottomSheet
        visible={isLeagueSheetOpen}
        onClose={() => setIsLeagueSheetOpen(false)}
        title={t("Your watcher profile")}
        subtitle={t("Level {level} · {name}", {
          level: level.level,
          name: level.name,
        })}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.leagueSummary}>
            <Text style={styles.leagueSummaryLevel}>{level.level}</Text>
            <Text style={styles.leagueSummaryLabel}>{level.name}</Text>
            <View style={styles.sheetBar}>
              <View
                style={[
                  styles.sheetBarFill,
                  { width: `${level.progress * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.leagueSummaryNext}>
              {xp.toLocaleString()} {t("XP ·")} {xpToNextLevel.toLocaleString()}{" "}
              {t("to Level")} {level.level + 1}
            </Text>
          </View>

          <Text style={[styles.badgeSectionTitle, styles.sheetSectionGap]}>
            {t("How XP is earned")}
          </Text>
          <View style={styles.leagueFormulaCard}>
            {[
              [`Watching a movie`, `+${WATCH_XP}`],
              [`Your first movie in a genre`, `+${NEW_GENRE_XP}`],
              [`Your first movie from a decade`, `+${NEW_DECADE_XP}`],
              [`Seeing 3 films by a director`, `+${DIRECTOR_DEPTH_XP}`],
              [`Finishing a collection`, `+${COLLECTION_XP}`],
              [`Giving a movie a tier`, `+${RATE_XP}`],
            ].map(([label, value]) => (
              <View key={label} style={styles.formulaRow}>
                <Text style={styles.leagueFormulaRow}>{label}</Text>
                <Text style={styles.formulaValue}>{value}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.formulaNote}>
            {t(
              "XP only grows from what you watch — it never decays, and there are no streaks or deadlines.",
            )}
          </Text>

          <View style={{ height: insets.bottom + spacing.md }} />
        </ScrollView>
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
    profileWrap: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      marginBottom: spacing.md,
    },
    leagueSummaryLevel: {
      ...typography.display,
      fontSize: 44,
      lineHeight: 48,
      color: colors.textPrimary,
    },
    // A thin line, like the other progress lines.
    sheetBar: {
      alignSelf: "stretch",
      height: 3,
      marginTop: spacing.md,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
    },
    sheetBarFill: {
      height: "100%",
      backgroundColor: colors.textPrimary,
    },
    sheetSectionGap: {
      marginTop: spacing.lg,
    },
    formulaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    formulaValue: {
      ...typography.bodyBold,
      color: colors.rating,
    },
    formulaNote: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    // Bleeds to the screen edges like the other rows.
    showcaseCover: {
      width: 96,
      height: 96,
      flexDirection: "row",
      flexWrap: "wrap",
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: `${colors.rating}AA`,
    },
    showcaseCell: {
      width: "50%",
      height: "50%",
    },
    showcasePin: {
      position: "absolute",
      start: 4,
      top: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    showcaseTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    showcaseMeta: {
      ...typography.caption,
      fontSize: 11,
      color: colors.rating,
    },
    backdrop: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      flexDirection: "row",
      overflow: "hidden",
    },
    backdropPoster: {
      flex: 1,
      height: "100%",
      opacity: 0.55,
    },
    // Instagram-style: three equal columns edge to edge, a hairline under
    // the bar, and a thin white underline across the open tab's column.
    tabTrack: {
      flexDirection: "row",
      marginTop: spacing.md,
      marginHorizontal: -spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    tabOption: {
      flex: 1,
      alignItems: "center",
      gap: 4,
      paddingTop: spacing.sm + 2,
      paddingBottom: spacing.sm,
    },
    tabLabel: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textMuted,
    },
    tabLabelActive: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textPrimary,
    },
    // One underline for the bar, slid under the open tab (and along with
    // a swipe).
    tabUnderline: {
      position: "absolute",
      start: 0,
      bottom: -StyleSheet.hairlineWidth,
      height: 1.5,
      backgroundColor: colors.textPrimary,
    },
    // Edge to edge (cancels the page padding) — a real tier-list maker:
    // the tier letter sits right at the screen edge, rows split by a thin
    // line of page colour.
    tierList: {
      marginHorizontal: -spacing.md,
      gap: 2,
    },
    tierListRow: {
      flexDirection: "row",
      minHeight: TIER_POSTER_WIDTH * 1.5,
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    tierListLetter: {
      width: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    tierListLetterText: {
      ...typography.hero,
      fontSize: 24,
      lineHeight: 28,
      color: colors.background,
    },
    tierListPosters: {
      gap: 2,
      padding: 4,
    },
    tierListPoster: {
      width: TIER_POSTER_WIDTH,
      height: TIER_POSTER_WIDTH * 1.5 - 8,
    },
    tierListEmpty: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    tierListEmptyText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    untieredLink: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      paddingVertical: spacing.sm,
    },
    untieredLinkText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    completedIntro: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    completedHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.sm,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    completedHeaderTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    completedHeaderCount: {
      ...typography.caption,
      color: colors.textMuted,
    },
    completedGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 2,
      rowGap: spacing.md,
    },
    sectionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    favoriteRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 2,
      marginHorizontal: -spacing.md,
      justifyContent: "center",
    },
    favoriteSlot: {
      overflow: "hidden",
    },
    favoritePoster: {
      width: "100%",
      height: "100%",
    },
    favoriteRank: {
      position: "absolute",
      top: 4,
      start: 4,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    favoriteRankText: {
      ...typography.bodyBold,
      fontSize: 10,
      lineHeight: 13,
      color: "#FFFFFF",
    },
    // Under the grid: what it is, and the way to change it.
    topTenBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.sm + 2,
    },
    topTenLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    topTenEdit: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    // Empty slot: a plain card tile with its rank, so the ten still read
    // as a ranked row before they're filled.
    favoriteEmpty: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    favoriteEmptyRank: {
      ...typography.display,
      fontSize: 24,
      lineHeight: 28,
      color: colors.cardElevatedLight,
    },
    tasteCard: {
      marginHorizontal: -spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
    },
    tasteInsight: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    tasteInsightLink: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    tasteInsightStrong: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    genreRow: {
      marginTop: spacing.sm + 2,
    },
    genreRowHead: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.sm,
      marginBottom: 6,
    },
    genreName: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    genreCount: {
      ...typography.caption,
      color: colors.textMuted,
    },
    genreSpacer: {
      flex: 1,
    },
    genreTypical: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    genreTypicalTier: {
      ...typography.bodyBold,
      fontSize: 14,
    },
    genreUntiered: {
      ...typography.caption,
      color: colors.textMuted,
    },
    tierStrip: {
      flexDirection: "row",
      height: 8,
      gap: 2,
      overflow: "hidden",
    },
    tasteFacts: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    tasteFact: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm,
      backgroundColor: colors.surfaceSoft,
    },
    tasteFactText: {
      flex: 1,
    },
    tasteFactLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
    },
    tasteFactValue: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    badgeSectionTitle: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    leagueSummary: {
      alignItems: "center",
      marginBottom: spacing.xl,
    },
    leagueSummaryLabel: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    leagueSummaryNext: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    leagueFormulaCard: {
      backgroundColor: colors.card,
      padding: spacing.md,
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    leagueFormulaRow: {
      ...typography.body,
      color: colors.textSecondary,
    },
  });

export default ProfileScreen;

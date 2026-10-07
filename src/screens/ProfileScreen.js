import * as Clipboard from "expo-clipboard";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Pin,
  Settings as SettingsIcon,
  Share2,
  Star,
  Trophy,
  Users,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import { getShowcaseBadges } from "../components/BadgeMedal";
import { BottomSheet } from "../components/BottomSheet";
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

const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-placholder.png");

// Favorite ten: a 5 × 2 poster grid.
const FAVORITE_COLUMNS = 5;
// Completed tab: a 3-column grid of collection covers.
const COMPLETED_COLUMNS = 3;
// Tier list rows: poster size beside each tier letter.
const TIER_POSTER_WIDTH = 54;
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
  { key: "overview", label: "Overview" },
  { key: "tiers", label: "Tier list" },
  { key: "completed", label: "Full sets" },
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
  const favoriteWidth =
    (windowWidth - spacing.md * 2 - spacing.sm * (FAVORITE_COLUMNS - 1)) /
    FAVORITE_COLUMNS;
  const completedWidth =
    (windowWidth - spacing.md * 2 - spacing.sm * (COMPLETED_COLUMNS - 1)) /
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
  const showcase = getShowcaseBadges(badges);

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

  // Backdrop: your favorites (or, before any tiers, what you watched last).
  const backdropPosters = (
    taste.favorites.length > 0
      ? taste.favorites.map(({ movie }) => movie)
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
      showToast(`You can pin up to ${MAX_PINNED} — unpin one first`);
      return;
    }
    togglePinnedCollection(collection.id);
    showToast(isPinned ? "Unpinned" : `${collection.title} pinned`, {
      tone: "success",
    });
  };

  const getShareText = () => {
    const genres = taste.topGenres.map(({ genre }) => genre).join(" · ");
    const favorites = taste.favorites
      .slice(0, 5)
      .map(({ movie }) => movie.title)
      .join(", ");
    const lines = [
      `My Reelboard taste card 🎬`,
      genres && `Into: ${genres}`,
      favorites && `Favorites: ${favorites}`,
      completedSets.length > 0 &&
        `Full sets: ${completedSets
          .slice(0, 3)
          .map((collection) => collection.title)
          .join(" · ")}`,
      `${watchedCount} movies · ${Math.round(taste.minutesWatched / 60)} hours`,
      `Level ${level.level} · ${level.name}`,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const watcherCardProps = {
    displayName,
    handle: getHandle(displayName),
    bio,
    avatarSource: avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE,
    level,
    showcase,
    allBadges: badges,
    earnedBadgeCount,
    stats: {
      movies: watchedCount,
      hours: Math.round(taste.minutesWatched / 60),
      completed: completedSets.length,
    },
  };

  const handleCopyHandle = async () => {
    await Clipboard.setStringAsync(getHandle(displayName));
    showToast("Handle copied", { tone: "success" });
  };

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
          {/* Watcher card — level, best badge per track, headline
              numbers. */}
          <WatcherCard
            {...watcherCardProps}
            xpToNextLevel={xpToNextLevel}
            onPressAvatar={() => setIsLeagueSheetOpen(true)}
            onCopyHandle={handleCopyHandle}
            onPressBio={() => navigation.navigate("Settings")}
            onPressBadges={() => navigation.navigate("Badges")}
            onPressBadge={() => navigation.navigate("Badges")}
          />

          {/* Profile tabs */}
          <View style={styles.tabTrack}>
            {PROFILE_TABS.map(({ key, label }) => {
              const isActive = profileTab === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.tabOption, isActive && styles.tabOptionActive]}
                  onPress={() => setProfileTab(key)}
                >
                  <Text
                    style={[styles.tabText, isActive && styles.tabTextActive]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {profileTab === "overview" && (
            <>
              {/* Favorite ten — best tiers first */}
              <Text style={[styles.sectionLabel, styles.firstSection]}>
                Favorite ten
              </Text>
              <View style={styles.favoriteRow}>
                {Array.from({ length: FAVORITE_COUNT }, (_, index) => {
                  const favorite = taste.favorites[index];
                  return favorite ? (
                    <Pressable
                      key={favorite.movie.id}
                      style={[styles.favoriteSlot, { width: favoriteWidth }]}
                      onPress={() =>
                        navigation.navigate("MovieDetails", {
                          movieId: favorite.movie.id,
                        })
                      }
                    >
                      <MoviePoster
                        uri={favorite.movie.poster}
                        style={styles.favoritePoster}
                      />
                    </Pressable>
                  ) : (
                    <Pressable
                      key={`empty-${index}`}
                      style={[
                        styles.favoriteSlot,
                        styles.favoriteEmpty,
                        { width: favoriteWidth },
                      ]}
                      onPress={() => goToLibrary("watched")}
                    >
                      <Star size={14} color={colors.textMuted} />
                    </Pressable>
                  );
                })}
              </View>

              {/* Taste */}
              {taste.topGenres.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Taste</Text>
                  <View style={styles.tasteCard}>
                    {/* Watch most vs love most */}
                    <Text style={styles.tasteInsight}>
                      {!taste.tasteInsight ? (
                        <>
                          Tier a few movies to see which genres you really love.{" "}
                          <Text
                            style={styles.tasteInsightLink}
                            onPress={() =>
                              navigation.navigate("Library", {
                                showUntiered: true,
                              })
                            }
                          >
                            See untiered ›
                          </Text>
                        </>
                      ) : taste.tasteInsight.mostWatched ===
                        taste.tasteInsight.mostLoved ? (
                        <>
                          <Text style={styles.tasteInsightStrong}>
                            {taste.tasteInsight.mostWatched}
                          </Text>{" "}
                          is what you watch most — and what you tier highest.
                        </>
                      ) : (
                        <>
                          You watch{" "}
                          <Text style={styles.tasteInsightStrong}>
                            {taste.tasteInsight.mostWatched}
                          </Text>{" "}
                          most, but{" "}
                          <Text style={styles.tasteInsightStrong}>
                            {taste.tasteInsight.mostLoved}
                          </Text>{" "}
                          gets your best tiers.
                        </>
                      )}
                    </Text>

                    {/* Each top genre: how much you watch it, how you tier it */}
                    {taste.genreTiers.map(
                      ({ genre, count, tierCounts, tiered, typicalTier }) => (
                        <View key={genre} style={styles.genreRow}>
                          <View style={styles.genreRowHead}>
                            <Text style={styles.genreName} numberOfLines={1}>
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
                                    { color: getTierInfo(typicalTier).color },
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
                                  not tiered yet ›
                                </Text>
                              </Pressable>
                            )}
                          </View>
                          <View style={styles.tierStrip}>
                            {TIERS.filter(({ key }) => tierCounts[key] > 0).map(
                              ({ key, color }) => (
                                <View
                                  key={key}
                                  style={{
                                    flex: tierCounts[key],
                                    backgroundColor: color,
                                  }}
                                />
                              ),
                            )}
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
                          <Clapperboard size={15} color={colors.accentLight} />
                          <View style={styles.tasteFactText}>
                            <Text style={styles.tasteFactLabel}>
                              Most-watched director
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
                          <CalendarDays size={15} color={colors.accentLight} />
                          <View style={styles.tasteFactText}>
                            <Text style={styles.tasteFactLabel}>
                              Favorite decade
                            </Text>
                            <Text style={styles.tasteFactValue}>
                              The {taste.decade.label}
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
                    style={[styles.tierListLetter, { backgroundColor: color }]}
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
                      <Text style={styles.tierListEmptyText}>{meaning}</Text>
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
                      ? "1 watched movie isn't tiered yet"
                      : `${untieredCount} watched movies aren't tiered yet`}
                  </Text>
                  <ChevronRight size={14} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          )}

          {/* Completed — the director / actor / franchise sets you've fully
              watched. Tap to open, long-press to pin to the front. */}
          {profileTab === "completed" && completedSets.length > 0 && (
            <Text style={styles.completedIntro}>
              Actors, directors and franchises you&apos;ve seen every movie of.
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
                      <Text style={styles.completedHeaderTitle}>{title}</Text>
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
                              <View style={styles.showcaseTrophy}>
                                <Trophy size={11} color={colors.background} />
                              </View>
                              {isPinned && (
                                <View style={styles.showcasePin}>
                                  <Pin size={10} color={colors.textPrimary} />
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
                              Seen all {collection.movies.length} {unit}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            ) : (
              <Pressable
                style={styles.completedEmpty}
                onPress={() => goToLibrary("collections")}
              >
                <Trophy size={22} color={colors.textMuted} />
                <Text style={styles.completedEmptyText}>
                  Watch every film from a director, actor or franchise and it
                  shows up here.
                </Text>
                <Text style={styles.completedEmptyLink}>
                  Continue a collection ›
                </Text>
              </Pressable>
            ))}
        </View>

        <View style={{ height: insets.bottom + TAB_BAR_CLEARANCE }} />
      </Animated.ScrollView>
      <ScreenBottomFade />
      <DockHeader
        {...header.props}
        title="Profile"
        right={
          <>
            <HeaderIconButton onPress={() => setIsShareOpen(true)}>
              <Share2 size={18} color={colors.textPrimary} strokeWidth={2} />
            </HeaderIconButton>
            <HeaderIconButton onPress={() => navigation.navigate("Friends")}>
              <Users size={18} color={colors.textPrimary} strokeWidth={2} />
            </HeaderIconButton>
            <HeaderIconButton onPress={() => navigation.navigate("Activity")}>
              <Bell size={18} color={colors.textPrimary} strokeWidth={2} />
            </HeaderIconButton>
            <HeaderIconButton onPress={() => navigation.navigate("Settings")}>
              <SettingsIcon
                size={18}
                color={colors.textPrimary}
                strokeWidth={2}
              />
            </HeaderIconButton>
          </>
        }
      />

      <TasteShareSheet
        visible={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        cardProps={watcherCardProps}
        taste={taste}
        fallbackMessage={getShareText()}
      />

      <BottomSheet
        visible={isLeagueSheetOpen}
        onClose={() => setIsLeagueSheetOpen(false)}
        title="Your watcher profile"
        subtitle={`Level ${level.level} · ${level.name}`}
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
              {xp.toLocaleString()} XP · {xpToNextLevel.toLocaleString()} to
              Level {level.level + 1}
            </Text>
          </View>

          <Text style={[styles.badgeSectionTitle, styles.sheetSectionGap]}>
            How XP is earned
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
            XP only grows from what you watch — it never decays, and there are
            no streaks or deadlines.
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
      marginBottom: spacing.md,
    },
    leagueSummaryLevel: {
      ...typography.display,
      fontSize: 44,
      lineHeight: 48,
      color: colors.textPrimary,
    },
    sheetBar: {
      alignSelf: "stretch",
      height: 6,
      marginTop: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
    },
    sheetBarFill: {
      height: "100%",
      borderRadius: radius.pill,
      backgroundColor: colors.accentLight,
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
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: `${colors.rating}AA`,
    },
    showcaseCell: {
      width: "50%",
      height: "50%",
    },
    showcaseTrophy: {
      position: "absolute",
      right: 4,
      bottom: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.rating,
    },
    showcasePin: {
      position: "absolute",
      left: 4,
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
      left: 0,
      right: 0,
      flexDirection: "row",
      overflow: "hidden",
    },
    backdropPoster: {
      flex: 1,
      height: "100%",
      opacity: 0.55,
    },
    tabTrack: {
      flexDirection: "row",
      marginTop: spacing.lg,
      padding: 4,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    tabOption: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 9,
      borderRadius: radius.sm - 3,
    },
    tabOptionActive: {
      backgroundColor: colors.selected,
    },
    tabText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.selectedText,
    },
    firstSection: {
      marginTop: spacing.md,
    },
    // Edge to edge (cancels the page padding) — a real tier-list maker:
    // the tier letter sits right at the screen edge, rows split by a thin
    // line of page colour.
    tierList: {
      marginTop: spacing.md,
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
      gap: 4,
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
      gap: spacing.sm,
      rowGap: spacing.md,
    },
    completedEmpty: {
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
    },
    completedEmptyText: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
    },
    completedEmptyLink: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.accentLight,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    favoriteRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    favoriteSlot: {
      aspectRatio: 2 / 3,
    },
    favoritePoster: {
      width: "100%",
      height: "100%",
    },
    favoriteEmpty: {
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.border,
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
      color: colors.accentLight,
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
      borderRadius: radius.pill,
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
      borderRadius: radius.sm,
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
      ...typography.label,
      color: colors.textSecondary,
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
      borderRadius: radius.sm,
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

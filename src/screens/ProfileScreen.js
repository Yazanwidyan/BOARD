import {
  Bell,
  LayoutGrid,
  ListOrdered,
  Settings as SettingsIcon,
  Share2,
  Sparkles,
  Users,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Pressable,
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

import { ProfileBoards } from "../components/ProfileBoards";
import { ProfileTopTen } from "../components/ProfileTopTen";
import { TierListRows } from "../components/TierListRows";
import { TopTenPicker } from "../components/TopTenPicker";
import {
  DockHeader,
  HEADER_BAR_HEIGHT,
  HeaderIconButton,
  useDockHeader,
} from "../components/ScreenHeader";
import { MoviePoster } from "../components/MoviePoster";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { TasteDnaCard } from "../components/TasteDnaCard";
import { TasteShareSheet } from "../components/TasteShareSheet";
import { WatcherCard } from "../components/WatcherCard";
import { WatcherProfileSheet } from "../components/WatcherProfileSheet";
import { useBoardStore } from "../store/boardStore";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { showToast } from "../store/toastStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { getBadges } from "../utils/badges";
import { getShowcaseBadges } from "../components/BadgeMedal";
import { getCompletedCollectionsCount } from "../utils/collections";
import { getTasteProfile } from "../utils/taste";
import { getTasteDna } from "../utils/tasteDna";
import {
  useStickyStyle,
  useStretchyBackdropStyle,
} from "../utils/scrollEffects";
import { isRated } from "../utils/tiers";
import {
  getCompletedChallengesCount,
  getLevel,
  getCompletedXPCollections,
  getXPBreakdown,
} from "../utils/xp";
import { isRTL, t } from "../i18n";
import { FirstVisitTip } from "../components/FirstVisitTip";

const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-default.png");

// The blurred poster strip behind the identity.
const BACKDROP_POSTERS = 5;
const BACKDROP_HEIGHT = 190;

// Who you are as a watcher, in three pages: your tier list (the heart of
// ReelBoard, so it opens first), the boards you've made, and your Taste
// DNA. Your top ten and finished collections sit above them, always.
const PROFILE_TABS = [
  { key: "tiers", label: "Tier list", Icon: ListOrdered },
  { key: "boards", label: "Boards", Icon: LayoutGrid },
  { key: "taste", label: "Taste", Icon: Sparkles },
];

const getHandle = (name) =>
  `@${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") || "you"
  }`;

export const ProfileScreen = ({ navigation, route }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [isLeagueSheetOpen, setIsLeagueSheetOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [profileTab, setProfileTab] = useState("tiers");
  const boards = useBoardStore((state) => state.boards);

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
  const header = useDockHeader({ hideOnScroll: true });
  // The tab row pins under the header once it reaches it (and follows the
  // header as it slides away), so you can always switch tabs. Its place
  // in the scroll content is the wrapper's offset plus its own.
  const [profileWrapY, setProfileWrapY] = useState(null);
  const [tabTrackY, setTabTrackY] = useState(null);
  const tabTrackStyle = useStickyStyle({
    scrollY: header.scrollY,
    contentY:
      profileWrapY != null && tabTrackY != null
        ? profileWrapY + tabTrackY
        : null,
    stickTop: insets.top + HEADER_BAR_HEIGHT,
    headerOffset: header.offset,
  });
  const backdropStyle = useStretchyBackdropStyle(
    header.scrollY,
    header.contentInset + BACKDROP_HEIGHT,
  );

  const taste = getTasteProfile(watched);
  const tasteDna = getTasteDna(watched);

  // The Watcher card: same data on Profile and in the shared image.

  const watchedByRecent = [...watched].sort(
    (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0),
  );

  // Backdrop: your top ten (or, before you've picked any, what you watched
  // last).
  const backdropPosters = (
    topTenMovies.length > 0
      ? topTenMovies
      : watchedByRecent
          .map((entry) => getMovieById(entry.movieId))
          .filter(Boolean)
  ).slice(0, BACKDROP_POSTERS);

  // Fully finished director / actor / franchise sets — counted in the
  // stats (tap it for Library → Collections) and named in the share text.
  const completedSets = getCompletedXPCollections(watchedIds);

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

  const openMovie = (movieId) => navigation.navigate("MovieDetails", { movieId });

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
          <Animated.View
            pointerEvents="none"
            style={[
              styles.backdrop,
              { height: header.contentInset + BACKDROP_HEIGHT },
              backdropStyle,
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
          </Animated.View>
        )}

        <View
          style={styles.profileWrap}
          onLayout={(event) => setProfileWrapY(event.nativeEvent.layout.y)}
        >
          {/* Watcher card — avatar beside the numbers (badges included),
              name and level, bio as a quote. */}
          <WatcherCard
            {...watcherCardProps}
            xpToNextLevel={xpToNextLevel}
            onPressAvatar={() => setIsLeagueSheetOpen(true)}
            onPressBio={() => navigation.navigate("Settings")}
            onPressBadges={() => navigation.navigate("Badges")}
            // `openedAt` makes a repeat tap switch Library back even when
            // it was left on another tab.
            onPressCollections={() =>
              navigation.navigate("Library", {
                initialTab: "collections",
                openedAt: Date.now(),
              })
            }
          />

          {/* Your month (or year) on ReelBoard — the shareable recap. */}
          <Pressable
            style={({ pressed }) => [styles.recapRow, pressed && { opacity: 0.8 }]}
            onPress={() => navigation.navigate("Recap")}
            accessibilityRole="button"
          >
            <Text style={styles.recapTitle}>{t("Your recap")}</Text>
            <Text style={styles.recapHint} numberOfLines={1}>
              {t("Your month on ReelBoard, ready to share")} ›
            </Text>
          </Pressable>

          {/* Your top ten — the signature, always here. */}
          <View style={styles.topTen}>
            <ProfileTopTen
              movies={topTenMovies}
              editable
              onOpen={openMovie}
              onRemove={(movie) => {
                toggleTopTen(movie.id);
                showToast(t("{title} taken out of your top ten", { title: movie.title }));
              }}
              onPick={() => setIsTopTenOpen(true)}
            />
          </View>

          {/* Profile tabs, Instagram-style: an icon per column over a
              hairline, the open one white with a thin underline. Swipe the
              page below to switch too. */}
          <Animated.View
            style={[styles.tabTrack, tabTrackStyle]}
            onLayout={(event) => setTabTrackY(event.nativeEvent.layout.y)}
          >
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
          </Animated.View>

          <GestureDetector gesture={pageSwipe}>
            <Animated.View style={pageStyle}>
              {profileTab === "tiers" && (
                <TierListRows
                  entries={watched}
                  onOpen={openMovie}
                  onSeeUntiered={() => navigation.navigate("Library", { showUntiered: true })}
                />
              )}

              {profileTab === "boards" && (
                <View style={styles.tabPage}>
                  <ProfileBoards
                    boards={boards}
                    onOpen={(board) => navigation.navigate("BoardDetails", { boardId: board.id })}
                    onCreate={() => navigation.navigate("Library", { initialTab: "boards" })}
                  />
                </View>
              )}

              {profileTab === "taste" &&
                (watched.length > 0 ? (
                  <View style={styles.tabPage}>
                    <TasteDnaCard
                      dna={tasteDna}
                      director={taste.director}
                      decade={taste.decade}
                      topGenres={taste.topGenres}
                      onOpenMovie={openMovie}
                      onOpenCollection={(collectionId) =>
                        navigation.navigate("CollectionDetails", { collectionId })
                      }
                      onSeeUntiered={() =>
                        navigation.navigate("Library", { showUntiered: true })
                      }
                    />
                  </View>
                ) : (
                  <Text style={styles.tabEmpty}>
                    {t("Watch and tier a few movies — your Taste DNA shows up here.")}
                  </Text>
                ))}
            </Animated.View>
          </GestureDetector>
        </View>

        <View style={{ height: insets.bottom + TAB_BAR_CLEARANCE }} />
      </Animated.ScrollView>
      <ScreenBottomFade />
      <FirstVisitTip id="profile" />
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
        dna={tasteDna}
        fallbackMessage={getShareText()}
      />

      <WatcherProfileSheet
        visible={isLeagueSheetOpen}
        onClose={() => setIsLeagueSheetOpen(false)}
        watched={watched}
        avatarSource={
          avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE
        }
        displayName={displayName}
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
    profileWrap: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      marginBottom: spacing.md,
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
    topTen: {
      marginTop: spacing.md,
    },
    tabPage: {
      marginTop: spacing.md,
    },
    tabEmpty: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      paddingVertical: spacing.xl,
    },
    recapRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    recapTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    recapHint: {
      ...typography.caption,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    // Solid and above the page below it, since it pins over the content
    // as you scroll.
    tabTrack: {
      flexDirection: "row",
      marginTop: spacing.md,
      marginHorizontal: -spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
      zIndex: 10,
      elevation: 4,
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
  });

export default ProfileScreen;

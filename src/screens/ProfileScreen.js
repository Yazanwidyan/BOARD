import {
  Bell,
  Settings as SettingsIcon,
  Share2,
  Users,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import {
  BoardsRail,
  ProfileSectionHeader,
  RecapCard,
  SagaRanksRail,
  TasteSnapshot,
  TierSummary,
} from "../components/ProfileSections";
import { ProfileTopTen } from "../components/ProfileTopTen";
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
import { WatcherProfileSheet } from "../components/WatcherProfileSheet";
import { useAuthStore } from "../store/authStore";
import { useBoardStore } from "../store/boardStore";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { showToast } from "../store/toastStore";
import { TAB_BAR_CLEARANCE, spacing } from "../theme/spacing";
import { useColors } from "../theme/useColors";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { getBadges } from "../utils/badges";
import { getShowcaseBadges } from "../components/BadgeMedal";
import { getCompletedCollectionsCount } from "../utils/collections";
import { getTasteProfile } from "../utils/taste";
import { getTasteDna } from "../utils/tasteDna";
import { useStretchyBackdropStyle } from "../utils/scrollEffects";
import { isRated } from "../utils/tiers";
import {
  getCompletedChallengesCount,
  getLevel,
  getCompletedXPCollections,
  getXPBreakdown,
} from "../utils/xp";
import { t } from "../i18n";
import { FirstVisitTip } from "../components/FirstVisitTip";

const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-default.png");

// The blurred poster strip behind the identity.
const BACKDROP_POSTERS = 5;
const BACKDROP_HEIGHT = 190;

// Who you are as a watcher, top to bottom, one short section each: your
// top ten, your Taste DNA, the sagas you're climbing, your tiers, what you
// watched last and your boards (each a preview that opens the whole
// thing), and this month's recap at the end.

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
  const [isLeagueSheetOpen, setIsLeagueSheetOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
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
  const accountHandle = useAuthStore((state) => state.user?.handle);
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
        t("Sagas: {list}", {
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
    // Your real handle; made up from the name only until the account loads.
    handle: accountHandle ?? getHandle(displayName),
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

  const openMovie = (movieId) => navigation.navigate("MovieDetails", { movieId });
  // `openedAt` makes a repeat tap switch Library back even when it was left
  // on another tab.
  const openLibraryTab = (initialTab) =>
    navigation.navigate("Library", { initialTab, openedAt: Date.now() });
  const openSagas = () => openLibraryTab("collections");
  const openBoards = () => openLibraryTab("boards");
  const openUntiered = () => navigation.navigate("Library", { showUntiered: true });
  const openTaste = () => navigation.navigate("Taste");
  const openTierList = () => navigation.navigate("TierList");

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

        <View style={styles.profileWrap}>
          {/* Watcher card: avatar beside the numbers (badges included),
              name and level, bio as a quote. */}
          <WatcherCard
            {...watcherCardProps}
            xpToNextLevel={xpToNextLevel}
            onPressAvatar={() => setIsLeagueSheetOpen(true)}
            onPressBio={() => navigation.navigate("EditProfile")}
            onPressBadges={() => navigation.navigate("Badges")}
            onPressCollections={openSagas}
          />

          {/* Your top ten: the signature, always first. */}
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

          <ProfileSectionHeader
            title={t("Taste DNA")}
            onAction={tasteDna.hasDna ? openTaste : undefined}
          />
          <TasteSnapshot dna={tasteDna} onOpen={tasteDna.hasDna ? openTaste : openUntiered} />

          <ProfileSectionHeader title={t("Saga ranks")} onAction={openSagas} />
          <SagaRanksRail
            watchedIds={watchedIds}
            onOpen={(collectionId) => navigation.navigate("CollectionDetails", { collectionId })}
            onBrowse={openSagas}
          />

          <ProfileSectionHeader
            title={t("Your tiers")}
            actionLabel={t("Full list")}
            onAction={ratedCount > 0 ? openTierList : undefined}
          />
          <TierSummary entries={watched} onPress={openTierList} onSeeUntiered={openUntiered} />

          <ProfileSectionHeader
            title={t("Boards")}
            onAction={boards.length > 0 ? openBoards : undefined}
          />
          <BoardsRail
            boards={boards}
            onOpen={(board) => navigation.navigate("BoardDetails", { boardId: board.id })}
            onCreate={openBoards}
          />

          {/* This month: the shareable recap. */}
          <RecapCard watched={watched} onOpen={() => navigation.navigate("Recap")} />
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
    topTen: {
      marginTop: spacing.md,
    },
  });

export default ProfileScreen;

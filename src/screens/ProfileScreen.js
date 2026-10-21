import {
  Bell,
  Settings as SettingsIcon,
  Share2,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import {
  BoardsRail,
  FriendsRail,
  FinishedSagasRail,
  ProfileSection,
  RecapBanner,
  SectionEmpty,
  TasteSnapshot,
  TierSummary,
} from "../components/ProfileSections";
import {
  DockHeader,
  HeaderIconButton,
  useDockHeader,
} from "../components/ScreenHeader";
import { MoviePoster } from "../components/MoviePoster";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { TasteShareSheet } from "../components/TasteShareSheet";
import { WatcherCard } from "../components/WatcherCard";
import { useAuthStore } from "../store/authStore";
import { useBoardStore } from "../store/boardStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { TAB_BAR_CLEARANCE, spacing } from "../theme/spacing";
import { useColors } from "../theme/useColors";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { getCollectionProgress, getSagas } from "../utils/collections";
import { getTasteProfile } from "../utils/taste";
import { getTasteDna } from "../utils/tasteDna";
import { useStretchyBackdropStyle } from "../utils/scrollEffects";
import { isRated, orderSTier } from "../utils/tiers";
import { useRankSummary } from "../utils/useRanks";
import { t } from "../i18n";
import { useFriends, useNotificationCount } from "../store/friendsStore";
import { FirstVisitTip } from "../components/FirstVisitTip";

const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-default.png");

// The blurred poster strip behind the identity.
const BACKDROP_POSTERS = 5;
const BACKDROP_HEIGHT = 190;

// Who you are as a watcher, top to bottom, one short section each: the
// card, your tiers (S is your favourites, in your order), your Taste DNA,
// the collections you've finished and your boards (each a preview that
// opens the whole thing), and this month's recap at the end. Of your
// ranks, only the avatar's ring is here (to your next title, with the
// count and title in its pill) — tap it for the Ranks screen.

const getHandle = (name) =>
  `@${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") || "you"
  }`;

export const ProfileScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const notificationCount = useNotificationCount();
  const { friends, incoming } = useFriends();
  const openFriends = () => navigation.navigate("Friends");
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const ranks = useRankSummary();
  const boards = useBoardStore((state) => state.boards);

  const watched = useMovieStore((state) => state.watched);
  const displayName = useProfileStore((state) => state.displayName);
  const bio = useProfileStore((state) => state.bio);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  const accountHandle = useAuthStore((state) => state.user?.handle);

  const watchedCount = watched.length;
  const ratedCount = watched.filter(isRated).length;
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  // Your favourites: your S tier, in your order (set on the tier list).
  const sOrder = useProfileStore((state) => state.topTen) ?? [];
  const favoriteMovies = orderSTier(watched, sOrder)
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean);
  const header = useDockHeader();
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

  // Backdrop: your favourites (or, before you've tiered any S, what you
  // watched last).
  const backdropPosters = (
    favoriteMovies.length > 0
      ? favoriteMovies
      : watchedByRecent
          .map((entry) => getMovieById(entry.movieId))
          .filter(Boolean)
  ).slice(0, BACKDROP_POSTERS);

  // Fully watched sagas — counted in the stats (tap it for Library →
  // Sagas) and named in the share text.
  const completedSets = getSagas().filter(
    (collection) => getCollectionProgress(collection, watchedIds).progress === 1,
  );

  const getShareText = () => {
    const genres = taste.topGenres.map(({ genre }) => genre).join(" · ");
    const favorites = favoriteMovies
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
    ].filter(Boolean);
    return lines.join("\n");
  };

  const watcherCardProps = {
    displayName,
    // Your real handle; made up from the name only until the account loads.
    handle: accountHandle ?? getHandle(displayName),
    bio,
    avatarSource: avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE,
    // The ring's pill already says how many ranks, so the stats don't.
    ring: ranks.title,
    stats: {
      movies: watchedCount,
      hours: Math.round(taste.minutesWatched / 60),
      friends: friends.length,
      completed: completedSets.length,
    },
  };

  // `openedAt` makes a repeat tap switch Library back even when it was left
  // on another tab.
  const openLibraryTab = (initialTab) =>
    navigation.navigate("Library", { initialTab, openedAt: Date.now() });
  const openSagas = () => openLibraryTab("collections");
  const openBoards = () => openLibraryTab("boards");
  const openUntiered = () => navigation.navigate("Library", { showUntiered: true });
  const openTaste = () => navigation.navigate("Taste");
  const openTierList = () => navigation.navigate("TierList");
  const openSaga = (collectionId) => navigation.navigate("CollectionDetails", { collectionId });
  const openRecap = () => navigation.navigate("Recap");

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: header.contentInset }}
      >
        {/* Backdrop — your favorites, blurred, fading into the page,
            under the header. */}
        {backdropPosters.length > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.backdrop,
              { top: header.contentInset, height: BACKDROP_HEIGHT },
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
          {/* Watcher card: avatar in its ring (your ranks and title) beside
              the numbers, bio as a quote. */}
          <WatcherCard
            {...watcherCardProps}
            onPressAvatar={() => navigation.navigate("Ranks")}
            onPressBio={() => navigation.navigate("EditProfile")}
            onPressRanks={() => navigation.navigate("Ranks")}
            onPressFriends={() => navigation.navigate("Friends")}
            onPressCollections={openSagas}
          />

          {/* Your friends, right on your profile: tap one for theirs. */}
          <ProfileSection
            title={t("Friends")}
            actionLabel={
              incoming.length > 0 ? t("{count} requests", { count: incoming.length }) : undefined
            }
            onAction={friends.length > 0 || incoming.length > 0 ? openFriends : undefined}
            rail={friends.length > 0}
          >
            {friends.length > 0 ? (
              <FriendsRail
                friends={friends}
                myWatched={watched}
                onOpen={(friend) => navigation.navigate("FriendProfile", { friendId: friend.id })}
                onAdd={openFriends}
              />
            ) : (
              <SectionEmpty
                line={t("Add friends to compare taste and see what they're watching.")}
                actionLabel={t("Add friends")}
                onPress={openFriends}
              />
            )}
          </ProfileSection>

          {/* How you rate. Your S tier is your favourites — in your order,
              set on the tier list. */}
          <ProfileSection
            title={t("Your tiers")}
            onAction={ratedCount > 0 ? openTierList : undefined}
            onPress={ratedCount > 0 ? openTierList : undefined}
          >
            <TierSummary entries={watched} onSeeUntiered={openUntiered} />
          </ProfileSection>

          <ProfileSection
            title={t("Taste DNA")}
            onAction={tasteDna.hasDna ? openTaste : undefined}
            onPress={tasteDna.hasDna ? openTaste : undefined}
          >
            <TasteSnapshot dna={tasteDna} onSeeUntiered={openUntiered} />
          </ProfileSection>

          <ProfileSection
            title={t("Collections")}
            onAction={openSagas}
            rail={completedSets.length > 0}
          >
            {completedSets.length > 0 ? (
              <FinishedSagasRail watched={watched} onOpen={openSaga} />
            ) : (
              <SectionEmpty
                line={t("Finish every film in a collection and it shows here.")}
                actionLabel={t("Browse collections")}
                onPress={openSagas}
              />
            )}
          </ProfileSection>

          <ProfileSection
            title={t("Boards")}
            onAction={boards.length > 0 ? openBoards : undefined}
            rail={boards.length > 0}
          >
            {boards.length > 0 ? (
              <BoardsRail
                boards={boards}
                onOpen={(board) => navigation.navigate("BoardDetails", { boardId: board.id })}
                onCreate={openBoards}
              />
            ) : (
              <SectionEmpty
                line={t("Group films your way — rainy day, date night, comfort picks.")}
                actionLabel={t("New board")}
                onPress={openBoards}
              />
            )}
          </ProfileSection>

          {/* This month: the shareable recap, as on Home. */}
          <RecapBanner watched={watched} onOpen={openRecap} />
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
            <HeaderIconButton
              onPress={() => navigation.navigate("Activity")}
              badge={notificationCount}
            >
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

      <TasteShareSheet
        visible={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        cardProps={watcherCardProps}
        taste={{
          ...taste,
          favorites: favoriteMovies.slice(0, 10).map((movie) => ({ movie })),
        }}
        dna={tasteDna}
        fallbackMessage={getShareText()}
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
  });

export default ProfileScreen;

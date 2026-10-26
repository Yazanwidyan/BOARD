import * as Haptics from "expo-haptics";
import {
  ChevronRight,
  Settings as SettingsIcon,
  Share2,
} from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import { Text } from "../components/AppText";
import { AvatarRankRing } from "../components/AvatarRankRing";
import { MoviePoster } from "../components/MoviePoster";
import { PosterMosaic } from "../components/PosterMosaic";
import { ProfileActivity } from "../components/ProfileActivity";
import {
  BoardsRail,
  FinishedSagasRail,
  ProfileSection,
  RecapBanner,
  RecentPosters,
  SectionEmpty,
  TasteSnapshot,
  TierSummary,
} from "../components/ProfileSections";
import {
  DockHeader,
  HeaderIconButton,
  ScrollHairline,
  useDockHeader,
} from "../components/ScreenHeader";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { TasteShareSheet } from "../components/TasteShareSheet";
import { UnderlineTabs } from "../components/UnderlineTabs";
import { useAuthStore } from "../store/authStore";
import { useBoardStore } from "../store/boardStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { TAB_BAR_CLEARANCE, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { getCollectionProgress, getSagas } from "../utils/collections";
import { getTasteProfile } from "../utils/taste";
import { getTasteDna } from "../utils/tasteDna";
import { orderSTier } from "../utils/tiers";
import { useRankSummary } from "../utils/useRanks";
import { t, useIsRTL } from "../i18n";
import { useFriends } from "../store/friendsStore";
import { FirstVisitTip } from "../components/FirstVisitTip";

// The cover's height for the screen's width, and how much of it shows
// above your avatar.
const COVER_RATIO = 0.5;
const COVER_ABOVE_AVATAR = 0.55;
const FAVOURITES = 4;
const FAVOURITE_GAP = 8;
const AVATAR = 84;

const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-default.png");

// The Profile tab's own tabs, under your favourites.
const SECTIONS = [
  { key: "activity", label: "Activity" },
  { key: "films", label: "Films" },
  { key: "diary", label: "Diary" },
  { key: "lists", label: "Lists" },
  { key: "collections", label: "Collections" },
];

const getHandle = (name) =>
  `@${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") || "you"
  }`;

// Your profile, Letterboxd-style. Your name in the header (Settings left,
// Share right) and Profile / Stats under it.
//   Profile: your cover (if you chose one) behind your avatar (its ring to
//   your next title), your friends and films, your bio, your top four
//   favourites, then Activity / Films / Diary / Lists /
//   Collections.
//   Stats: your numbers, your title and how far to the next, your tiers,
//   your Taste DNA and this month's recap.
export const ProfileScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const { width: screenWidth } = useWindowDimensions();
  const { friends } = useFriends();
  const ranks = useRankSummary();
  const boards = useBoardStore((state) => state.boards);
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const displayName = useProfileStore((state) => state.displayName);
  const bio = useProfileStore((state) => state.bio);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  const accountHandle = useAuthStore((state) => state.user?.handle);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [topTab, setTopTab] = useState("profile");
  const [section, setSection] = useState("activity");

  // Your cover: a watched film's still across the top, behind your avatar
  // (chosen in Edit profile, with your photo).
  const coverMovieId = useProfileStore((state) => state.coverMovieId);
  const coverImage = coverMovieId ? getMovieById(coverMovieId)?.backdrop ?? null : null;
  const coverHeight = Math.round(screenWidth * COVER_RATIO);

  const watchedCount = watched.length;
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  // Your favourites: your S tier, in your order (set on the tier list).
  const sOrder = useProfileStore((state) => state.topTen) ?? [];
  const favoriteMovies = orderSTier(watched, sOrder)
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean);
  const header = useDockHeader();

  const taste = getTasteProfile(watched);
  const tasteDna = getTasteDna(watched);
  const hours = Math.round(taste.minutesWatched / 60);
  const avatarSource = avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE;

  // Fully watched sagas — counted in the stats and named in the share text.
  const completedSets = getSagas().filter(
    (collection) => getCollectionProgress(collection, watchedIds).progress === 1,
  );
  const favouriteWidth = Math.floor(
    (screenWidth - spacing.md * 2 - FAVOURITE_GAP * (FAVOURITES - 1)) / FAVOURITES,
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
      t("{count} movies · {hours} hours", { count: watchedCount, hours }),
    ].filter(Boolean);
    return lines.join("\n");
  };

  // The shared taste image's card (components/WatcherCard).
  const watcherCardProps = {
    displayName,
    // Your real handle; made up from the name only until the account loads.
    handle: accountHandle ?? getHandle(displayName),
    bio,
    avatarSource,
    ring: ranks.title,
    stats: {
      movies: watchedCount,
      hours,
      friends: friends.length,
      completed: completedSets.length,
    },
  };

  // `openedAt` makes a repeat tap switch Library back even when it was left
  // on another tab.
  const openLibraryTab = (initialTab) =>
    navigation.navigate("Library", { initialTab, openedAt: Date.now() });
  const openMovie = (movieId) => navigation.navigate("MovieDetails", { movieId });

  const watchedByRecent = [...watched]
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .map((entry) => ({ movie: getMovieById(entry.movieId), watchCount: entry.watchCount }))
    .filter((item) => item.movie);

  const sectionBody = {
    activity: (
      <ProfileActivity
        watched={watched}
        bucketList={bucketList}
        avatarSource={avatarSource}
        onOpen={openMovie}
      />
    ),
    films:
      watchedByRecent.length > 0 ? (
        <PosterMosaic items={watchedByRecent} onPressMovie={(movie) => openMovie(movie.id)} />
      ) : (
        <View style={styles.padded}>
          <SectionEmpty line={t("Mark a movie as watched and it shows here.")} />
        </View>
      ),
    diary: (
      <View style={styles.padded}>
        <RecentPosters entries={watched} count={40} onOpen={openMovie} />
      </View>
    ),
    lists: (
      <View style={styles.padded}>
        {boards.length > 0 ? (
          <View style={styles.bleed}>
            <BoardsRail
              boards={boards}
              onOpen={(board) => navigation.navigate("BoardDetails", { boardId: board.id })}
              onCreate={() => openLibraryTab("boards")}
            />
          </View>
        ) : (
          <SectionEmpty
            line={t("Group films your way — rainy day, date night, comfort picks.")}
            actionLabel={t("New list")}
            onPress={() => openLibraryTab("boards")}
          />
        )}
      </View>
    ),
    collections: (
      <View style={styles.padded}>
        {completedSets.length > 0 ? (
          <View style={styles.bleed}>
            <FinishedSagasRail
              watched={watched}
              onOpen={(collectionId) => navigation.navigate("CollectionDetails", { collectionId })}
            />
          </View>
        ) : (
          <SectionEmpty
            line={t("Finish every film in a collection and it shows here.")}
            actionLabel={t("Browse collections")}
            onPress={() => openLibraryTab("collections")}
          />
        )}
      </View>
    ),
  };

  const profileTab = (
    <>
      {/* Your cover, fading into the page behind your avatar. */}
      {coverImage && (
        <View pointerEvents="none" style={[styles.cover, { height: coverHeight }]}>
          <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient
            colors={[`${colors.background}00`, `${colors.background}66`, colors.background]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* You: your avatar, your friends and films, your bio. */}
      <View
        style={[
          styles.identity,
          coverImage && { paddingTop: Math.round(coverHeight * COVER_ABOVE_AVATAR) },
        ]}
      >
        <Pressable
          onPress={() => navigation.navigate("Ranks")}
          accessibilityRole="button"
          accessibilityLabel={t("Your ranks")}
        >
          {ranks.title ? (
            <AvatarRankRing source={avatarSource} title={ranks.title} avatarSize={AVATAR} />
          ) : (
            <Image source={avatarSource} style={styles.avatar} />
          )}
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Friends")} hitSlop={6}>
          <Text style={styles.counts}>
            {t("{count} friends", { count: friends.length })} ·{" "}
            {t("{count} films", { count: watchedCount })}
          </Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("EditProfile")} hitSlop={6}>
          <Text style={[styles.bio, !bio && styles.bioEmpty]} numberOfLines={3}>
            {bio ? bio : t("Add your take — a short bio")}
          </Text>
        </Pressable>
      </View>

      <View style={styles.padded}>
        {/* Your top four: your S tier, in your order. */}
        <ProfileSection
          title={t("Favourites")}
          onAction={favoriteMovies.length > 0 ? () => navigation.navigate("TierList") : undefined}
        >
          {favoriteMovies.length > 0 ? (
            <View style={styles.favourites}>
              {favoriteMovies.slice(0, FAVOURITES).map((movie) => (
                <Pressable
                  key={movie.id}
                  onPress={() => openMovie(movie.id)}
                  style={({ pressed }) => pressed && styles.pressed}
                  accessibilityRole="button"
                  accessibilityLabel={movie.title}
                >
                  <MoviePoster uri={movie.poster} style={{ width: favouriteWidth, aspectRatio: 2 / 3 }} />
                </Pressable>
              ))}
            </View>
          ) : (
            <SectionEmpty line={t("Tier films S and your top four show here.")} />
          )}
        </ProfileSection>
      </View>

      {/* Activity / Films / Diary / Lists / Collections, underlined. */}
      <UnderlineTabs
        tabs={SECTIONS.map((item) => ({ key: item.key, label: t(item.label) }))}
        value={section}
        onChange={setSection}
        style={styles.sections}
      />
      <View style={styles.sectionBody}>{sectionBody[section]}</View>
    </>
  );

  const stats = [
    { value: watchedCount, label: watchedCount === 1 ? "film" : "films" },
    { value: `${hours}h`, label: "watched" },
    { value: completedSets.length, label: "collections", onPress: () => openLibraryTab("collections") },
    { value: friends.length, label: friends.length === 1 ? "friend" : "friends", onPress: () => navigation.navigate("Friends") },
  ];
  const statsTab = (
    <View style={styles.padded}>
      {/* Your numbers, evenly across. */}
      <View style={styles.statsRow}>
        {stats.map(({ value, label, onPress }) => (
          <Pressable key={label} style={styles.stat} onPress={onPress} disabled={!onPress} hitSlop={6}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{t(label)}</Text>
          </Pressable>
        ))}
      </View>

      {/* Your title, and how far to the next. */}
      {ranks.title && (
        <Pressable
          style={({ pressed }) => [styles.rankRow, pressed && styles.pressed]}
          onPress={() => navigation.navigate("Ranks")}
          accessibilityRole="button"
        >
          <View style={styles.rankText}>
            <Text style={styles.rankName}>{t(ranks.title.name)}</Text>
            <Text style={styles.rankNext}>
              {ranks.title.next
                ? t("{count} ranks to {title}", {
                    count: ranks.title.toNext,
                    title: t(ranks.title.next.name),
                  })
                : t("The top title")}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} style={rtl && styles.flipped} />
        </Pressable>
      )}

      <ProfileSection
        title={t("Tiers")}
        onAction={() => navigation.navigate("TierList")}
        onPress={() => navigation.navigate("TierList")}
      >
        <TierSummary
          entries={watched}
          onSeeUntiered={() => navigation.navigate("Library", { showUntiered: true })}
        />
      </ProfileSection>

      <ProfileSection
        title={t("Taste DNA")}
        onAction={tasteDna.hasDna ? () => navigation.navigate("Taste") : undefined}
        onPress={tasteDna.hasDna ? () => navigation.navigate("Taste") : undefined}
      >
        <TasteSnapshot
          dna={tasteDna}
          onSeeUntiered={() => navigation.navigate("Library", { showUntiered: true })}
        />
      </ProfileSection>

      <RecapBanner watched={watched} onOpen={() => navigation.navigate("Recap")} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Profile / Stats: pinned under the header. */}
      <View style={[styles.tabsBar, { paddingTop: header.barBottom }]}>
        <View style={styles.tabs} accessibilityRole="tablist">
          {[
            { key: "profile", label: t("Profile") },
            { key: "stats", label: t("Stats") },
          ].map((tab) => {
            const selected = tab.key === topTab;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, selected && styles.tabOn]}
                onPress={() => {
                  if (selected) return;
                  Haptics.selectionAsync();
                  setTopTab(tab.key);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.tabText, selected && styles.tabTextOn]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <ScrollHairline scrollY={header.scrollY} />
      </View>

      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        {topTab === "profile" ? profileTab : statsTab}
      </Animated.ScrollView>
      <ScreenBottomFade />
      <FirstVisitTip id="profile" />
      {/* Your name in the middle; Settings left, Share right. */}
      <DockHeader
        {...header.props}
        hairline={false}
        title={displayName}
        left={
          <HeaderIconButton onPress={() => navigation.navigate("Settings")} accessibilityLabel={t("Settings")}>
            <SettingsIcon size={22} color={colors.textPrimary} strokeWidth={1.75} />
          </HeaderIconButton>
        }
        right={
          <HeaderIconButton onPress={() => setIsShareOpen(true)} accessibilityLabel={t("Share")}>
            <Share2 size={22} color={colors.textPrimary} strokeWidth={1.75} />
          </HeaderIconButton>
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
    pressed: {
      opacity: 0.7,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    padded: {
      paddingHorizontal: spacing.md,
    },
    bleed: {
      marginHorizontal: -spacing.md,
    },
    // Profile / Stats, under the header, like Home's tabs.
    tabsBar: {
      zIndex: 1,
      paddingBottom: spacing.sm,
      backgroundColor: colors.headerBackground,
    },
    tabs: {
      flexDirection: "row",
      gap: 2,
      padding: 2,
      marginHorizontal: spacing.md,
      backgroundColor: colors.segmentTrack,
      borderRadius: 6,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
      borderRadius: 7,
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
    cover: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      overflow: "hidden",
    },
    // You, centred.
    identity: {
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    avatar: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      backgroundColor: colors.card,
    },
    counts: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    bio: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
    bioEmpty: {
      color: colors.textMuted,
    },
    // Your top four, across.
    favourites: {
      flexDirection: "row",
      gap: FAVOURITE_GAP,
    },
    sections: {
      marginTop: spacing.lg,
    },
    sectionBody: {
      paddingTop: spacing.md,
    },
    // Stats
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: spacing.sm,
    },
    stat: {
      alignItems: "center",
      gap: 2,
    },
    statValue: {
      ...typography.hero,
      fontSize: 22,
      lineHeight: 28,
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    rankRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      padding: spacing.md,
      marginHorizontal: -spacing.md,
      backgroundColor: colors.card,
    },
    rankText: {
      flex: 1,
      gap: 2,
    },
    rankName: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    rankNext: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });

export default ProfileScreen;

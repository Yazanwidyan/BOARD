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
import { ProBadge } from "../components/ProBadge";
import { TasteStats } from "../components/TasteStats";
import { MoviePoster } from "../components/MoviePoster";
import { ProfileActivity } from "../components/ProfileActivity";
import {
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
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { TasteShareSheet } from "../components/TasteShareSheet";
import { useAuthStore } from "../store/authStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { accentColor, useIsPro } from "../utils/pro";
import { TAB_BAR_CLEARANCE, shape, spacing } from "../theme/spacing";
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

const getHandle = (name) =>
  `@${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") || "you"
  }`;

// Your profile, Letterboxd-style. "Profile" in the header (Settings and
// Share on the right) and Profile / Stats under it.
//   Profile — who you are, not a second Library: your cover (if you chose
//   one) behind your avatar (its ring to your next title), your name, your
//   friends and films, your bio, your top four favourites, your library in
//   three numbers (each opens its Library tab), your trophies (collections
//   you've finished) and your recent activity. (A friend's page keeps
//   their films and lists, since it's the only way to see them.)
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
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const displayName = useProfileStore((state) => state.displayName);
  const bio = useProfileStore((state) => state.bio);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  // Pro: a badge by your name, your accent on your ring (utils/pro).
  const isPro = useIsPro();
  const accent = useProfileStore((state) => state.accent);
  const accountHandle = useAuthStore((state) => state.user?.handle);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [topTab, setTopTab] = useState("profile");

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

  // Your three numbers, under your name — the only place they show.
  const rankCount = ranks.title?.count ?? 0;
  const counts = [
    {
      key: "films",
      value: watchedCount,
      label: watchedCount === 1 ? t("film") : t("films"),
      onPress: () => openLibraryTab("watched"),
    },
    {
      key: "friends",
      value: friends.length,
      label: friends.length === 1 ? t("friend") : t("friends"),
      onPress: () => navigation.navigate("Friends"),
    },
    {
      key: "ranks",
      value: rankCount,
      label: rankCount === 1 ? t("rank") : t("ranks"),
      onPress: () => navigation.navigate("Ranks"),
    },
  ];

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
            <AvatarRankRing
              source={avatarSource}
              title={ranks.title}
              avatarSize={AVATAR}
              color={(isPro && accentColor(accent)) || undefined}
            />
          ) : (
            <Image source={avatarSource} style={styles.avatar} />
          )}
        </Pressable>
        {/* Your name, under your avatar. */}
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={2} accessibilityRole="header">
            {displayName}
          </Text>
          {isPro && <ProBadge accent={accent} />}
        </View>
        {/* Your numbers — here and nowhere else — each opening its place. */}
        <View style={styles.counts}>
          {counts.map(({ key, value, label, onPress }) => (
            <Pressable
              key={key}
              style={({ pressed }) => [styles.count, pressed && styles.pressed]}
              onPress={onPress}
              hitSlop={6}
              accessibilityRole="button"
            >
              <Text style={styles.countValue}>{value}</Text>
              <Text style={styles.countLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>
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

        {/* Trophies: the collections you've finished. */}
        {completedSets.length > 0 && (
          <ProfileSection title={t("Trophies")} rail>
            <FinishedSagasRail
              watched={watched}
              onOpen={(collectionId) => navigation.navigate("CollectionDetails", { collectionId })}
            />
          </ProfileSection>
        )}

        {/* What you've been up to. */}
        <ProfileSection title={t("Recent activity")}>
          <View>
            <ProfileActivity
              watched={watched}
              bucketList={bucketList}
              avatarSource={avatarSource}
              onOpen={openMovie}
            />
          </View>
        </ProfileSection>
      </View>
    </>
  );

  // Taste: what your watching says about you — no counts (they're under
  // your name).
  const statsTab = (
    <View style={styles.padded}>
      {hours > 0 && (
        <Text style={styles.hours}>{t("{hours} hours of film, all time", { hours })}</Text>
      )}

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

      {/* Pro: how you tier each genre, decade and director. */}
      <ProfileSection title={t("Taste stats")}>
        <TasteStats watched={watched} isPro={isPro} onSeePro={() => navigation.navigate("Pro")} />
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
            { key: "profile", label: t("Overview") },
            { key: "stats", label: t("Taste") },
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
      {/* "Profile" in the header; Settings and Share on the right. */}
      <DockHeader
        {...header.props}
        title={t("Profile")}
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
      padding: 3,
      marginHorizontal: spacing.md,
      backgroundColor: colors.segmentTrack,
      borderRadius: shape.chip,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6,
      borderRadius: shape.chip,
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
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    name: {
      ...typography.hero,
      fontSize: 24,
      lineHeight: 30,
      color: colors.textPrimary,
      textAlign: "center",
      flexShrink: 1,
    },
    // Films · friends · ranks, evenly across under your name.
    counts: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.xl,
      marginTop: spacing.xs,
    },
    count: {
      alignItems: "center",
      minWidth: 56,
    },
    countValue: {
      ...typography.bodyBold,
      fontSize: 18,
      lineHeight: 24,
      color: colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    countLabel: {
      ...typography.caption,
      color: colors.textSecondary,
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
    // Taste
    hours: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      paddingVertical: spacing.sm,
    },
    rankRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
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

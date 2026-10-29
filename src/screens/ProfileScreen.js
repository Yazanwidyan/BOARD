import {
  ChevronRight,
  Pencil,
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
import { ReplayCard } from "../components/HomeBento";
import { MilestoneMedal } from "../components/MilestoneMedal";
import {
  ProfileSection,
  SectionEmpty,
  TasteSnapshot,
} from "../components/ProfileSections";
import {
  DockHeader,
  HeaderIconButton,
  useDockHeader,
} from "../components/ScreenHeader";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { TasteShareSheet } from "../components/TasteShareSheet";
import { TrophyCabinet, getTrophies } from "../components/TrophyCabinet";
import { useAuthStore } from "../store/authStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { accentColor, useIsPro } from "../utils/pro";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useStretchyBackdropStyle } from "../utils/scrollEffects";
import { useColors } from "../theme/useColors";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { getCollectionProgress, getSagas } from "../utils/collections";
import { getTasteProfile } from "../utils/taste";
import { getTasteDna } from "../utils/tasteDna";
import { orderSTier } from "../utils/tiers";
import { useRankSummary } from "../utils/useRanks";
import { getMilestones } from "../utils/milestones";
import { useLanguageStore } from "../store/languageStore";
import { t, useIsRTL } from "../i18n";
import { useFriends } from "../store/friendsStore";
import { useTabBarClearance } from "../components/TonightBar";

// The cover's height for the screen's width, and how much of it shows
// above your avatar.
const COVER_RATIO = 0.5;
const COVER_ABOVE_AVATAR = 0.55;
const FAVOURITES = 4;
// Trophies shown on the profile, in one row; the rest are in Library.
const PROFILE_TROPHIES = 4;
const FAVOURITE_GAP = 8;
// Milestone medals shown under Achievements.
const MEDALS = 3;
const AVATAR = 84;

const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-default.png");

const getHandle = (name) =>
  `@${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") || "you"
  }`;

// Your profile — you, as a friend sees you; your films themselves (your
// watchlist, diary, tiers, lists, collections) are Library's. "Profile" in
// the header (Settings in its capsule). Then who you are — your avatar (its
// ring to your next title), your name, your films, friends and ranks, your
// bio, Edit profile and Share — and below it, under bold headings: your top
// four favourites, your taste (its DNA and stats), your achievements (your
// title, your latest milestones, the collections you've finished) and your
// Replay. (A friend's page keeps their films and lists, since it's the only
// way to see them.)
export const ProfileScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarClearance();
  const rtl = useIsRTL();
  const { width: screenWidth } = useWindowDimensions();
  const { friends } = useFriends();
  const ranks = useRankSummary();
  const watched = useMovieStore((state) => state.watched);
  const displayName = useProfileStore((state) => state.displayName);
  const bio = useProfileStore((state) => state.bio);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  // Pro: a badge by your name, your accent on your ring (utils/pro).
  const isPro = useIsPro();
  const accent = useProfileStore((state) => state.accent);
  const accountHandle = useAuthStore((state) => state.user?.handle);
  const [isShareOpen, setIsShareOpen] = useState(false);

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
  const language = useLanguageStore((state) => state.language);
  // Your latest milestones — the reached ones first.
  const milestones = getMilestones(watched).slice(0, MEDALS);
  const medalSize = Math.floor((screenWidth - spacing.md * 2 - spacing.rail * (MEDALS - 1)) / MEDALS);
  const coverStyle = useStretchyBackdropStyle(header.scrollY, coverHeight);

  const taste = getTasteProfile(watched);
  const tasteDna = getTasteDna(watched);
  const hours = Math.round(taste.minutesWatched / 60);
  const avatarSource = avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE;

  // Fully watched sagas — counted in the stats and named in the share text.
  const trophies = getTrophies(watched);
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

  const page = (
    <>
      {/* Your cover, fading into the page behind your avatar — it stretches
          when you pull down and drifts behind the page as you scroll, like
          a movie's backdrop. */}
      {coverImage && (
        <Animated.View pointerEvents="none" style={[styles.cover, { height: coverHeight }, coverStyle]}>
          <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient
            colors={[`${colors.background}00`, `${colors.background}66`, colors.background]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {/* You: your avatar, your friends and films, your bio. */}
      <View
        style={[
          styles.identity,
          { paddingTop: coverImage ? Math.max(Math.round(coverHeight * COVER_ABOVE_AVATAR), header.barBottom) : header.barBottom + spacing.underHeader },
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
        {hours > 0 && (
          <Text style={styles.hours}>{t("{hours} hours of film, all time", { hours })}</Text>
        )}
        <Pressable onPress={() => navigation.navigate("EditProfile")} hitSlop={6}>
          <Text style={[styles.bio, !bio && styles.bioEmpty]} numberOfLines={3}>
            {bio ? bio : t("Add your take — a short bio")}
          </Text>
        </Pressable>
        {/* Edit and Share, as Apple Music's paired buttons. */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={() => navigation.navigate("EditProfile")}
            accessibilityRole="button"
          >
            <Pencil size={17} color={colors.brand} strokeWidth={2.2} />
            <Text style={styles.actionText}>{t("Edit profile")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={() => setIsShareOpen(true)}
            accessibilityRole="button"
          >
            <Share2 size={17} color={colors.brand} strokeWidth={2.2} />
            <Text style={styles.actionText}>{t("Share")}</Text>
          </Pressable>
        </View>
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

        {/* Your taste: its DNA, then how you tier each genre, decade and
            director (Pro). */}
        <ProfileSection
          title={t("Your taste")}
          onAction={tasteDna.hasDna ? () => navigation.navigate("Taste") : undefined}
        >
          <TasteSnapshot
            dna={tasteDna}
            onSeeUntiered={() => navigation.navigate("Library", { showUntiered: true })}
          />
          <View style={styles.tasteStats}>
            <TasteStats watched={watched} isPro={isPro} onSeePro={() => navigation.navigate("Pro")} />
          </View>
        </ProfileSection>

        {/* Achievements: your title (and how far to the next), your latest
            milestones and the collections you've finished. */}
        <ProfileSection title={t("Achievements")}>
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
          <Pressable
            style={({ pressed }) => [styles.medals, pressed && styles.pressed]}
            onPress={() => navigation.navigate("Milestones")}
            accessibilityRole="button"
            accessibilityLabel={t("Milestones")}
          >
            {milestones.map((milestone) => (
              <View key={milestone.key} style={styles.medal}>
                <MilestoneMedal milestone={milestone} size={medalSize} />
                <Text style={styles.medalLabel} numberOfLines={1}>
                  {t(milestone.short)}
                </Text>
              </View>
            ))}
          </Pressable>
          {trophies.length > 0 && (
            <View style={styles.trophies}>
              <TrophyCabinet
                finished={trophies.slice(0, PROFILE_TROPHIES)}
                columns={PROFILE_TROPHIES}
                onOpen={(collectionId) => navigation.navigate("CollectionDetails", { collectionId })}
              />
            </View>
          )}
        </ProfileSection>

        {/* Replay: your month. */}
        <ReplayCard
          style={styles.replay}
          language={language}
          onPress={(period) => navigation.navigate("Recap", { period })}
        />
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + tabBarClearance }}
      >
        {page}
      </Animated.ScrollView>
      <ScreenBottomFade />
      {/* "Profile" in the header, Settings in its capsule. */}
      <DockHeader
        {...header.props}
        title={t("Profile")}
        avatar={false}
        right={
          <HeaderIconButton onPress={() => navigation.navigate("Settings")} accessibilityLabel={t("Settings")}>
            <SettingsIcon size={22} color={colors.textPrimary} strokeWidth={1.75} />
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
      fontFamily: fonts.extraBold,
      fontSize: 26,
      lineHeight: 32,
      letterSpacing: -0.4,
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
    // Edit profile and Share: two grey boxes side by side, their icons and
    // words in the signature colour.
    actions: {
      alignSelf: "stretch",
      flexDirection: "row",
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    action: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 46,
      backgroundColor: colors.buttonFill,
      borderRadius: shape.card,
    },
    actionText: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.brand,
    },
    // Your top four, across.
    favourites: {
      flexDirection: "row",
      gap: FAVOURITE_GAP,
    },
    // Taste
    hours: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
    },
    rankRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    tasteStats: {
      marginTop: spacing.lg,
    },
    // Your latest medals, three across, opening Milestones.
    medals: {
      flexDirection: "row",
      gap: spacing.rail,
      marginTop: spacing.lg,
    },
    medal: {
      alignItems: "center",
    },
    medalLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    trophies: {
      marginTop: spacing.lg,
    },
    replay: {
      marginTop: spacing.section,
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

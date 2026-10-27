import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Ellipsis, Flag, UserMinus } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { AvatarRankRing } from "../components/AvatarRankRing";
import { BottomSheet } from "../components/BottomSheet";
import { FriendAvatar } from "../components/FriendAvatar";
import { MoviePoster } from "../components/MoviePoster";
import { ProBadge } from "../components/ProBadge";
import { ReportSheet } from "../components/ReportSheet";
import {
  BoardsRail,
  FinishedSagasRail,
  ProfileSection,
  RecentPosters,
  SectionEmpty,
  TierSummary,
  getFinishedSagas,
} from "../components/ProfileSections";
import {
  DockHeader,
  HeaderIconButton,
  useDockHeader,
} from "../components/ScreenHeader";
import { ShelfRail } from "../components/ShelfRail";
import { TasteDnaBars } from "../components/TasteDnaBars";
import { UnderlineTabs } from "../components/UnderlineTabs";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { api } from "../services/api";
import { useFriends } from "../store/friendsStore";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { toggleBucketListWithFeedback } from "../utils/achievementFeedback";
import {
  getBothLoved,
  getTasteMatch,
  getTheyLovedYouHavent,
} from "../utils/friends";
import { accentColor } from "../utils/pro";
import { getTitle } from "../utils/ranks";
import { getTasteProfile } from "../utils/taste";
import { getTasteDna } from "../utils/tasteDna";
import { getTierInfo, orderSTier } from "../utils/tiers";
import { t, useIsRTL } from "../i18n";

// The same measures as your Profile (screens/ProfileScreen).
const COVER_RATIO = 0.5;
const COVER_ABOVE_AVATAR = 0.55;
const FAVOURITES = 4;
const FAVOURITE_GAP = 8;
const AVATAR = 84;
const POSTER_ITEM = 104;
// How long the ⋯ sheet takes to leave before the next one opens.
const SHEET_HANDOFF_MS = 260;

// Their things, under the rest — the only place you can see them.
const SECTIONS = [
  { key: "films", label: "Films" },
  { key: "lists", label: "Lists" },
  { key: "collections", label: "Collections" },
];
const RECS_SHOWN = 3;

const TierChip = ({ tier, styles }) => (
  <View style={[styles.tierChip, { backgroundColor: getTierInfo(tier).color }]}>
    <Text style={styles.tierChipText}>{tier}</Text>
  </View>
);

// A friend's page, like your Profile: their name in the header (back left,
// ⋯ right — to report or remove them) and Overview / Taste under it.
//   Overview: their cover behind their avatar (its ring to their next
//   title), their handle, their numbers — films, ranks, and how close your
//   taste is (each once, here) — their bio, their top four, you and them
//   (what you both loved, what they say you should watch), then their
//   Films (each dated, with their tier) / Lists / Collections.
//   Taste: their hours, their title, their tiers and their Taste DNA.
export const FriendProfileScreen = ({ navigation, route }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const { width: screenWidth } = useWindowDimensions();
  const header = useDockHeader();
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const friendId = route?.params?.friendId;
  const { friends, removeFriend } = useFriends();
  const friend = friends.find((item) => item.id === friendId);
  const [topTab, setTopTab] = useState("profile");
  const [section, setSection] = useState("films");
  // ⋯: report them (or one of their lists), or remove them.
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  // Their profile (with the definitions of the sagas they've finished,
  // remembered by services/api) and their boards.
  useQuery({
    queryKey: ["user", friendId],
    queryFn: () => api.get(`/users/${friendId}`),
    enabled: Boolean(friendId),
    staleTime: 60 * 1000,
  });
  const boards = useQuery({
    queryKey: ["user", friendId, "boards"],
    queryFn: () => api.get(`/users/${friendId}/boards`),
    enabled: Boolean(friendId),
    staleTime: 60 * 1000,
  });

  const back = (
    <HeaderIconButton onPress={() => navigation.goBack()} accessibilityLabel={t("Back")}>
      <ChevronLeft
        size={24}
        color={colors.textPrimary}
        strokeWidth={2}
        style={rtl && styles.flipped}
      />
    </HeaderIconButton>
  );

  if (!friend) {
    return (
      <View style={styles.container}>
        <DockHeader {...header.props} title={t("Friend")} back={back} />
      </View>
    );
  }

  const confirmRemove = () =>
    Alert.alert(
      t("Remove {name}?", { name: friend.name }),
      t("You'll stop seeing each other's activity."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Remove"),
          style: "destructive",
          onPress: async () => {
            try {
              await removeFriend(friend.id);
              navigation.goBack();
            } catch (err) {
              showToast(err.message);
            }
          },
        },
      ],
    );

  // Close the ⋯ sheet, then do it (one sheet at a time).
  const thenClose = (action) => () => {
    setIsMenuOpen(false);
    setTimeout(action, SHEET_HANDOFF_MS);
  };

  const firstName = friend.name.split(" ")[0];
  const theirWatched = friend.watched ?? [];
  const savedIds = new Set(bucketList.map((entry) => entry.movieId));
  const match = getTasteMatch(watched, theirWatched);
  const bothLoved = getBothLoved(watched, theirWatched);
  const recommendations = getTheyLovedYouHavent(watched, theirWatched);
  const theirBoards = boards.data?.boards ?? [];
  const finishedSagas = getFinishedSagas(theirWatched);
  const taste = getTasteProfile(theirWatched);
  const tasteDna = getTasteDna(theirWatched);
  const hours = Math.round(taste.minutesWatched / 60);
  const title = getTitle(friend.ranks ?? 0);
  const openMovie = (movieId) => navigation.navigate("MovieDetails", { movieId });
  const openTierList = () => navigation.push("TierList", { friendId: friend.id });

  // Their cover: a still from a film they've watched, behind their avatar.
  const coverImage = friend.coverMovieId
    ? getMovieById(friend.coverMovieId)?.backdrop ?? null
    : null;
  const coverHeight = Math.round(screenWidth * COVER_RATIO);

  // Their top four: their S tier, in their order.
  const favoriteMovies = orderSTier(theirWatched, friend.topTen ?? [])
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean);
  const favouriteWidth = Math.floor(
    (screenWidth - spacing.md * 2 - FAVOURITE_GAP * (FAVOURITES - 1)) / FAVOURITES,
  );
  // Their numbers, once: films, ranks, and your match (which opens Taste).
  const counts = [
    { key: "films", value: theirWatched.length, label: theirWatched.length === 1 ? t("film") : t("films") },
    { key: "ranks", value: friend.ranks ?? 0, label: (friend.ranks ?? 0) === 1 ? t("rank") : t("ranks") },
    match != null && {
      key: "match",
      value: `${match}%`,
      label: t("match"),
      onPress: () => setTopTab("stats"),
    },
  ].filter(Boolean);

  const sectionBody = {
    // Their films, newest first — each dated, with the tier they gave it.
    films: (
      <View style={styles.padded}>
        {theirWatched.length > 0 ? (
          <RecentPosters entries={theirWatched} count={60} onOpen={openMovie} />
        ) : (
          <SectionEmpty line={t("{name} hasn't watched anything yet.", { name: firstName })} />
        )}
      </View>
    ),
    lists: (
      <View style={styles.padded}>
        {theirBoards.length > 0 ? (
          <View style={styles.bleed}>
            <BoardsRail
              boards={theirBoards}
              onOpen={(board) =>
                navigation.push("BrowseMovies", { title: board.name, movieIds: board.movieIds })
              }
            />
          </View>
        ) : (
          <SectionEmpty
            line={
              boards.isLoading
                ? t("Loading…")
                : t("{name} hasn't made any lists yet.", { name: firstName })
            }
          />
        )}
      </View>
    ),
    collections: (
      <View style={styles.padded}>
        {finishedSagas.length > 0 ? (
          <View style={styles.bleed}>
            <FinishedSagasRail
              watched={theirWatched}
              onOpen={(collectionId) => navigation.push("CollectionDetails", { collectionId })}
            />
          </View>
        ) : (
          <SectionEmpty
            line={t("{name} hasn't finished a collection yet.", { name: firstName })}
          />
        )}
      </View>
    ),
  };

  const profileTab = (
    <>
      {/* Their cover, fading into the page behind their avatar. */}
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

      {/* Them: their avatar, their films and your match, their bio. */}
      <View
        style={[
          styles.identity,
          coverImage && { paddingTop: Math.round(coverHeight * COVER_ABOVE_AVATAR) },
        ]}
      >
        <AvatarRankRing title={title} avatarSize={AVATAR} color={(friend.pro && accentColor(friend.accent)) || undefined}>
          <FriendAvatar friend={friend} size={AVATAR} style={styles.ringAvatar} />
        </AvatarRankRing>
        {friend.pro && <ProBadge accent={friend.accent} style={styles.proBadge} />}
        <Text style={styles.handle}>{friend.handle}</Text>
        {/* Their numbers — here and nowhere else. */}
        <View style={styles.counts}>
          {counts.map(({ key, value, label, onPress }) => (
            <Pressable
              key={key}
              style={({ pressed }) => [styles.count, pressed && onPress && styles.pressed]}
              onPress={onPress}
              disabled={!onPress}
              hitSlop={6}
            >
              <Text style={[styles.countValue, key === "match" && styles.countMatch]}>{value}</Text>
              <Text style={styles.countLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {!!friend.bio && (
          <Text style={styles.bio} numberOfLines={3}>
            {friend.bio}
          </Text>
        )}
      </View>

      {/* Their top four: their S tier, in their order. */}
      <View style={styles.padded}>
        <ProfileSection
          title={t("Favourites")}
          onAction={favoriteMovies.length > 0 ? openTierList : undefined}
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
            <SectionEmpty line={t("{name} hasn't tiered anything yet.", { name: firstName })} />
          )}
        </ProfileSection>

        {/* You and them: what you both loved… */}
        {bothLoved.length > 0 && (
          <ProfileSection title={t("You both loved")} rail>
            <ShelfRail
              itemWidth={POSTER_ITEM}
              items={bothLoved.map((movie) => ({
                key: movie.id,
                onPress: () => openMovie(movie.id),
                content: <MoviePoster uri={movie.poster} style={styles.railPoster} />,
              }))}
            />
          </ProfileSection>
        )}

        {/* …and what they loved that you haven't seen. */}
        {recommendations.length > 0 && (
          <ProfileSection title={t("{value} says watch these", { value: firstName })}>
            <View style={styles.recList}>
              {recommendations.slice(0, RECS_SHOWN).map(({ movie, tier }) => {
                const saved = savedIds.has(movie.id);
                return (
                  <Pressable
                    key={movie.id}
                    style={({ pressed }) => [styles.recRow, pressed && styles.rowPressed]}
                    onPress={() => openMovie(movie.id)}
                    accessibilityRole="button"
                  >
                    <MoviePoster uri={movie.poster} style={styles.recPoster} />
                    <View style={styles.recText}>
                      <Text style={styles.recTitle} numberOfLines={1}>
                        {movie.title}
                        {!!movie.year && <Text style={styles.recYear}> {movie.year}</Text>}
                      </Text>
                      <View style={styles.recMetaRow}>
                        <Text style={styles.recMeta}>{t("They tiered it")}</Text>
                        <TierChip tier={tier} styles={styles} />
                      </View>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.saveButton,
                        saved && styles.saveButtonSaved,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => toggleBucketListWithFeedback(movie.id)}
                      hitSlop={6}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.saveText, saved && styles.saveTextSaved]}>
                        {saved ? t("Saved") : t("+ Watchlist")}
                      </Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          </ProfileSection>
        )}
      </View>

      <UnderlineTabs
        tabs={SECTIONS.map((item) => ({ key: item.key, label: t(item.label) }))}
        value={section}
        onChange={setSection}
        style={styles.sections}
      />
      <View style={styles.sectionBody}>{sectionBody[section]}</View>
    </>
  );

  // Taste: what their watching says — no counts (they're under their name).
  const statsTab = (
    <View style={styles.padded}>
      {hours > 0 && (
        <Text style={styles.hours}>{t("{hours} hours of film, all time", { hours })}</Text>
      )}

      {/* Their title, and how far to the next. */}
      <View style={styles.rankRow}>
        <Text style={styles.rankName}>{t(title.name)}</Text>
        <Text style={styles.rankNext}>
          {title.next
            ? t("{count} ranks to {title}", { count: title.toNext, title: t(title.next.name) })
            : t("The top title")}
        </Text>
      </View>

      <ProfileSection title={t("Tiers")} onAction={openTierList} onPress={openTierList}>
        <TierSummary entries={theirWatched} />
      </ProfileSection>

      <ProfileSection title={t("Taste DNA")}>
        {tasteDna.hasDna ? (
          <TasteDnaBars fingerprint={tasteDna.fingerprint} />
        ) : (
          <SectionEmpty line={t("{name} hasn't tiered anything yet.", { name: firstName })} />
        )}
      </ProfileSection>

    </View>
  );

  return (
    <View style={styles.container}>
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
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        {topTab === "profile" ? profileTab : statsTab}
      </Animated.ScrollView>
      {/* Their name in the middle; back left, ⋯ (report, remove) right. */}
      <DockHeader
        {...header.props}
        title={friend.name}
        back={back}
        right={
          <HeaderIconButton onPress={() => setIsMenuOpen(true)} accessibilityLabel={t("More")}>
            <Ellipsis size={22} color={colors.textPrimary} strokeWidth={1.9} />
          </HeaderIconButton>
        }
      />

      <BottomSheet visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} size="auto" flush>
        <View style={styles.menu}>
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={thenClose(() => setIsReportOpen(true))}
            accessibilityRole="button"
          >
            <Flag size={20} color={colors.textSecondary} strokeWidth={1.9} />
            <Text style={styles.menuText}>{t("Report")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={thenClose(confirmRemove)}
            accessibilityRole="button"
          >
            <UserMinus size={20} color={colors.danger} strokeWidth={1.9} />
            <Text style={[styles.menuText, styles.menuDanger]}>{t("Remove friend")}</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <ReportSheet
        visible={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targets={[
          { type: "user", id: friend.id, label: friend.name },
          ...theirBoards.map((board) => ({ type: "list", id: board.id, label: board.name })),
        ]}
      />
    </View>
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
    rowPressed: {
      backgroundColor: colors.cardElevated,
    },
    // The ⋯ sheet's rows.
    menu: {
      paddingBottom: spacing.sm,
    },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    menuText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    menuDanger: {
      color: colors.danger,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    padded: {
      paddingHorizontal: spacing.md,
    },
    // Their picks: rows in one rounded card.
    recList: {
      borderRadius: shape.card,
      overflow: "hidden",
    },
    bleed: {
      marginHorizontal: -spacing.md,
    },
    // Profile / Stats, under the header, like your Profile's.
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
    // Them, centred.
    identity: {
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    // Their initials fill the ring's middle, no ring of their own.
    ringAvatar: {
      borderWidth: 0,
    },
    proBadge: {
      marginTop: spacing.xs,
    },
    handle: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    // Films · ranks · match, evenly across under their handle.
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
    countMatch: {
      color: colors.success,
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
    // Taste
    hours: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      paddingVertical: spacing.sm,
    },
    rankRow: {
      gap: 2,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
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
    railPoster: {
      width: POSTER_ITEM - 2,
      aspectRatio: 2 / 3,
    },
    recRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 4,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    recPoster: {
      width: 44,
      aspectRatio: 2 / 3,
    },
    recText: {
      flex: 1,
    },
    recTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    recYear: {
      ...typography.caption,
      color: colors.textMuted,
    },
    recMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    recMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    tierChip: {
      minWidth: 20,
      paddingHorizontal: 5,
      alignItems: "center",
      borderRadius: 4,
    },
    tierChipText: {
      ...typography.label,
      fontSize: 12,
      color: "#0C0C0C",
    },
    // + Watchlist: a small filled button; Saved: slate.
    saveButton: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
      backgroundColor: colors.buttonFill,
      borderRadius: shape.control,
    },
    saveButtonSaved: {
      backgroundColor: colors.segmentOn,
    },
    saveText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },
    saveTextSaved: {
      color: colors.segmentOnText,
    },
  });

export default FriendProfileScreen;

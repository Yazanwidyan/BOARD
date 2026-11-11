import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Ban, ChevronLeft, Ellipsis, Flag, UserMinus } from "lucide-react-native";
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
import { BottomSheet } from "../components/BottomSheet";
import { FriendAvatar } from "../components/FriendAvatar";
import { MoviePoster } from "../components/MoviePoster";
import { TierBadge } from "../components/TierBadge";
import { ProBadge } from "../components/ProBadge";
import { ReportSheet } from "../components/ReportSheet";
import {
  BoardsRail,
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
import { TrophyCabinet } from "../components/TrophyCabinet";
import { TasteDnaBars } from "../components/TasteDnaBars";
import { countTiered, friendMatchLabel } from "../utils/tasteWords";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { api } from "../services/api";
import { useFriends } from "../store/friendsStore";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { toggleBucketListWithFeedback } from "../utils/achievementFeedback";
import {
  getBothLoved,
  getTasteMatch,
  getTheyLovedYouHavent,
} from "../utils/friends";
import { accentColor } from "../utils/pro";
import { getTasteDna } from "../utils/tasteDna";
import { CrownTitle, TenGrid } from "../components/MyTen";
import { getTen } from "../utils/myTen";
import { getTier } from "../utils/tiers";
import { t, useIsRTL } from "../i18n";

// The same measures as your Profile (screens/ProfileScreen).
const COVER_RATIO = 0.5;
const COVER_ABOVE_AVATAR = 0.55;
const AVATAR = 84;
const POSTER_ITEM = 104;
// How long the ⋯ sheet takes to leave before the next one opens.
const SHEET_HANDOFF_MS = 260;

const RECS_SHOWN = 3;
// Their latest films shown (four across).
const RECENT_SHOWN = 12;

// A friend's page, like your Profile: their name in the header (back left,
// ⋯ right — to report, remove or block them) and Overview / Taste under it.
//   Overview: their cover behind their avatar, their handle, their numbers
//   — films, finished collections, and how close your taste is (each
//   once, here) — their bio, their top four, you and them (what you both
//   loved, what they say you should watch), then their Films (each dated,
//   with their tier) / Lists / Collections.
//   Taste: their tiers and their Taste DNA.
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
  const { friends, removeFriend, blockUser } = useFriends();
  const friend = friends.find((item) => item.id === friendId);
  // ⋯: report them (or one of their lists), block them, or remove them.
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
    <HeaderIconButton round onPress={() => navigation.goBack()} accessibilityLabel={t("Back")}>
      <ChevronLeft
        size={22}
        color={colors.textPrimary}
        strokeWidth={2}
        style={rtl && styles.flipped}
      />
    </HeaderIconButton>
  );

  if (!friend) {
    return (
      <View style={styles.container}>
        <DockHeader {...header.props} title={t("Friend")} back={back} avatar={false} />
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

  const confirmBlock = () =>
    Alert.alert(
      t("Block {name}?", { name: friend.name }),
      t("You'll stop being friends, and they won't be able to find you or send you requests. You can unblock them in Settings."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Block"),
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(friend.id);
              showToast(t("{name} is blocked", { name: friend.name }));
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
  const tasteDna = getTasteDna(theirWatched);
  const openMovie = (movieId) => navigation.navigate("MovieDetails", { movieId });
  const openTierList = () => navigation.push("TierList", { friendId: friend.id });

  // Their cover: a still from a film they've watched, behind their avatar.
  const coverImage = friend.coverMovieId
    ? getMovieById(friend.coverMovieId)?.backdrop ?? null
    : null;
  const coverHeight = Math.round(screenWidth * COVER_RATIO);

  // Their title and their Ten (utils/myTen) — ringed in gold where you
  // tiered the film S too.
  const { ten: theirTen, crown: theirCrown } = getTen(theirWatched, friend.topTen ?? []);
  const mySIds = new Set(watched.filter((entry) => getTier(entry) === "S").map((entry) => entry.movieId));
  const sharedS = new Set(theirTen.filter((movie) => mySIds.has(movie.id)).map((movie) => movie.id));
  // Their numbers, once: films, finished collections, and your match.
  const counts = [
    { key: "films", value: theirWatched.length, label: theirWatched.length === 1 ? t("film") : t("films") },
    {
      key: "collections",
      value: finishedSagas.length,
      label: finishedSagas.length === 1 ? t("collection") : t("collections"),
    },
    match != null && {
      key: "match",
      value: friendMatchLabel(match, countTiered(watched), countTiered(theirWatched)),
      label: t("match"),
    },
  ].filter(Boolean);

  // Their page, as yours: one page — who they are, then (under bold
  // headings) what you share, their favourites, what they'd have you watch,
  // their taste, their collections, their lists and their films.
  const page = (
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
          { paddingTop: coverImage ? Math.max(Math.round(coverHeight * COVER_ABOVE_AVATAR), header.barBottom) : header.barBottom + spacing.underHeader },
        ]}
      >
        {/* Pro: their accent rings it (utils/pro). */}
        <FriendAvatar
          friend={friend}
          size={AVATAR}
          style={[styles.ringAvatar, friend.pro && accentColor(friend.accent) && { borderWidth: 3, borderColor: accentColor(friend.accent) }]}
        />
        {/* Their name, as yours is on your Profile, then their handle. */}
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={2} accessibilityRole="header">
            {friend.name}
          </Text>
          {friend.pro && <ProBadge accent={friend.accent} />}
        </View>
        <Text style={styles.handle}>{friend.handle}</Text>
        {/* Their title: their #1 S film. */}
        <CrownTitle crown={theirCrown} mine={false} onPress={() => openMovie(theirCrown.id)} style={styles.crownTitle} />
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

      <View style={styles.padded}>
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

        <ProfileSection
          title={t("Their Ten · {count}/10", { count: theirTen.length })}
          onAction={theirTen.length > 0 ? openTierList : undefined}
        >
          <TenGrid movies={theirTen} onPressSlot={(movie) => openMovie(movie.id)} ring={sharedS} />
          {sharedS.size > 0 && (
            <Text style={styles.tenShared}>{t("{count} in common with your S tier", { count: sharedS.size })}</Text>
          )}
        </ProfileSection>

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
                        <TierBadge tier={tier} size={20} />
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
        {/* Their taste: their tiers and their DNA. */}
        <ProfileSection title={t("Their taste")} onAction={openTierList}>
          <TierSummary entries={theirWatched} />
          {tasteDna.hasDna && (
            <View style={styles.dna}>
              <TasteDnaBars fingerprint={tasteDna.fingerprint} />
            </View>
          )}
        </ProfileSection>

        {/* The collections they've finished: a trophy each. */}
        {finishedSagas.length > 0 && (
          <ProfileSection title={t("Collections")}>
            <View style={styles.trophies}>
              <TrophyCabinet
                finished={finishedSagas}
                onOpen={(collectionId) => navigation.push("CollectionDetails", { collectionId })}
              />
            </View>
          </ProfileSection>
        )}

        {/* Their lists. */}
        {theirBoards.length > 0 && (
          <ProfileSection title={t("Lists")} rail>
            <BoardsRail
              boards={theirBoards}
              onOpen={(board) => navigation.push("BrowseMovies", { title: board.name, movieIds: board.movieIds })}
            />
          </ProfileSection>
        )}

        {/* Their films, newest first — each dated, with the tier they gave
            it. */}
        <ProfileSection title={t("Films")}>
          {theirWatched.length > 0 ? (
            <RecentPosters entries={theirWatched} count={RECENT_SHOWN} onOpen={openMovie} />
          ) : (
            <SectionEmpty line={t("{name} hasn't watched anything yet.", { name: firstName })} />
          )}
        </ProfileSection>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {page}
      </Animated.ScrollView>
      {/* Their name in the middle; back left, ⋯ (report, remove, block) right. */}
      <DockHeader
        {...header.props}
        title={friend.name}
        avatar={false}
        back={back}
        right={
          <HeaderIconButton round onPress={() => setIsMenuOpen(true)} accessibilityLabel={t("More")}>
            <Ellipsis size={20} color={colors.textPrimary} strokeWidth={2} />
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
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={thenClose(confirmBlock)}
            accessibilityRole="button"
          >
            <Ban size={20} color={colors.danger} strokeWidth={1.9} />
            <Text style={[styles.menuText, styles.menuDanger]}>{t("Block")}</Text>
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
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    // Their name, as yours is on your Profile.
    name: {
      fontFamily: fonts.extraBold,
      fontSize: 26,
      lineHeight: 32,
      letterSpacing: -0.4,
      color: colors.textPrimary,
      textAlign: "center",
      flexShrink: 1,
    },
    handle: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    // Films · collections · match, evenly across under their handle.
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
    // Their title, centred under their handle.
    crownTitle: {
      alignSelf: "center",
      marginTop: spacing.sm,
    },
    tenHint: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    tenShared: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    dna: {
      marginTop: spacing.lg,
    },
    trophies: {
      marginTop: spacing.lg,
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

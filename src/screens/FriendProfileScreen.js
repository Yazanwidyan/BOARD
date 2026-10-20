import { useQuery } from "@tanstack/react-query";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../components/AppText";
import Animated from "react-native-reanimated";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FriendAvatar } from "../components/FriendAvatar";
import { MoviePoster } from "../components/MoviePoster";
import {
  BoardsRail,
  FinishedSagasRail,
  ProfileSection,
  SectionEmpty,
  TierSummary,
  getFinishedSagas,
} from "../components/ProfileSections";
import {
  StackHeader,
  useStackHeaderScroll,
} from "../components/ScreenHeader";
import { ShelfRail } from "../components/ShelfRail";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { api } from "../services/api";
import { useHeroFadeStyle } from "../utils/scrollEffects";
import { useFriends } from "../store/friendsStore";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { toggleBucketListWithFeedback } from "../utils/achievementFeedback";
import {
  getBothLoved,
  getTasteMatch,
  getTheyLovedYouHavent,
  timeAgo,
} from "../utils/friends";
import { getTierInfo } from "../utils/tiers";
import { getTitleName } from "../utils/ranks";
import { t } from "../i18n";

const POSTER_ITEM = 122;

const TierChip = ({ tier, styles }) => (
  <View style={[styles.tierChip, { backgroundColor: getTierInfo(tier).color }]}>
    <Text style={styles.tierChipText}>{tier}</Text>
  </View>
);

// A friend's page, laid out like your Profile: who they are, their tiers
// (S in their order), the sagas they've finished and their boards — the same
// sections as yours — then the two of you: what you both loved, what they loved
// that you haven't seen (one tap to save it), and their recent activity.
export const FriendProfileScreen = ({ navigation, route }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const headerScroll = useStackHeaderScroll();
  // Where the big name ends in the page: the bar picks the name up as it
  // scrolls under it, while the avatar and name ease away.
  const [nameRevealAt, setNameRevealAt] = useState(null);
  const heroStyle = useHeroFadeStyle(headerScroll.scrollY, nameRevealAt ?? 160);
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const friendId = route?.params?.friendId;
  const { friends, activity: allActivity, removeFriend } = useFriends();
  const friend = friends.find((item) => item.id === friendId);
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

  if (!friend) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("Friend")} onBack={() => navigation.goBack()} />
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

  const savedIds = new Set(bucketList.map((entry) => entry.movieId));
  const match = getTasteMatch(watched, friend.watched);
  const bothLoved = getBothLoved(watched, friend.watched);
  const recommendations = getTheyLovedYouHavent(watched, friend.watched);
  const theirBoards = boards.data?.boards ?? [];
  const finishedSagas = getFinishedSagas(friend.watched);
  const openTierList = () => navigation.push("TierList", { friendId: friend.id });
  const firstName = friend.name.split(" ")[0];
  const activity = allActivity.filter((event) => event.friendId === friend.id);
  const openMovie = (movieId) =>
    navigation.navigate("MovieDetails", { movieId });

  const Tag = ({ label }) => (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StackHeader
        title={friend.name}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
        titleRevealAt={nameRevealAt}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Who */}
        <Animated.View style={[styles.hero, heroStyle]}>
          <FriendAvatar friend={friend} size={84} />
          <Text
            style={styles.name}
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              setNameRevealAt(y + height);
            }}
          >
            {friend.name}
          </Text>
          <Text style={styles.handle}>
            {friend.handle} · {t(friend.title ?? getTitleName(friend.level))}
            {friend.ranks != null && ` · ${t("{count} ranks", { count: friend.ranks })}`}
          </Text>
          <View style={styles.stats}>
            {[
              [friend.watched.length, "watched"],
              [
                friend.watched.filter((entry) => entry.tier === "S").length,
                "S tier",
              ],
              [match != null ? `${match}%` : "—", "taste match"],
            ].map(([value, label], index) => (
              <View key={label} style={styles.statWrap}>
                {index > 0 && <View style={styles.statDivider} />}
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{value}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={styles.sections}>
          {friend.watched.length > 0 && (
            <ProfileSection title={t("Tiers")} onAction={openTierList} onPress={openTierList}>
              <TierSummary entries={friend.watched} />
            </ProfileSection>
          )}

          {finishedSagas.length > 0 && (
            <ProfileSection title={t("Sagas")} rail>
              <FinishedSagasRail
                watched={friend.watched}
                onOpen={(collectionId) => navigation.push("CollectionDetails", { collectionId })}
              />
            </ProfileSection>
          )}

          <ProfileSection title={t("Boards")} rail={theirBoards.length > 0}>
            {theirBoards.length > 0 ? (
              <BoardsRail
                boards={theirBoards}
                onOpen={(board) =>
                  navigation.push("BrowseMovies", { title: board.name, movieIds: board.movieIds })
                }
              />
            ) : (
              <SectionEmpty
                line={
                  boards.isLoading
                    ? t("Loading…")
                    : t("{name} hasn't made any boards yet.", { name: firstName })
                }
              />
            )}
          </ProfileSection>

          {/* The two of you */}
          <ProfileSection title={t("You and {name}", { name: firstName })} />
        </View>

        {/* You both loved */}
        <Tag label={t("You both loved")} />
        {bothLoved.length > 0 ? (
          <ShelfRail
            itemWidth={POSTER_ITEM}
            items={bothLoved.map((movie) => ({
              key: movie.id,
              onPress: () => openMovie(movie.id),
              content: (
                <MoviePoster
                  uri={movie.poster}
                  shadow
                  style={styles.railPoster}
                />
              ),
            }))}
          />
        ) : (
          <Text style={styles.none}>
            {t("Nothing in common yet. Tier more movies and it'll fill in.")}
          </Text>
        )}

        {/* They loved, you haven't seen */}
        {recommendations.length > 0 && (
          <>
            <Tag
              label={t("{value} says watch these", {
                value: firstName,
              })}
            />
            <View style={styles.list}>
              {recommendations.map(({ movie, tier }) => {
                const saved = savedIds.has(movie.id);
                return (
                  <Pressable
                    key={movie.id}
                    style={styles.recRow}
                    onPress={() => openMovie(movie.id)}
                  >
                    <MoviePoster uri={movie.poster} style={styles.recPoster} />
                    <View style={styles.recText}>
                      <Text style={styles.recTitle} numberOfLines={1}>
                        {movie.title}
                      </Text>
                      <View style={styles.recMetaRow}>
                        <Text style={styles.recMeta}>
                          {t("They tiered it")}
                        </Text>
                        <TierChip tier={tier} styles={styles} />
                      </View>
                    </View>
                    <Pressable
                      style={[
                        styles.saveButton,
                        saved && styles.saveButtonSaved,
                      ]}
                      onPress={() => toggleBucketListWithFeedback(movie.id)}
                      hitSlop={6}
                    >
                      <Text
                        style={[
                          styles.saveButtonText,
                          saved && styles.saveButtonTextSaved,
                        ]}
                      >
                        {saved ? t("Saved") : t("+ Watchlist")}
                      </Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Recent */}
        {activity.length > 0 && (
          <>
            <Tag label={t("Recently")} />
            <View style={styles.list}>
              {activity.map((event) => (
                <View key={event.id} style={styles.activityRow}>
                  <Text style={styles.activityText}>
                    {event.type === "tier" &&
                      t("Tiered {title} {tier}", {
                        title: getMovieById(event.movieId)?.title,
                        tier: event.tier,
                      })}
                    {event.type === "watched" &&
                      t("Watched {title}", {
                        title: getMovieById(event.movieId)?.title,
                      })}
                    {event.type === "watchlist" &&
                      t("Saved {title}", {
                        title: getMovieById(event.movieId)?.title,
                      })}
                    {event.type === "rank" &&
                      t("Became {rank} · {track}", { rank: t(event.rank), track: t(event.track) })}
                    {event.type === "badge" &&
                      t("Earned the {badge} badge", { badge: event.badge })}
                    {event.type === "set" &&
                      t("Finished every {set} movie", { set: event.set })}
                  </Text>
                  <Text style={styles.activityTime}>
                    {timeAgo(event.timestamp)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Pressable onPress={confirmRemove} hitSlop={8} style={styles.remove}>
          <Text style={styles.removeText}>{t("Remove friend")}</Text>
        </Pressable>
      </Animated.ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // The profile sections run edge to edge inside this page padding.
    sections: {
      paddingHorizontal: spacing.md,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    hero: {
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
    },
    name: {
      ...typography.hero,
      fontSize: 24,
      lineHeight: 30,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    handle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    stats: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
      marginTop: spacing.md,
    },
    statWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    statDivider: {
      width: 1,
      height: 28,
      backgroundColor: colors.border,
    },
    stat: {
      flex: 1,
      alignItems: "center",
    },
    statValue: {
      ...typography.hero,
      fontSize: 20,
      lineHeight: 24,
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    // Section caption, like Settings.
    tag: {
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    tagText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    railPoster: {
      width: POSTER_ITEM - 2,
      aspectRatio: 2 / 3,
    },
    none: {
      ...typography.caption,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
    },
    // Lists run edge to edge as bands; rows keep the inset.
    list: {
      gap: 2,
    },
    recRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    recPoster: {
      width: 52,
      height: 78,
    },
    recText: {
      flex: 1,
    },
    recTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
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
    },
    tierChipText: {
      ...typography.label,
      fontSize: 12,
      color: "#0C1014",
    },
    // A plain text action, not a pill.
    saveButton: {
      paddingVertical: spacing.xs,
      paddingStart: spacing.sm,
    },
    saveButtonSaved: {},
    saveButtonText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    saveButtonTextSaved: {
      color: colors.textSecondary,
    },
    activityRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    activityText: {
      ...typography.body,
      flex: 1,
      color: colors.textPrimary,
    },
    activityTime: {
      ...typography.caption,
      color: colors.textMuted,
    },
    remove: {
      alignSelf: "center",
      marginTop: spacing.xl,
      padding: spacing.sm,
    },
    removeText: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.danger,
    },
  });

export default FriendProfileScreen;

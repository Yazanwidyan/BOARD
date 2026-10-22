import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivityEvent } from "../components/ActivityEvent";
import { Text } from "../components/AppText";
import { ClubEditSheet } from "../components/ClubEditSheet";
import { FriendAvatar } from "../components/FriendAvatar";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  StackHeader,
  useStackHeaderScroll,
} from "../components/ScreenHeader";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { useAuthStore } from "../store/authStore";
import { useClub, useClubActions, useClubActivity } from "../store/clubsStore";
import { useFriends } from "../store/friendsStore";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { TIERS, getTierInfo } from "../utils/tiers";
import { useRefetchOnFocus } from "../utils/useRefetchOnFocus";
import { t } from "../i18n";

const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const AVATARS_SHOWN = 6;
const FEED_SHOWN = 15;

// The club's verdict on a movie: the average of its members' tiers,
// rounded to the nearest tier. null until a member has tiered it.
const clubTier = (watches) => {
  const ranks = watches
    .map((watch) => TIERS.findIndex((tier) => tier.key === watch.tier))
    .filter((rank) => rank >= 0);
  if (ranks.length === 0) return null;
  const average = ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length;
  return TIERS[Math.round(average)].key;
};

// One club: its invite code, what everyone's watching next, the club's
// tier list, the shared board, members, and what members have done with
// the club's movies. The owner also edits it, sets "now watching", resets
// the code, removes members and can delete it; members can leave.
export const ClubDetailsScreen = ({ navigation, route }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { clubId } = route.params;
  const { data: club, isLoading, error, refetch } = useClub(clubId);
  const { data: activity = [], refetch: refetchActivity } =
    useClubActivity(clubId);
  const { friends } = useFriends();
  const me = useAuthStore((state) => state.user?.id);
  const actions = useClubActions();
  const [editing, setEditing] = useState(false);
  useRefetchOnFocus(refetch);
  useRefetchOnFocus(refetchActivity);

  if (!club) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("Club")} onBack={() => navigation.goBack()} />
        <Text style={styles.footnote}>
          {isLoading
            ? t("Loading…")
            : t("Couldn't load the club: {error}", {
                error: error?.message ?? "",
              })}
        </Text>
      </View>
    );
  }

  const isOwner = club.role === "owner";
  const friendIds = new Set(friends.map((friend) => friend.id));
  const membersById = new Map(club.members.map((member) => [member.id, member]));
  const posterWidth =
    (width - spacing.md * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const openMovie = (movieId) =>
    navigation.navigate("MovieDetails", { movieId });
  // Club members you're friends with open their page; others don't have one.
  const openMember = (userId) =>
    friendIds.has(userId)
      ? () => navigation.navigate("FriendProfile", { friendId: userId })
      : undefined;
  const run = async (action, message) => {
    try {
      await action();
      if (message) showToast(message, { tone: "success" });
    } catch (err) {
      showToast(err.message);
    }
  };

  // The tier list: every club movie a member has tiered, by the club's
  // average tier.
  const boardEntries = [
    ...club.movies,
    ...(club.nowWatching &&
    !club.movies.some((entry) => entry.movieId === club.nowWatching.movieId)
      ? [club.nowWatching]
      : []),
  ];
  const tierRows = TIERS.map((tier) => ({
    tier,
    movies: boardEntries
      .filter((entry) => clubTier(entry.watches) === tier.key)
      .map((entry) => getMovieById(entry.movieId))
      .filter(Boolean),
  })).filter((row) => row.movies.length > 0);

  const nowWatching = club.nowWatching
    ? getMovieById(club.nowWatching.movieId)
    : null;
  const nowWatchers = (club.nowWatching?.watches ?? [])
    .map((watch) => membersById.get(watch.userId))
    .filter(Boolean);

  const movieActions = (entry) => {
    const movie = getMovieById(entry.movieId);
    if (!movie) return;
    const canRemove = isOwner || entry.addedBy === me;
    const buttons = [
      { text: t("Open movie"), onPress: () => openMovie(movie.id) },
      isOwner && {
        text: t("Set as now watching"),
        onPress: () =>
          run(
            () => actions.updateClub({ clubId, nowWatching: movie.id }),
            t("Now watching: {title}", { title: movie.title }),
          ),
      },
      canRemove && {
        text: t("Remove from club"),
        style: "destructive",
        // Failures toast from the mutation itself.
        onPress: () => actions.toggleClubMovie(clubId, movie.id, false),
      },
      { text: t("Cancel"), style: "cancel" },
    ].filter(Boolean);
    Alert.alert(movie.title, "", buttons);
  };

  const confirm = (title, message, label, onPress) =>
    Alert.alert(title, message, [
      { text: t("Cancel"), style: "cancel" },
      { text: label, style: "destructive", onPress },
    ]);

  return (
    <View style={styles.container}>
      <StackHeader
        title={club.name}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Who and what */}
        <View style={styles.hero}>
          <Text style={styles.name}>{club.name}</Text>
          {!!club.description && (
            <Text style={styles.description}>{club.description}</Text>
          )}
          <View style={styles.avatarRow}>
            {club.members.slice(0, AVATARS_SHOWN).map((member, index) => (
              <FriendAvatar
                key={member.id}
                friend={member}
                size={30}
                style={index > 0 && styles.avatarOverlap}
              />
            ))}
            <Text style={styles.heroMeta}>
              {t("{count} members", { count: club.memberCount })}
            </Text>
          </View>
        </View>

        {/* Invite */}
        <View style={styles.inviteCard}>
          <Text style={styles.inviteLabel}>{t("Invite code")}</Text>
          <Pressable
            onPress={async () => {
              await Clipboard.setStringAsync(club.inviteCode);
              showToast(t("Code copied"), { tone: "success" });
            }}
            hitSlop={6}
          >
            <Text style={styles.inviteCode}>{club.inviteCode}</Text>
          </Pressable>
          <Text style={styles.inviteHint}>
            {t("Friends join from Clubs with this code — tap it to copy.")}
          </Text>
          <PrimaryButton
            label={t("Invite to the club")}
            onPress={() =>
              Share.share({
                message: t(
                  'Join my ReelBoard club "{name}" — open Friends → Clubs and enter the code {code}.',
                  { name: club.name, code: club.inviteCode },
                ),
              })
            }
            style={styles.inviteButton}
          />
        </View>

        {/* Now watching — the club's challenge */}
        <Text style={styles.tagText}>{t("Now watching")}</Text>
        {nowWatching ? (
          <Pressable
            style={({ pressed }) => [styles.nowCard, pressed && styles.pressed]}
            onPress={() => openMovie(nowWatching.id)}
          >
            <MoviePoster uri={nowWatching.poster} style={styles.nowPoster} />
            <View style={styles.nowText}>
              <Text style={styles.nowTitle} numberOfLines={2}>
                {nowWatching.title}
              </Text>
              <Text style={styles.nowMeta}>
                {t("{watched} of {members} have watched it", {
                  watched: nowWatchers.length,
                  members: club.memberCount,
                })}
              </Text>
              <View style={styles.avatarRow}>
                {nowWatchers.slice(0, AVATARS_SHOWN).map((member, index) => (
                  <FriendAvatar
                    key={member.id}
                    friend={member}
                    size={26}
                    style={index > 0 && styles.avatarOverlap}
                  />
                ))}
              </View>
              {isOwner && (
                <Pressable
                  onPress={() =>
                    run(() =>
                      actions.updateClub({ clubId, nowWatching: null }),
                    )
                  }
                  hitSlop={6}
                >
                  <Text style={styles.link}>{t("Clear")}</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        ) : (
          <Text style={styles.placeholder}>
            {isOwner
              ? t(
                  "Pick what everyone watches next: long-press a movie on the board below.",
                )
              : t("The owner hasn't picked the next movie yet.")}
          </Text>
        )}

        {/* The club's tier list */}
        {tierRows.length > 0 && (
          <>
            <Text style={styles.tagText}>{t("Club tier list")}</Text>
            <View style={styles.tierList}>
              {tierRows.map(({ tier, movies }) => (
                <View key={tier.key} style={styles.tierRow}>
                  <View
                    style={[styles.tierBadge, { backgroundColor: tier.color }]}
                  >
                    <Text style={styles.tierBadgeText}>{tier.key}</Text>
                  </View>
                  <View style={styles.tierPosters}>
                    {movies.map((movie) => (
                      <Pressable key={movie.id} onPress={() => openMovie(movie.id)}>
                        <MoviePoster uri={movie.poster} style={styles.tierPoster} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.hint}>
              {t("Each movie sits at the average of members' tiers.")}
            </Text>
          </>
        )}

        {/* The shared board */}
        <Text style={styles.tagText}>
          {t("The board ·")} {club.movies.length}
        </Text>
        {club.movies.length > 0 ? (
          <View style={styles.grid}>
            {club.movies.map((entry) => {
              const movie = getMovieById(entry.movieId);
              if (!movie) return null;
              const tier = clubTier(entry.watches);
              return (
                <Pressable
                  key={entry.movieId}
                  style={{ width: posterWidth }}
                  onPress={() => openMovie(movie.id)}
                  onLongPress={() => movieActions(entry)}
                  delayLongPress={300}
                >
                  <MoviePoster
                    uri={movie.poster}
                    style={{ width: posterWidth, height: posterWidth * 1.5 }}
                  />
                  <Text style={styles.gridMeta} numberOfLines={1}>
                    {t("{watched}/{members} watched", {
                      watched: entry.watches.length,
                      members: club.memberCount,
                    })}
                    {tier ? (
                      <Text style={{ color: getTierInfo(tier).color }}>
                        {"  "}
                        {tier}
                      </Text>
                    ) : null}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.placeholder}>
            {t("Nothing here yet.")}
          </Text>
        )}
        <Text style={styles.hint}>
          {t(
            "Add movies from any movie's page with Board. Long-press one here for more.",
          )}
        </Text>

        {/* Members */}
        <Text style={styles.tagText}>
          {t("Members ·")} {club.memberCount}
        </Text>
        {club.members.map((member) => (
          <Pressable
            key={member.id}
            style={({ pressed }) => [
              styles.memberRow,
              pressed && openMember(member.id) && styles.pressed,
            ]}
            onPress={openMember(member.id)}
            disabled={!openMember(member.id)}
          >
            <FriendAvatar friend={member} size={38} />
            <View style={styles.memberText}>
              <Text style={styles.memberName} numberOfLines={1}>
                {member.name}
                {member.id === me ? ` ${t("(you)")}` : ""}
              </Text>
              <Text style={styles.memberMeta} numberOfLines={1}>
                {member.handle}
              </Text>
            </View>
            {member.role === "owner" ? (
              <Text style={styles.ownerTag}>{t("Owner")}</Text>
            ) : (
              isOwner && (
                <Pressable
                  hitSlop={6}
                  onPress={() =>
                    confirm(
                      t("Remove {name}?", { name: member.name }),
                      t("They can join again with the invite code."),
                      t("Remove"),
                      () =>
                        run(() =>
                          actions.removeMember({ clubId, userId: member.id }),
                        ),
                    )
                  }
                >
                  <Text style={styles.link}>{t("Remove")}</Text>
                </Pressable>
              )
            )}
          </Pressable>
        ))}

        {/* What members have done with the club's movies */}
        {activity.length > 0 && (
          <>
            <Text style={styles.tagText}>{t("Club activity")}</Text>
            <View style={styles.feed}>
              {activity.slice(0, FEED_SHOWN).map((event, index) => (
                <ActivityEvent
                  key={event.id}
                  event={event}
                  now={Date.now()}
                  divider={index > 0}
                  onPress={openMember(event.friendId)}
                  onOpenMovie={openMovie}
                />
              ))}
            </View>
          </>
        )}

        {/* Owner / member actions */}
        <View style={styles.section}>
          {isOwner ? (
            <>
              <Pressable style={styles.row} onPress={() => setEditing(true)}>
                <Text style={styles.rowLabel}>{t("Edit club")}</Text>
              </Pressable>
              <Pressable
                style={styles.row}
                onPress={() =>
                  confirm(
                    t("New invite code?"),
                    t("The old code stops working."),
                    t("New code"),
                    () => run(() => actions.newInviteCode(clubId)),
                  )
                }
              >
                <Text style={styles.rowLabel}>{t("New invite code")}</Text>
              </Pressable>
              <Pressable
                style={styles.row}
                onPress={() =>
                  confirm(
                    t("Delete {name}?", { name: club.name }),
                    t("The club is deleted for everyone. This can't be undone."),
                    t("Delete"),
                    () =>
                      run(async () => {
                        await actions.deleteClub(clubId);
                        navigation.goBack();
                      }),
                  )
                }
              >
                <Text style={[styles.rowLabel, styles.danger]}>
                  {t("Delete club")}
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={styles.row}
              onPress={() =>
                confirm(
                  t("Leave {name}?", { name: club.name }),
                  t("You can join again with the invite code."),
                  t("Leave"),
                  () =>
                    run(async () => {
                      await actions.leaveClub(clubId);
                      navigation.goBack();
                    }),
                )
              }
            >
              <Text style={[styles.rowLabel, styles.danger]}>
                {t("Leave club")}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.ScrollView>

      <ClubEditSheet
        visible={editing}
        club={club}
        onClose={() => setEditing(false)}
        onSave={(changes) =>
          run(async () => {
            await actions.updateClub({ clubId, ...changes });
            setEditing(false);
          })
        }
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
      opacity: 0.8,
    },
    hero: {
      padding: spacing.md,
      gap: spacing.xs,
    },
    name: {
      ...typography.hero,
      color: colors.textPrimary,
    },
    description: {
      ...typography.body,
      color: colors.textSecondary,
    },
    avatarRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.xs,
    },
    avatarOverlap: {
      marginStart: -8,
    },
    heroMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginStart: spacing.sm,
    },
    inviteCard: {
      alignItems: "center",
      padding: spacing.lg,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      marginHorizontal: spacing.md,
    },
    inviteLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    inviteCode: {
      ...typography.hero,
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: 3,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    inviteHint: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
      textAlign: "center",
    },
    inviteButton: {
      alignSelf: "stretch",
      marginTop: spacing.md,
    },
    // Section caption, like Settings.
    tagText: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    placeholder: {
      ...typography.body,
      color: colors.textSecondary,
      padding: spacing.md,
      backgroundColor: colors.card,
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    nowCard: {
      flexDirection: "row",
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      marginHorizontal: spacing.md,
    },
    nowPoster: {
      width: 72,
      height: 108,
    },
    nowText: {
      flex: 1,
      gap: spacing.xs,
    },
    nowTitle: {
      ...typography.title,
      color: colors.textPrimary,
    },
    nowMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    link: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    tierList: {
      gap: 2,
    },
    tierRow: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: shape.card,
      marginHorizontal: spacing.md,
    },
    tierBadge: {
      width: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    tierBadgeText: {
      ...typography.hero,
      fontSize: 20,
      lineHeight: 27,
      color: "#0C1014",
    },
    tierPosters: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 2,
      padding: 2,
    },
    tierPoster: {
      width: 44,
      height: 66,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GRID_GAP,
      paddingHorizontal: spacing.md,
      rowGap: spacing.sm,
    },
    gridMeta: {
      ...typography.micro,
      color: colors.textSecondary,
      marginTop: 4,
    },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      marginBottom: 2,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      marginHorizontal: spacing.md,
    },
    memberText: {
      flex: 1,
    },
    memberName: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    memberMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    ownerTag: {
      ...typography.caption,
      color: colors.textMuted,
    },
    feed: {
      backgroundColor: colors.card,
      borderRadius: shape.card,
      marginHorizontal: spacing.md,
      overflow: "hidden",
    },
    section: {
      marginTop: spacing.xl,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      marginHorizontal: spacing.md,
      overflow: "hidden",
    },
    row: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.background,
    },
    rowLabel: {
      ...typography.body,
      color: colors.textPrimary,
    },
    danger: {
      color: colors.danger,
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
    },
  });

export default ClubDetailsScreen;

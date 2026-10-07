import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FriendAvatar } from "../components/FriendAvatar";
import { MoviePoster } from "../components/MoviePoster";
import { StackHeader } from "../components/ScreenHeader";
import { ShelfRail } from "../components/ShelfRail";
import { getMockActivity, getMockFriend } from "../data/mockFriends";
import { getMovieById } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
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
import { getLevelName } from "../utils/xp";

const POSTER_ITEM = 122;

const TierChip = ({ tier, styles }) => (
  <View style={[styles.tierChip, { backgroundColor: getTierInfo(tier).color }]}>
    <Text style={styles.tierChipText}>{tier}</Text>
  </View>
);

// A friend's page (MOCK — see data/mockFriends): who they are, how close
// your taste is, what you both loved, what they loved that you haven't
// seen (one tap to save it), their top tier, and their recent activity.
export const FriendProfileScreen = ({ navigation, route }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const friend = getMockFriend(route?.params?.friendId);

  if (!friend) {
    return (
      <View style={styles.container}>
        <StackHeader title="Friend" onBack={() => navigation.goBack()} />
      </View>
    );
  }

  const savedIds = new Set(bucketList.map((entry) => entry.movieId));
  const match = getTasteMatch(watched, friend.watched);
  const bothLoved = getBothLoved(watched, friend.watched);
  const recommendations = getTheyLovedYouHavent(watched, friend.watched);
  const topTier = friend.watched
    .filter((entry) => entry.tier === "S")
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean);
  const activity = getMockActivity().filter(
    (event) => event.friendId === friend.id,
  );
  const openMovie = (movieId) =>
    navigation.navigate("MovieDetails", { movieId });

  const Tag = ({ label }) => (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StackHeader title={friend.name} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Who */}
        <View style={styles.hero}>
          <FriendAvatar friend={friend} size={84} />
          <Text style={styles.name}>{friend.name}</Text>
          <Text style={styles.handle}>
            {friend.handle} · Level {friend.level} ·{" "}
            {getLevelName(friend.level)}
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
        </View>

        {/* You both loved */}
        <Tag label="You both loved" />
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
            Nothing in common yet. Tier more movies and it&apos;ll fill in.
          </Text>
        )}

        {/* They loved, you haven't seen */}
        {recommendations.length > 0 && (
          <>
            <Tag label={`${friend.name.split(" ")[0]} says watch these`} />
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
                        <Text style={styles.recMeta}>They tiered it</Text>
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
                        {saved ? "Saved" : "+ Watchlist"}
                      </Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Their top tier */}
        {topTier.length > 0 && (
          <>
            <Tag label="Their S tier" />
            <ShelfRail
              itemWidth={POSTER_ITEM}
              items={topTier.map((movie) => ({
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
          </>
        )}

        {/* Recent */}
        {activity.length > 0 && (
          <>
            <Tag label="Recently" />
            <View style={styles.list}>
              {activity.map((event) => (
                <View key={event.id} style={styles.activityRow}>
                  <Text style={styles.activityText}>
                    {event.type === "tier" &&
                      `Tiered ${getMovieById(event.movieId)?.title} ${event.tier}`}
                    {event.type === "watched" &&
                      `Watched ${getMovieById(event.movieId)?.title}`}
                    {event.type === "watchlist" &&
                      `Saved ${getMovieById(event.movieId)?.title}`}
                    {event.type === "badge" &&
                      `Earned the ${event.badge} badge`}
                    {event.type === "set" &&
                      `Finished every ${event.set} movie`}
                  </Text>
                  <Text style={styles.activityTime}>
                    {timeAgo(event.timestamp)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
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
    tag: {
      alignSelf: "flex-start",
      marginLeft: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.sm + 2,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      borderRadius: radius.xs,
      backgroundColor: colors.cardElevated,
    },
    tagText: {
      ...typography.label,
      color: colors.textSecondary,
      letterSpacing: 1.2,
      textTransform: "uppercase",
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
      borderRadius: 4,
      alignItems: "center",
    },
    tierChipText: {
      ...typography.label,
      fontSize: 12,
      color: "#16152A",
    },
    saveButton: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 7,
      borderRadius: radius.pill,
      backgroundColor: colors.selected,
    },
    saveButtonSaved: {
      backgroundColor: colors.surfaceSoft,
    },
    saveButtonText: {
      ...typography.label,
      fontSize: 11,
      color: colors.selectedText,
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
  });

export default FriendProfileScreen;

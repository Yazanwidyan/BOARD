import { Activity as ActivityIcon, ChevronRight, UserPlus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/AppText";
import { EmptyState } from "../components/EmptyState";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivityEvent, EVENT_INSET } from "../components/ActivityEvent";
import { FriendAvatar } from "../components/FriendAvatar";
import {
  StackHeader,
  useStackHeaderScroll,
} from "../components/ScreenHeader";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { SettingsGroup } from "../components/SettingsList";
import { useActivitySeenStore } from "../store/activitySeenStore";
import { useAuthStore } from "../store/authStore";
import { useFriends } from "../store/friendsStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { t, useIsRTL } from "../i18n";
import { useMoviesVersion } from "../data/movies";

const DAY = 24 * 60 * 60 * 1000;
const AVATARS_SHOWN = 4;

// What the chips narrow the feed to, by event type. Only the kinds that
// are in the feed get a chip.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "watched", label: "Watched", types: ["watched"] },
  { key: "tier", label: "Tiers", types: ["tier"] },
  { key: "watchlist", label: "Saved", types: ["watchlist"] },
  { key: "rank", label: "Ranks", types: ["rank", "badge", "set"] },
];

// Events (newest first) in three buckets by how long ago they happened —
// today, this week, earlier — leaving out the empty ones.
const groupByAge = (events, now) => {
  const groups = [
    { key: "today", label: "Today", items: [] },
    { key: "week", label: "This week", items: [] },
    { key: "earlier", label: "Earlier", items: [] },
  ];
  events.forEach((event) => {
    const age = now - event.timestamp;
    const group = age < DAY ? groups[0] : age < 7 * DAY ? groups[1] : groups[2];
    group.items.push(event);
  });
  return groups.filter((group) => group.items.length > 0);
};

// Activity, laid out like Settings: your friends (and requests waiting on
// you) up top, chips for the kind of thing, then what your friends have
// been watching, tiering, saving and earning, newest first, grouped by age
// (from the ReelBoard server). Tap an event for that friend's page, a
// poster for the movie.
export const ActivityScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const { friends, incoming, activity, loaded, loading, error } = useFriends();
  const [filter, setFilter] = useState("all");
  const userId = useAuthStore((state) => state.user?.id);
  const markSeen = useActivitySeenStore((state) => state.markSeen);

  // Looking here clears the bell — again whenever new events arrive while
  // you're on it.
  useEffect(() => {
    if (userId) markSeen(userId);
  }, [userId, activity, markSeen]);

  const now = Date.now();
  const sorted = [...activity].sort((a, b) => b.timestamp - a.timestamp);
  const filters = FILTERS.filter(
    (option) => !option.types || sorted.some((event) => option.types.includes(event.type)),
  );
  const chosen = filters.find((option) => option.key === filter) ?? filters[0];
  const groups = groupByAge(
    chosen.types ? sorted.filter((event) => chosen.types.includes(event.type)) : sorted,
    now,
  );
  const openMovie = (movieId) =>
    navigation.navigate("MovieDetails", { movieId });

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Activity")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Your friends — and requests waiting on you. */}
        <Pressable
          style={({ pressed }) => [styles.friendsCard, pressed && styles.rowPressed]}
          onPress={() => navigation.navigate("Friends")}
          accessibilityRole="button"
        >
          {friends.length > 0 ? (
            <View style={styles.avatarStack}>
              {friends.slice(0, AVATARS_SHOWN).map((friend, index) => (
                <FriendAvatar
                  key={friend.id}
                  friend={friend}
                  size={36}
                  style={[index > 0 && styles.avatarOverlap, { borderColor: colors.card }]}
                />
              ))}
            </View>
          ) : (
            <UserPlus size={20} color={colors.textSecondary} strokeWidth={1.9} />
          )}
          <View style={styles.friendsText}>
            <Text style={styles.friendsTitle}>
              {friends.length > 0
                ? t("{count} friends", { count: friends.length })
                : t("Add friends")}
            </Text>
            <Text style={styles.friendsSubtitle} numberOfLines={1}>
              {t("Compare tiers · invite more")}
            </Text>
          </View>
          {incoming.length > 0 && (
            <View style={styles.requestsPill}>
              <Text style={styles.requestsText}>
                {t("{count} requests", { count: incoming.length })}
              </Text>
            </View>
          )}
          <ChevronRight
            size={18}
            color={colors.textMuted}
            style={rtl && styles.flipped}
          />
        </Pressable>

        {/* What kind of thing: only when there's more than one kind. */}
        {filters.length > 2 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
            contentContainerStyle={styles.chipRowContent}
          >
            {filters.map((option) => {
              const selected = option.key === chosen.key;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.chip, selected && styles.chipOn]}
                  onPress={() => setFilter(option.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                    {t(option.label)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {groups.map((group) => (
          <SettingsGroup key={group.key} title={t(group.label)} inset={EVENT_INSET}>
            {group.items.map((event) => (
              <ActivityEvent
                key={event.id}
                event={event}
                now={now}
                onPress={() =>
                  navigation.navigate("FriendProfile", {
                    friendId: event.friendId,
                  })
                }
                onOpenMovie={openMovie}
              />
            ))}
          </SettingsGroup>
        ))}

        {/* Nothing in the feed yet: one way forward. */}
        {loaded && activity.length === 0 && (
          <EmptyState
            Icon={ActivityIcon}
            title={friends.length === 0 ? t("No friends yet") : t("All quiet")}
            subtitle={
              friends.length === 0
                ? t("Add friends to see what they're watching.")
                : t("Nothing yet — your friends' watches and tiers show up here.")
            }
            actionLabel={friends.length === 0 ? t("Find friends") : undefined}
            onAction={() => navigation.navigate("Friends")}
          />
        )}
        {!loaded && loading && (
          <Text style={styles.footnote}>{t("Loading…")}</Text>
        )}
        {!!error && (
          <Text style={styles.footnote}>
            {t("Couldn't load activity: {error}", { error })}
          </Text>
        )}
      </Animated.ScrollView>
      <ScreenBottomFade />
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    rowPressed: {
      backgroundColor: colors.cardElevated,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    friendsCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 64,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      backgroundColor: colors.card,
    },
    avatarStack: {
      flexDirection: "row",
    },
    avatarOverlap: {
      marginStart: -12,
    },
    friendsText: {
      flex: 1,
      gap: 2,
    },
    friendsTitle: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    friendsSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    requestsPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      backgroundColor: colors.selected,
      borderRadius: shape.chip,
    },
    requestsText: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 15,
      color: colors.selectedText,
    },
    chipRow: {
      flexGrow: 0,
      marginTop: spacing.md,
      marginHorizontal: spacing.md,
    },
    // Like Library's tabs: a dark track, the open one a slate pill.
    chipRowContent: {
      flexGrow: 1,
      gap: 2,
      padding: 2,
      // On the page, so the card colour (the dark track would vanish).
      backgroundColor: colors.card,
      borderRadius: 6,
    },
    chip: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
      paddingHorizontal: spacing.sm + 4,
      borderRadius: 7,
    },
    chipOn: {
      backgroundColor: colors.segmentOn,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.segmentText,
    },
    chipTextOn: {
      color: colors.segmentOnText,
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
    },
  });

export default ActivityScreen;

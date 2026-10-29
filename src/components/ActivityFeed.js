import { Activity as ActivityIcon } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useFriends } from "../store/friendsStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { ActivityEvent } from "./ActivityEvent";
import { Text } from "./AppText";
import { EmptyState } from "./EmptyState";
import { SettingsGroup } from "./SettingsList";

const DAY = 24 * 60 * 60 * 1000;

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

// What your friends have been watching, tiering, saving and earning, newest
// first: chips for the kind of thing, then the events grouped by age (from
// the ReelBoard server). Tap an event for that friend's page, a poster for
// the movie. The friends page (FriendsHubScreen).
export const ActivityFeed = ({ navigation }) => {
  // Re-render when movies this feed asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const { friends, activity, loaded, loading, error } = useFriends();
  const [filter, setFilter] = useState("all");

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

  return (
    <>
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
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>{t(option.label)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {groups.map((group) => (
        <SettingsGroup key={group.key} title={t(group.label)}>
          {group.items.map((event) => (
            <ActivityEvent
              key={event.id}
              event={event}
              now={now}
              onPress={() => navigation.navigate("FriendProfile", { friendId: event.friendId })}
              onOpenMovie={(movieId) => navigation.navigate("MovieDetails", { movieId })}
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
      {!loaded && loading && <Text style={styles.footnote}>{t("Loading…")}</Text>}
      {!!error && <Text style={styles.footnote}>{t("Couldn't load activity: {error}", { error })}</Text>}
    </>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    chipRow: {
      flexGrow: 0,
      marginHorizontal: spacing.md,
    },
    // Like Library's tabs: a dark track, the open one a white pill.
    chipRowContent: {
      flexGrow: 1,
      gap: 2,
      padding: 3,
      // On the page, so the card colour (the dark track would vanish).
      backgroundColor: colors.card,
      borderRadius: shape.chip,
    },
    chip: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6,
      paddingHorizontal: spacing.sm + 4,
      borderRadius: shape.chip,
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

export default ActivityFeed;

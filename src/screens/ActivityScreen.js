import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BadgeArt } from "../components/BadgeArt";
import { FriendAvatar } from "../components/FriendAvatar";
import { MoviePoster } from "../components/MoviePoster";
import { StackHeader } from "../components/ScreenHeader";
import { MOCK_FRIENDS, getMockActivity } from "../data/mockFriends";
import { getMovieById } from "../data/movies";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { timeAgo } from "../utils/friends";
import { getTierInfo } from "../utils/tiers";

const DAY = 24 * 60 * 60 * 1000;
const AVATARS_SHOWN = 5;

// Badge names in the feed → which medal to draw.
const BADGE_EMBLEM = {
  Cinephile: { emblem: "watched", tier: 3, metal: "#7FE0D6" },
  "Film Fan": { emblem: "watched", tier: 2, metal: "#E8B94E" },
  "Rising Critic": { emblem: "critic", tier: 1, metal: "#B9BBD2" },
};

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

// What happened, as a sentence with the important bits in bold.
const EventText = ({ event, styles }) => {
  const movie = event.movieId ? getMovieById(event.movieId) : null;
  const name = (
    <Text style={styles.strong}>{event.friend.name.split(" ")[0]}</Text>
  );
  const title = movie ? <Text style={styles.strong}>{movie.title}</Text> : null;
  switch (event.type) {
    case "tier":
      return (
        <Text style={styles.eventText}>
          {name} tiered {title}{" "}
          <Text
            style={[
              styles.tierLetter,
              { color: getTierInfo(event.tier).color },
            ]}
          >
            {event.tier}
          </Text>
        </Text>
      );
    case "watched":
      return (
        <Text style={styles.eventText}>
          {name} watched {title}
        </Text>
      );
    case "watchlist":
      return (
        <Text style={styles.eventText}>
          {name} saved {title} for later
        </Text>
      );
    case "badge":
      return (
        <Text style={styles.eventText}>
          {name} earned <Text style={styles.strong}>{event.badge}</Text>
        </Text>
      );
    case "set":
      return (
        <Text style={styles.eventText}>
          {name} finished every <Text style={styles.strong}>{event.set}</Text>{" "}
          movie
          <Text style={styles.muted}> · all {event.count}</Text>
        </Text>
      );
    default:
      return null;
  }
};

// The thing on the right of an event: the poster, the badge medal, or a
// gold box-set mark for a finished collection.
const EventVisual = ({ event, onOpenMovie, styles }) => {
  if (event.movieId) {
    const movie = getMovieById(event.movieId);
    return (
      <Pressable onPress={() => onOpenMovie(event.movieId)} hitSlop={4}>
        <MoviePoster uri={movie?.poster} style={styles.eventPoster} />
      </Pressable>
    );
  }
  if (event.type === "badge") {
    const look = BADGE_EMBLEM[event.badge] ?? {
      emblem: "watched",
      tier: 1,
      metal: "#B9BBD2",
    };
    return (
      <BadgeArt
        emblem={look.emblem}
        tier={look.tier}
        metal={look.metal}
        size={44}
      />
    );
  }
  if (event.type === "set") {
    return <BadgeArt emblem="marquee" tier={2} metal="#E8B94E" size={44} />;
  }
  return null;
};

// Activity (MOCK — see data/mockFriends): what your friends have been
// watching, tiering, saving and finishing, newest first, grouped by age.
// Tap an event for that friend's page, a poster for the movie.
export const ActivityScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const now = Date.now();
  const groups = groupByAge(
    getMockActivity(now).sort((a, b) => b.timestamp - a.timestamp),
    now,
  );
  const openMovie = (movieId) =>
    navigation.navigate("MovieDetails", { movieId });

  return (
    <View style={styles.container}>
      <StackHeader title="Activity" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Your friends */}
        <Pressable
          style={({ pressed }) => [
            styles.friendsStrip,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.navigate("Friends")}
        >
          <View style={styles.avatarStack}>
            {MOCK_FRIENDS.slice(0, AVATARS_SHOWN).map((friend, index) => (
              <FriendAvatar
                key={friend.id}
                friend={friend}
                size={34}
                style={index > 0 && styles.avatarOverlap}
              />
            ))}
          </View>
          <View style={styles.friendsText}>
            <Text style={styles.friendsTitle}>
              {MOCK_FRIENDS.length} friends
            </Text>
            <Text style={styles.friendsSubtitle}>
              Compare tiers · invite more
            </Text>
          </View>
          <Text style={styles.friendsLink}>See all</Text>
        </Pressable>

        {groups.map((group) => (
          <View key={group.key}>
            <Text style={styles.tagText}>{group.label}</Text>
            <View style={styles.feed}>
              {group.items.map((event, index) => (
                <Pressable
                  key={event.id}
                  style={({ pressed }) => [
                    styles.event,
                    index > 0 && styles.eventDivider,
                    pressed && styles.pressed,
                  ]}
                  onPress={() =>
                    navigation.navigate("FriendProfile", {
                      friendId: event.friendId,
                    })
                  }
                >
                  <FriendAvatar friend={event.friend} size={38} />
                  <View style={styles.eventBody}>
                    <EventText event={event} styles={styles} />
                    <Text style={styles.eventTime}>
                      {timeAgo(event.timestamp, now)}
                    </Text>
                  </View>
                  <EventVisual
                    event={event}
                    onOpenMovie={openMovie}
                    styles={styles}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footnote}>
          Activity is a preview: sample friends for now.
        </Text>
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
    pressed: {
      opacity: 0.8,
    },
    friendsStrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
    },
    avatarStack: {
      flexDirection: "row",
    },
    avatarOverlap: {
      marginLeft: -10,
    },
    friendsText: {
      flex: 1,
    },
    friendsTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    friendsSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    friendsLink: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    // Section caption, like Settings.
    tagText: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    // Edge to edge, square corners.
    feed: {
      backgroundColor: colors.card,
    },
    event: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
    },
    eventDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.background,
    },
    eventBody: {
      flex: 1,
    },
    eventText: {
      ...typography.body,
      fontSize: 14,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    strong: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    muted: {
      color: colors.textMuted,
    },
    tierLetter: {
      ...typography.hero,
      fontSize: 15,
    },
    eventTime: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    eventPoster: {
      width: 44,
      height: 66,
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.lg,
    },
  });

export default ActivityScreen;

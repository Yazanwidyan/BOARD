import { Pressable, StyleSheet, View } from "react-native";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { timeAgo } from "../utils/friends";
import { getTierInfo } from "../utils/tiers";
import { t } from "../i18n";
import { Text } from "./AppText";
import { BadgeArt } from "./BadgeArt";
import { FriendAvatar } from "./FriendAvatar";
import { MoviePoster } from "./MoviePoster";

// Badge names in the feed → which medal to draw.
const BADGE_EMBLEM = {
  "Front Row": { emblem: "watched", tier: 3, metal: "#7FE0D6" },
  "Season Pass": { emblem: "watched", tier: 2, metal: "#E8B94E" },
  "Rising Critic": { emblem: "critic", tier: 1, metal: "#B9BBD2" },
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
          {name} saved {title} {t("for later")}
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
          {name} {t("finished every")}{" "}
          <Text style={styles.strong}>{event.set}</Text> movie
          <Text style={styles.muted}>
            {" "}
            {t("· all")} {event.count}
          </Text>
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

// One row of a feed (Activity, a club's feed): who, what, when, and the
// poster or medal. `onPress` opens the person; without it the row is plain.
export const ActivityEvent = ({ event, now, divider, onPress, onOpenMovie }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.event,
        divider && styles.eventDivider,
        pressed && onPress && styles.pressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <FriendAvatar friend={event.friend} size={38} />
      <View style={styles.eventBody}>
        <EventText event={event} styles={styles} />
        <Text style={styles.eventTime}>{timeAgo(event.timestamp, now)}</Text>
      </View>
      <EventVisual event={event} onOpenMovie={onOpenMovie} styles={styles} />
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    pressed: {
      opacity: 0.8,
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
  });

export default ActivityEvent;

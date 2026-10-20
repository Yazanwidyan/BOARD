import { Crown } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { timeAgo } from "../utils/friends";
import { getTierInfo } from "../utils/tiers";
import { t } from "../i18n";
import { Text } from "./AppText";
import { FriendAvatar } from "./FriendAvatar";
import { MoviePoster } from "./MoviePoster";

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
    case "rank":
      return (
        <Text style={styles.eventText}>
          {name} {t("is now")} <Text style={styles.strong}>{t(event.rank)}</Text>
          <Text style={styles.muted}>
            {" · "}
            {t(event.track)}
          </Text>
        </Text>
      );
    // From before ranks: a badge, a finished collection.
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

// The thing on the right of an event: the poster, or a gold crown tile for
// a rank (or, from before ranks, a badge or a finished collection).
const EventVisual = ({ event, onOpenMovie, styles, colors }) => {
  if (event.movieId) {
    const movie = getMovieById(event.movieId);
    return (
      <Pressable onPress={() => onOpenMovie(event.movieId)} hitSlop={4}>
        <MoviePoster uri={movie?.poster} style={styles.eventPoster} />
      </Pressable>
    );
  }
  if (["rank", "badge", "set"].includes(event.type)) {
    return (
      <View style={styles.rankTile}>
        <Crown size={22} color={colors.rating} strokeWidth={2.1} />
      </View>
    );
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
      <EventVisual event={event} onOpenMovie={onOpenMovie} styles={styles} colors={colors} />
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
    rankTile: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.rating}29`,
    },
  });

export default ActivityEvent;

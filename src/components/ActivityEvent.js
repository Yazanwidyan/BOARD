import { Bookmark, Crown, Eye } from "lucide-react-native";
import { Fragment } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { timeAgo } from "../utils/friends";
import { getTierInfo } from "../utils/tiers";
import { t } from "../i18n";
import { Text } from "./AppText";
import { FriendAvatar } from "./FriendAvatar";
import { MoviePoster } from "./MoviePoster";

const AVATAR = 40;
const BADGE = 18;

// A translated sentence with its {placeholders} swapped for bold pieces —
// so word order follows the language, not the code.
const sentence = (template, parts) => {
  const text = t(template);
  const out = [];
  let last = 0;
  text.replace(/\{(\w+)\}/g, (match, key, offset) => {
    if (offset > last) out.push(text.slice(last, offset));
    out.push(<Fragment key={`${key}${offset}`}>{parts[key] ?? null}</Fragment>);
    last = offset + match.length;
    return match;
  });
  if (last < text.length) out.push(text.slice(last));
  return out;
};

// What happened, as a sentence with who and what in bold.
const EventText = ({ event, styles }) => {
  const movie = event.movieId ? getMovieById(event.movieId) : null;
  const strong = (text) => <Text style={styles.strong}>{text}</Text>;
  const parts = {
    name: strong(event.friend.name.split(" ")[0]),
    title: movie ? strong(movie.title) : null,
  };
  switch (event.type) {
    case "tier":
      return (
        <Text style={styles.eventText}>
          {sentence("{name} tiered {title} {tier}", {
            ...parts,
            tier: (
              <Text style={[styles.tierLetter, { color: getTierInfo(event.tier).color }]}>
                {event.tier}
              </Text>
            ),
          })}
        </Text>
      );
    case "watched":
      return <Text style={styles.eventText}>{sentence("{name} watched {title}", parts)}</Text>;
    case "watchlist":
      return (
        <Text style={styles.eventText}>
          {sentence("{name} saved {title} for later", parts)}
        </Text>
      );
    case "rank":
      return (
        <Text style={styles.eventText}>
          {sentence("{name} is now {rank}", { ...parts, rank: strong(t(event.rank)) })}
          <Text style={styles.muted}>{` · ${t(event.track)}`}</Text>
        </Text>
      );
    // From before ranks: a badge, a finished collection.
    case "badge":
      return (
        <Text style={styles.eventText}>
          {sentence("{name} earned {badge}", { ...parts, badge: strong(event.badge) })}
        </Text>
      );
    case "set":
      return (
        <Text style={styles.eventText}>
          {sentence("{name} finished every {set} movie", { ...parts, set: strong(event.set) })}
          <Text style={styles.muted}>{` · ${event.count}`}</Text>
        </Text>
      );
    default:
      return null;
  }
};

// The small mark on the avatar's corner saying what kind of thing it was:
// the tier letter, an eye, a bookmark, a crown.
const EventBadge = ({ event, styles, colors }) => {
  let content = null;
  if (event.type === "tier") {
    const info = getTierInfo(event.tier);
    return (
      <View style={[styles.badge, { backgroundColor: info.color }]}>
        <Text style={styles.badgeLetter}>{event.tier}</Text>
      </View>
    );
  }
  if (event.type === "watched") content = <Eye size={10} color={colors.success} strokeWidth={2.6} />;
  else if (event.type === "watchlist") content = <Bookmark size={10} color={colors.textPrimary} strokeWidth={2.6} />;
  else if (["rank", "badge", "set"].includes(event.type)) {
    content = <Crown size={10} color={colors.rating} strokeWidth={2.6} />;
  }
  return content ? <View style={styles.badge}>{content}</View> : null;
};

// The thing on the end of an event: the poster, or a slate crown tile for
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
        <Crown size={20} color={colors.rating} strokeWidth={2.1} />
      </View>
    );
  }
  return null;
};

// One row of the activity feed: who, what, when, and the
// poster or crown. `onPress` opens the person; without it the row is plain.
// `divider`: a line above it, for feeds not inside a SettingsGroup.
export const ActivityEvent = ({ event, now, divider, onPress, onOpenMovie }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.event,
        pressed && onPress && styles.pressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View>
        <FriendAvatar friend={event.friend} size={AVATAR} />
        <EventBadge event={event} styles={styles} colors={colors} />
      </View>
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
      backgroundColor: colors.cardElevated,
    },
    event: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 64,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
    },
    eventBody: {
      flex: 1,
      gap: 3,
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
      lineHeight: 19,
      color: colors.textPrimary,
    },
    muted: {
      color: colors.textMuted,
    },
    tierLetter: {
      ...typography.hero,
      fontSize: 15,
      lineHeight: 20,
    },
    eventTime: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
    },
    badge: {
      position: "absolute",
      end: -3,
      bottom: -3,
      width: BADGE,
      height: BADGE,
      borderRadius: BADGE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
      borderWidth: 2,
      borderColor: colors.card,
    },
    badgeLetter: {
      fontFamily: fonts.extraBold,
      fontSize: 11,
      lineHeight: 13,
      color: "#0C0C0C",
    },
    eventPoster: {
      width: 40,
      height: 60,
    },
    rankTile: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.rating}29`,
      borderRadius: shape.control,
    },
  });

export default ActivityEvent;

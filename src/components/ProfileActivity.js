import { Image, Pressable, StyleSheet, View } from "react-native";

import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getTier, getTierInfo } from "../utils/tiers";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const AVATAR = 28;

// How long ago, the short way: 16h, 3d, 2w, 5mo, 1y.
const shortAgo = (timestamp, now) => {
  const hours = Math.max(1, Math.floor((now - timestamp) / HOUR_MS));
  if (hours < 24) return t("{count}h", { count: hours });
  const days = Math.floor((now - timestamp) / DAY_MS);
  if (days < 14) return t("{count}d", { count: days });
  if (days < 60) return t("{count}w", { count: Math.round(days / 7) });
  if (days < 365) return t("{count}mo", { count: Math.round(days / 30) });
  return t("{count}y", { count: Math.round(days / 365) });
};

// Your activity, Letterboxd-style: what you've watched (with its poster and
// the tier you gave it) and what you've saved to your watchlist, newest
// first — each a full-width row with your avatar and how long ago.
// `watched`: { movieId, timestamp, tier|rating }; `bucketList`: { movieId,
// addedAt }. `name`: whose it is, for a friend's ("Sam watched"); `avatar`:
// their avatar, in place of `avatarSource`'s image.
export const ProfileActivity = ({
  watched,
  bucketList = [],
  avatarSource,
  avatar,
  name,
  onOpen,
  count = 20,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const now = Date.now();
  const events = [
    ...watched
      .filter((entry) => entry.timestamp)
      .map((entry) => ({ kind: "watched", movieId: entry.movieId, at: entry.timestamp, entry })),
    ...bucketList
      .filter((entry) => entry.addedAt)
      .map((entry) => ({ kind: "saved", movieId: entry.movieId, at: entry.addedAt })),
  ]
    .map((event) => ({ ...event, movie: getMovieById(event.movieId) }))
    .filter((event) => event.movie)
    .sort((a, b) => b.at - a.at)
    .slice(0, count);

  if (events.length === 0) {
    return (
      <Text style={styles.empty}>
        {name
          ? t("When {name} watches, tiers or saves a film, it shows here.", { name })
          : t("Watch or save a film and it shows up here.")}
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {events.map((event) => {
        const { movie } = event;
        const tier = event.kind === "watched" ? getTierInfo(getTier(event.entry)) : null;
        return (
          <Pressable
            key={`${event.kind}-${event.movieId}-${event.at}`}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => onOpen(movie.id)}
            accessibilityRole="button"
          >
            {avatar ?? <Image source={avatarSource} style={styles.avatar} />}
            <View style={styles.body}>
              {event.kind === "saved" ? (
                <Text style={styles.line}>
                  {name ? t("{name} added", { name }) : t("You added")}{" "}
                  <Text style={styles.strong}>{movie.title}</Text>{" "}
                  {name ? t("to their watchlist") : t("to your watchlist")}
                </Text>
              ) : (
                <>
                  <Text style={styles.line}>
                    {name ? t("{name} watched", { name }) : t("You watched")}
                  </Text>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={2}>
                      {movie.title}
                      {!!movie.year && <Text style={styles.year}> {movie.year}</Text>}
                    </Text>
                    {tier && (
                      <View style={[styles.tier, { backgroundColor: tier.color }]}>
                        <Text style={styles.tierText}>{tier.key}</Text>
                      </View>
                    )}
                  </View>
                  <MoviePoster uri={movie.poster} style={styles.poster} />
                </>
              )}
            </View>
            <Text style={styles.ago}>{shortAgo(event.at, now)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Full-width rows, a hairline of page between them.
    list: {
      gap: StyleSheet.hairlineWidth * 2,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm + 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: colors.card,
    },
    rowPressed: {
      backgroundColor: colors.cardElevated,
    },
    avatar: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      backgroundColor: colors.cardElevatedLight,
    },
    body: {
      flex: 1,
      gap: 4,
    },
    line: {
      ...typography.body,
      color: colors.textSecondary,
    },
    strong: {
      fontFamily: typography.bodyBold.fontFamily,
      color: colors.textPrimary,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    title: {
      ...typography.bodyBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    year: {
      ...typography.caption,
      color: colors.textMuted,
    },
    tier: {
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 5,
    },
    tierText: {
      ...typography.label,
      fontSize: 11,
      lineHeight: 14,
      color: "#0C1014",
    },
    poster: {
      width: 56,
      aspectRatio: 2 / 3,
      marginTop: 4,
    },
    ago: {
      ...typography.caption,
      color: colors.textMuted,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
    },
  });

export default ProfileActivity;

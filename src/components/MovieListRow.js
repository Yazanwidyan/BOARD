import { Bookmark, BookmarkCheck } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";
import { MoviePoster } from "./MoviePoster";
import { RatingBadge } from "./RatingBadge";

// Shared list-row (poster + title/meta/rating + a "+ Watchlist" pill) used
// anywhere movies are browsed as a vertical list — Explore's list sub-tabs
// and Search — instead of each screen re-implementing the same row.
export const MovieListRow = ({
  movie,
  onPress,
  inQueue = false,
  onToggleQueue,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <MoviePoster
        uri={movie.poster}
        radius={radius.sm}
        style={styles.poster}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {movie.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {movie.year} · {formatRuntime(movie.runtime)} · {movie.genres[0]}
        </Text>
        <RatingBadge rating={movie.rating} size="sm" />
      </View>
      {onToggleQueue && (
        <Pressable
          onPress={onToggleQueue}
          hitSlop={8}
          style={[styles.queueButton, inQueue && styles.queueButtonActive]}
        >
          {inQueue ? (
            <BookmarkCheck size={14} color={colors.textPrimary} />
          ) : (
            <Bookmark size={14} color={colors.textPrimary} />
          )}
          <Text style={styles.queueButtonText}>
            {inQueue ? "Watchlisted" : "Watchlist"}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    poster: {
      width: 48,
      aspectRatio: 2 / 3,
    },
    info: {
      flex: 1,
      marginLeft: spacing.md,
      gap: 4,
    },
    title: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    queueButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.sm,
      marginLeft: spacing.sm,
    },
    queueButtonActive: {
      backgroundColor: colors.surfaceSoft,
    },
    queueButtonText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textPrimary,
    },
  });

export default MovieListRow;

import { Bookmark, BookmarkCheck } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { toggleBucketListWithFeedback } from "../utils/achievementFeedback";
import { formatRuntime, isInBucketList } from "../utils/movieFilters";
import { getTier } from "../utils/tiers";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";
import { TierBadge } from "./TierBadge";

// What a film is, in a line: year · runtime · first genre.
export const filmMeta = (movie) =>
  [movie.year, movie.runtime ? formatRuntime(movie.runtime) : null, movie.genres?.[0] ? t(movie.genres[0]) : null]
    .filter(Boolean)
    .join(" · ");

// A film's own action, the same everywhere: your tier when you've seen it
// (dashed until you tier it), else a bookmark to save it.
export const FilmAction = ({ movie }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const entry = useMovieStore((state) => state.watched.find((item) => item.movieId === movie.id));
  const saved = useMovieStore((state) => isInBucketList(state.bucketList, movie.id));
  if (entry) return <TierBadge tier={getTier(entry)} size={28} />;
  return (
    <Pressable
      onPress={() => toggleBucketListWithFeedback(movie.id)}
      hitSlop={8}
      style={({ pressed }) => [styles.save, saved && styles.saveOn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={saved ? t("Watchlisted") : t("Watchlist")}
    >
      {saved ? (
        <BookmarkCheck size={17} color={colors.brandText} strokeWidth={2.2} />
      ) : (
        <Bookmark size={17} color={colors.textPrimary} strokeWidth={2} />
      )}
    </Pressable>
  );
};

// One film in a list (Search's results, a category's or a row's films):
// its poster, then its title, what it is and — `note` — why it's here,
// over a hairline (none under the `last`), then its action.
export const FilmRow = ({ movie, note, onPress, last = false }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={movie.title}
    >
      <MoviePoster uri={movie.poster} style={styles.poster} />
      <View style={[styles.words, !last && styles.rule]}>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {movie.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {filmMeta(movie)}
          </Text>
          {!!note && (
            <Text style={styles.note} numberOfLines={1}>
              {note}
            </Text>
          )}
        </View>
        <FilmAction movie={movie} />
      </View>
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    pressed: {
      opacity: 0.7,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingStart: spacing.md,
    },
    // Room above and below each poster, so no two touch.
    poster: {
      width: 44,
      height: 66,
      marginVertical: spacing.sm,
    },
    words: {
      flex: 1,
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginStart: spacing.md,
      paddingEnd: spacing.md,
    },
    rule: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    note: {
      ...typography.caption,
      color: colors.textMuted,
    },
    save: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
      borderRadius: shape.chip,
    },
    saveOn: {
      backgroundColor: colors.brand,
    },
  });

export default FilmRow;

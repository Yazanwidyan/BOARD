import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { getMovieById } from "../data/movies";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { TIERS, getTier } from "../utils/tiers";
import { t } from "../i18n";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

const POSTER_WIDTH = 64;

// A profile's tier list — a real tier-list maker: S → F rows edge to edge,
// the letter at the screen's edge, most recently watched first in each row.
// `entries`: watched entries ({ movieId, tier | rating, timestamp }).
// `onSeeUntiered` (yours) adds a link to the ones not tiered yet.
export const TierListRows = ({ entries, onOpen, onSeeUntiered }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const byRecent = [...entries].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  const rows = TIERS.map((tier) => ({
    ...tier,
    movies: byRecent
      .filter((entry) => getTier(entry) === tier.key)
      .map((entry) => getMovieById(entry.movieId))
      .filter(Boolean),
  }));
  const untiered = entries.filter((entry) => !getTier(entry)).length;

  return (
    <View style={styles.list}>
      {rows.map(({ key, meaning, color, movies }) => (
        <View key={key} style={styles.row}>
          <View style={[styles.letter, { backgroundColor: color }]}>
            <Text style={styles.letterText}>{key}</Text>
          </View>
          {movies.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.posters}
            >
              {movies.map((movie) => (
                <Pressable key={movie.id} onPress={() => onOpen(movie.id)} accessibilityLabel={movie.title}>
                  <MoviePoster uri={movie.poster} style={styles.poster} />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t(meaning)}</Text>
            </View>
          )}
        </View>
      ))}
      {onSeeUntiered && untiered > 0 && (
        <Pressable style={styles.untiered} onPress={onSeeUntiered}>
          <Text style={styles.untieredText}>
            {untiered === 1
              ? t("1 watched movie isn't tiered yet")
              : t("{untieredCount} watched movies aren't tiered yet", { untieredCount: untiered })}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Cancels the page's side padding: edge to edge, rows split by a thin
    // line of page colour.
    list: {
      marginHorizontal: -spacing.md,
      gap: 2,
    },
    row: {
      flexDirection: "row",
      minHeight: POSTER_WIDTH * 1.5,
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    letter: {
      width: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    letterText: {
      ...typography.hero,
      fontSize: 24,
      lineHeight: 28,
      color: colors.background,
    },
    posters: {
      gap: 2,
      padding: 4,
    },
    poster: {
      width: POSTER_WIDTH,
      height: POSTER_WIDTH * 1.5 - 8,
    },
    empty: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    untiered: {
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    untieredText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
  });

export default TierListRows;

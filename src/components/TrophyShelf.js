import { Pin, Trophy } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { t } from "../i18n";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

const COVER = 76;

// Finished collections — every film of a director, an actor or a
// franchise — as a small row of trophies on a profile. Pinned ones first.
// Nothing at all until there's one: it's an achievement, not a section to
// fill. Long-press (yours) pins one to the front. Laid out edge to edge:
// place it in a full-width container.
export const TrophyShelf = ({ collections, pinnedIds = [], onOpen, onLongPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  if (collections.length === 0) return null;
  const ordered = [...collections].sort((a, b) => {
    const pinA = pinnedIds.indexOf(a.id);
    const pinB = pinnedIds.indexOf(b.id);
    if (pinA !== -1 || pinB !== -1) return (pinA === -1 ? 99 : pinA) - (pinB === -1 ? 99 : pinB);
    return b.movieIds.length - a.movieIds.length;
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Trophy size={14} color={colors.rating} strokeWidth={2.2} />
        <Text style={styles.label}>
          {t("Finished · {count}", { count: collections.length })}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {ordered.map((collection) => {
          const movies = collection.movies;
          return (
            <Pressable
              key={collection.id}
              style={styles.item}
              onPress={() => onOpen(collection.id)}
              onLongPress={onLongPress ? () => onLongPress(collection) : undefined}
              delayLongPress={350}
              accessibilityLabel={collection.title}
            >
              <View style={styles.cover}>
                {[0, 1, 2, 3].map((index) => {
                  const movie = movies[index % Math.max(1, movies.length)];
                  return movie ? (
                    <MoviePoster key={index} uri={movie.poster} radius={0} style={styles.cell} />
                  ) : null;
                })}
                {pinnedIds.includes(collection.id) && (
                  <View style={styles.pin}>
                    <Pin size={9} color={colors.background} />
                  </View>
                )}
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {collection.title}
              </Text>
              <Text style={styles.meta}>{t("All {total}", { total: collection.movieIds.length })}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      marginTop: spacing.md,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    label: {
      ...typography.caption,
      color: colors.textMuted,
    },
    // Bleeds to the screen edges like the other rows.
    row: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    item: {
      width: COVER,
    },
    cover: {
      width: COVER,
      height: COVER,
      flexDirection: "row",
      flexWrap: "wrap",
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: `${colors.rating}AA`,
    },
    cell: {
      width: "50%",
      height: "50%",
    },
    pin: {
      position: "absolute",
      start: 3,
      top: 3,
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    title: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    meta: {
      ...typography.caption,
      fontSize: 11,
      color: colors.rating,
    },
  });

export default TrophyShelf;

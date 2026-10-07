import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";

const COLUMNS = 3;
const GAP = 2;

// An edge-to-edge poster grid with hairline gaps — the posters do all the
// work. items: [{ movie, watchCount? }]; a rewatch shows a small ×N.
export const PosterMosaic = ({ items, onPressMovie }) => {
  const { width } = useWindowDimensions();
  const colors = useColors();
  const styles = createStyles(colors);
  const tile = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <View style={styles.grid}>
      {items.map(({ movie, watchCount }) => (
        <Pressable
          key={movie.id}
          onPress={() => onPressMovie(movie)}
          style={({ pressed }) => [
            { width: tile, height: tile * 1.5 },
            pressed && styles.pressed,
          ]}
          accessibilityLabel={movie.title}
        >
          <MoviePoster uri={movie.poster} style={styles.poster} />
          {watchCount > 1 && (
            <View style={styles.rewatch}>
              <Text style={styles.rewatchText}>×{watchCount}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
};

// Mosaic split into sections with a header each — a month, a tier…
// groups: [{ key, label?, color?, items: [{ movie, watchCount }] }]
export const MosaicSections = ({ groups, onPressMovie }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View>
      {groups.map((group) => (
        <View key={group.key} style={styles.section}>
          {group.label && (
            <View style={styles.header}>
              <Text
                style={[styles.headerText, group.color && { color: group.color }]}
              >
                {group.label}
              </Text>
              <Text style={styles.headerCount}>{group.items.length}</Text>
            </View>
          )}
          <PosterMosaic items={group.items} onPressMovie={onPressMovie} />
        </View>
      ))}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GAP,
    },
    poster: {
      width: "100%",
      height: "100%",
    },
    pressed: {
      opacity: 0.7,
    },
    rewatch: {
      position: "absolute",
      right: 6,
      bottom: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: "rgba(2, 0, 2, 0.75)",
    },
    rewatchText: {
      ...typography.label,
      fontSize: 11,
      color: "#FFFFFF",
    },
    section: {
      marginBottom: spacing.lg,
    },
    header: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm + 2,
    },
    headerText: {
      ...typography.title,
      fontSize: 18,
      color: colors.textPrimary,
    },
    headerCount: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });

export default PosterMosaic;

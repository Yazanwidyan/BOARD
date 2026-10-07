import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Check } from "lucide-react-native";

import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";

const NUM_COLUMNS = 3;

// `showWatchedCheck` adds a green check on watched-but-unrated posters (a
// rated one already says "watched" via its rating badge) — for grids that
// mix watched and unwatched movies, like a collection.
export const MovieGrid = ({
  movies,
  onPressMovie,
  showWatchedCheck = false,
}) => {
  const { width } = useWindowDimensions();
  const colors = useColors();
  const styles = createStyles(colors);
  const watched = useMovieStore((state) => state.watched);
  const gap = spacing.md;
  const horizontalPadding = spacing.md;
  const cardWidth =
    (width - horizontalPadding * 2 - gap * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  return (
    <View style={[styles.grid, { paddingHorizontal: horizontalPadding, gap }]}>
      {movies.map((movie) => {
        const watchedEntry = watched.find(
          (entry) => entry.movieId === movie.id,
        );
        return (
          <Pressable
            key={movie.id}
            onPress={() => onPressMovie(movie)}
            style={({ pressed }) => [
              { width: cardWidth },
              pressed && styles.pressed,
            ]}
          >
            <View>
              <MoviePoster
                uri={movie.poster}
                shadow
                radius={0}
                style={{ width: cardWidth, aspectRatio: 2 / 3 }}
              />
              {showWatchedCheck && watchedEntry && (
                <View style={styles.watchedBadge}>
                  <Check
                    size={12}
                    color={colors.background}
                    strokeWidth={3.5}
                  />
                </View>
              )}
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {movie.title}
            </Text>
            <Text style={styles.year}>{movie.year}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    pressed: {
      opacity: 0.7,
    },
    title: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    year: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    watchedBadge: {
      position: "absolute",
      top: 6,
      left: 6,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.success,
    },
  });

export default MovieGrid;

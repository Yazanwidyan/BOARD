import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Check } from "lucide-react-native";

import { useMovieStore } from "../store/movieStore";
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
  // Edge to edge, 2px apart, posters only — like Profile's grids. Whole
  // pixels and an explicit height so wrapped rows never get clipped.
  const gap = 2;
  const cardWidth = Math.floor((width - gap * (NUM_COLUMNS - 1)) / NUM_COLUMNS);
  const cardSize = { width: cardWidth, height: cardWidth * 1.5 };

  return (
    <View style={[styles.grid, { gap }]}>
      {movies.map((movie) => {
        const watchedEntry = watched.find(
          (entry) => entry.movieId === movie.id,
        );
        return (
          <Pressable
            key={movie.id}
            onPress={() => onPressMovie(movie)}
            style={({ pressed }) => [cardSize, pressed && styles.pressed]}
            accessibilityLabel={movie.title}
          >
            <View>
              <MoviePoster uri={movie.poster} radius={0} style={cardSize} />
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
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.7,
    },
    watchedBadge: {
      position: "absolute",
      top: 6,
      start: 6,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.success,
    },
  });

export default MovieGrid;

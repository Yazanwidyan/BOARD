import { LayoutGrid } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";

// A board as a square 2 × 2 collage of its first four posters (the newest
// adds go to the end, so the cover stays put as the board grows). Fewer
// than four repeat; an empty board shows a quiet grid icon.
export const BoardCover = ({ movies, size }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const cell = size / 2;

  if (movies.length === 0) {
    return (
      <View style={[styles.cover, styles.empty, { width: size, height: size }]}>
        <LayoutGrid size={size / 4} color={colors.textMuted} strokeWidth={1.5} />
      </View>
    );
  }

  return (
    <View style={[styles.cover, { width: size, height: size }]}>
      {[0, 1, 2, 3].map((index) => (
        <MoviePoster
          key={index}
          uri={movies[index % movies.length]?.poster}
          style={{ width: cell, height: cell }}
        />
      ))}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    cover: {
      flexDirection: "row",
      flexWrap: "wrap",
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    empty: {
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default BoardCover;

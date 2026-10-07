import { StyleSheet, Text, View } from "react-native";

import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";

// A collection as a square poster collage (its first four posters, 2 × 2)
// with a slim progress bar along the bottom edge. Finished sets get a gold
// bar and a small "Complete" tag; untouched ones sit slightly dimmed.
export const CollectionCollage = ({ collection, watchedIds, size }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const movies = collection.movies;
  const seen = movies.filter((movie) => watchedIds.has(movie.id)).length;
  const progress = movies.length ? seen / movies.length : 0;
  const isComplete = progress === 1;
  const cell = size / 2;

  return (
    <View style={[styles.collage, { width: size, height: size }]}>
      {[0, 1, 2, 3].map((index) => (
        <MoviePoster
          key={index}
          uri={movies[index % movies.length]?.poster}
          style={[{ width: cell, height: cell }, progress === 0 && styles.dim]}
        />
      ))}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: isComplete ? colors.rating : colors.accentLight,
            },
          ]}
        />
      </View>
      {isComplete && (
        <View style={styles.completeTag}>
          <Text style={styles.completeText}>Complete</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    collage: {
      flexDirection: "row",
      flexWrap: "wrap",
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    dim: {
      opacity: 0.55,
    },
    track: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 4,
      backgroundColor: "rgba(2, 0, 2, 0.6)",
    },
    fill: {
      height: "100%",
    },
    completeTag: {
      position: "absolute",
      top: 6,
      left: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.rating,
    },
    completeText: {
      ...typography.label,
      fontSize: 10,
      color: "#16152A",
    },
  });

export default CollectionCollage;

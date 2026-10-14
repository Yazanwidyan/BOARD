import { useEffect } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { MoviePoster } from "./MoviePoster";

// Posters sit 2px apart everywhere in the app.
const WALL_GAP = 2;

// One slowly drifting column of the wall — alternate columns drift in
// opposite directions.
const WallColumn = ({ movies, index, width }) => {
  const offset = useSharedValue(0);
  const posterHeight = width * 1.5;
  const travel = posterHeight + WALL_GAP;
  // Reduce Motion: the poster wall stays still.
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    offset.value = withRepeat(
      withTiming(1, { duration: 18000 + index * 4000, easing: Easing.linear }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          (index % 2 === 0 ? -1 : 1) * travel * offset.value -
          (index % 2 === 0 ? 0 : travel),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.column, style]}>
      {movies.map((movie) => (
        <MoviePoster
          key={movie.id}
          uri={movie.poster}
          style={{ width, height: posterHeight }}
        />
      ))}
    </Animated.View>
  );
};

// The tilted, slowly drifting wall of posters behind the welcome screens
// (sign-in and onboarding). Fills its parent; draw a gradient over it.
export const PosterWall = ({ movies, columns = 3 }) => {
  const { width } = useWindowDimensions();
  const columnWidth = (width - WALL_GAP * (columns + 1)) / columns;
  const perColumn = Math.ceil(movies.length / columns);

  return (
    <Animated.View style={styles.wall} pointerEvents="none">
      {Array.from({ length: columns }, (_, index) => (
        <WallColumn
          key={index}
          index={index}
          width={columnWidth}
          movies={movies.slice(index * perColumn, (index + 1) * perColumn)}
        />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wall: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    gap: WALL_GAP,
    paddingHorizontal: WALL_GAP,
    transform: [{ rotate: "-6deg" }, { scale: 1.2 }],
  },
  column: {
    gap: WALL_GAP,
  },
});

export default PosterWall;

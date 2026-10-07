import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { spacing } from "../theme/spacing";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";

const NUM_COLUMNS = 3;
const GAP = spacing.md;
const LEDGE_HEIGHT = 7;

// The ledge a shelf's items stand on, and its soft shadow — shared by the
// watchlist shelves and the watched DVD shelves.
export const ShelfLedge = () => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <>
      <View style={styles.ledge} />
      <LinearGradient
        colors={["rgba(0, 0, 0, 0.45)", "rgba(0, 0, 0, 0)"]}
        style={styles.ledgeShadow}
        pointerEvents="none"
      />
    </>
  );
};

// The watchlist as a video-store wall: posters standing in rows of three
// on a shelf ledge with a soft shadow underneath. No text under the
// posters — they do the talking; tap one to open it.
export const PosterShelf = ({ movies, onPressMovie }) => {
  const { width } = useWindowDimensions();
  const colors = useColors();
  const styles = createStyles(colors);
  const posterWidth =
    (width - spacing.md * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const rows = [];
  for (let index = 0; index < movies.length; index += NUM_COLUMNS) {
    rows.push(movies.slice(index, index + NUM_COLUMNS));
  }

  return (
    <View>
      {rows.map((row) => (
        <View key={row[0].id} style={styles.shelf}>
          <View style={styles.posters}>
            {row.map((movie) => (
              <Pressable
                key={movie.id}
                onPress={() => onPressMovie(movie)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <MoviePoster
                  uri={movie.poster}
                  shadow
                  style={{ width: posterWidth, aspectRatio: 2 / 3 }}
                />
              </Pressable>
            ))}
          </View>
          <ShelfLedge />
        </View>
      ))}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    shelf: {
      marginBottom: spacing.lg,
    },
    posters: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: GAP,
      paddingHorizontal: spacing.md,
    },
    ledge: {
      height: LEDGE_HEIGHT,
      marginHorizontal: spacing.sm,
      borderRadius: 2,
      backgroundColor: colors.cardElevated,
      borderTopWidth: 1,
      borderTopColor: "rgba(255, 255, 255, 0.14)",
    },
    ledgeShadow: {
      height: 12,
      marginHorizontal: spacing.md,
    },
    pressed: {
      opacity: 0.7,
    },
  });

export default PosterShelf;

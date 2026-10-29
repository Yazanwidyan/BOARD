import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { MOVIES, getAllKnownMovies, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { fonts } from "../theme/typography";
import { ALL_GENRES, byWeightedRating } from "../utils/movieFilters";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

const COLUMNS = 2;
const TILE_HEIGHT = 104;
const SHOWN = 60;
// The poster tucked into each tile's corner.
const PEEK = 58;

// Each tile's colour, in turn — deep enough for white words.
const TILE_COLORS = ["#C2414B", "#3D7BC4", "#7C4FC0", "#2F9AA6", "#D07A2E", "#3F9B70", "#C0508A", "#5A6B8C"];

// The kinds of film you can browse, before you type: a few by length and
// era, then every genre — each the best-rated films that fit.
const CATEGORIES = [
  { key: "top", label: "Top rated", fits: () => true },
  { key: "short", label: "Under 2 hours", fits: (movie) => !!movie.runtime && movie.runtime <= 120 },
  { key: "new", label: "New releases", fits: (movie) => movie.year >= new Date().getFullYear() - 1 },
  { key: "classics", label: "Classics", fits: (movie) => movie.year > 0 && movie.year < 1980 },
  ...ALL_GENRES.map((genre) => ({ key: genre, label: genre, fits: (movie) => (movie.genres ?? []).includes(genre) })),
];

// Search's page before you type, as Apple Music's: the kinds of film as
// coloured tiles, two across, each with its best film's poster tucked into
// the corner — opening the full list (Browse).
export const BrowseTiles = ({ navigation }) => {
  useMoviesVersion();
  const { width } = useWindowDimensions();
  const tileWidth = (width - spacing.md * 2 - spacing.rail * (COLUMNS - 1)) / COLUMNS;
  const all = [...new Map([...MOVIES, ...getAllKnownMovies()].map((movie) => [movie.id, movie])).values()].filter(
    (movie) => !movie.partial,
  );

  const tiles = CATEGORIES.map((category, index) => ({
    ...category,
    color: TILE_COLORS[index % TILE_COLORS.length],
    movies: all.filter(category.fits).sort(byWeightedRating).slice(0, SHOWN),
  })).filter((tile) => tile.movies.length > 0);

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.key}
          style={({ pressed }) => [
            styles.tile,
            { width: tileWidth, backgroundColor: tile.color },
            pressed && styles.pressed,
          ]}
          onPress={() =>
            navigation.navigate("BrowseMovies", {
              title: t(tile.label),
              movieIds: tile.movies.map((movie) => movie.id),
            })
          }
          accessibilityRole="button"
        >
          <Text style={styles.label} numberOfLines={2}>
            {t(tile.label)}
          </Text>
          <View style={styles.peek} pointerEvents="none">
            <MoviePoster uri={tile.movies[0].poster} style={styles.peekPoster} />
          </View>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.rail,
    paddingHorizontal: spacing.md,
  },
  tile: {
    height: TILE_HEIGHT,
    padding: spacing.md,
    borderRadius: shape.poster,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    lineHeight: 21,
    color: "#FFFFFF",
    width: "62%",
  },
  // Tilted, half out of the tile's bottom-right corner.
  peek: {
    position: "absolute",
    end: -10,
    bottom: -18,
    transform: [{ rotate: "18deg" }],
  },
  peekPoster: {
    width: PEEK,
    height: PEEK * 1.5,
  },
});

export default BrowseTiles;

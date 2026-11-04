import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { MOVIES, getAllKnownMovies, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { fonts } from "../theme/typography";
import { ALL_GENRES, byWeightedRating } from "../utils/movieFilters";
import { Text } from "./AppText";
import { ArtworkEdge, MoviePoster } from "./MoviePoster";

const COLUMNS = 3;
const GAP = spacing.rail;
const SHOWN = 60;

// Each tile's colour, in turn — washed over the bottom of its poster, deep
// enough for white words.
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

// Search's page before you type, as Apple TV's: the kinds of film as tall
// tiles, three across — each a film's poster, framed as every poster is
// (components/MoviePoster), with the tile's colour washed up from the
// bottom and its name over it — opening the full list (Browse). No two
// tiles show the same poster.
export const BrowseTiles = ({ navigation }) => {
  useMoviesVersion();
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - spacing.md * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const all = [...new Map([...MOVIES, ...getAllKnownMovies()].map((movie) => [movie.id, movie])).values()].filter(
    (movie) => !movie.partial,
  );
  const used = new Set();
  const tiles = CATEGORIES.map((category, index) => {
    const movies = all.filter(category.fits).sort(byWeightedRating).slice(0, SHOWN);
    const cover = movies.find((movie) => movie.poster && !used.has(movie.id)) ?? movies[0];
    if (cover) used.add(cover.id);
    return { ...category, color: TILE_COLORS[index % TILE_COLORS.length], movies, cover };
  }).filter((tile) => tile.movies.length > 0);

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.key}
          style={({ pressed }) => [
            styles.tile,
            { width: tileWidth, height: Math.round(tileWidth * 1.5), backgroundColor: tile.color },
            pressed && styles.pressed,
          ]}
          onPress={() =>
            navigation.navigate("BrowseMovies", {
              title: t(tile.label),
              movieIds: tile.movies.map((movie) => movie.id),
            })
          }
          accessibilityRole="button"
          accessibilityLabel={t(tile.label)}
        >
          <MoviePoster uri={tile.cover?.poster} tile style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[`${tile.color}00`, `${tile.color}B3`, tile.color]}
            locations={[0.3, 0.68, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Text style={styles.label} numberOfLines={2}>
            {t(tile.label)}
          </Text>
          <ArtworkEdge />
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    paddingHorizontal: spacing.md,
  },
  tile: {
    justifyContent: "flex-end",
    padding: spacing.sm + 2,
    borderRadius: shape.poster,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    lineHeight: 20,
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default BrowseTiles;

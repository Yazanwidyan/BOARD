import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Star } from "lucide-react-native";

import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";

const NUM_COLUMNS = 3;

export const MovieGrid = ({ movies, onPressMovie }) => {
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
        const userRating = watched.find(
          (entry) => entry.movieId === movie.id,
        )?.rating;

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
                radius={radius.sm}
                style={{ width: cardWidth, aspectRatio: 2 / 3 }}
              />
              <View style={styles.imdbBadge}>
                <Star size={10} color={colors.rating} fill={colors.rating} />
                <Text style={styles.imdbBadgeText}>
                  {movie.rating.toFixed(1)}
                </Text>
              </View>
              {userRating != null && (
                <View style={styles.userRatingBadge}>
                  <Star
                    size={10}
                    color={colors.accentContrast}
                    fill={colors.accentContrast}
                  />
                  <Text style={styles.userRatingBadgeText}>
                    {userRating.toFixed(1)}
                  </Text>
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
    imdbBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: "rgba(2, 0, 2, 0.65)",
    },
    imdbBadgeText: {
      ...typography.label,
      fontSize: 10,
      color: colors.rating,
    },
    userRatingBadge: {
      position: "absolute",
      top: 6,
      left: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    userRatingBadgeText: {
      ...typography.label,
      fontSize: 10,
      color: colors.accentContrast,
    },
  });

export default MovieGrid;

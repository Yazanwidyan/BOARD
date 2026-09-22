import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MoviePoster } from './MoviePoster';
import { RatingBadge } from './RatingBadge';
import { useColors } from '../theme/useColors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

const NUM_COLUMNS = 3;

export const MovieGrid = ({ movies, onPressMovie }) => {
  const { width } = useWindowDimensions();
  const colors = useColors();
  const styles = createStyles(colors);
  const gap = spacing.md;
  const horizontalPadding = spacing.md;
  const cardWidth = (width - horizontalPadding * 2 - gap * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  return (
    <View style={[styles.grid, { paddingHorizontal: horizontalPadding, gap }]}>
      {movies.map((movie) => (
        <Pressable
          key={movie.id}
          onPress={() => onPressMovie(movie)}
          style={({ pressed }) => [
            { width: cardWidth },
            pressed && styles.pressed,
          ]}
        >
          <MoviePoster uri={movie.poster} shadow style={{ width: cardWidth, aspectRatio: 2 / 3 }} />
          <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.year}>{movie.year}</Text>
            <RatingBadge rating={movie.rating} size="sm" />
          </View>
        </Pressable>
      ))}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  year: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default MovieGrid;

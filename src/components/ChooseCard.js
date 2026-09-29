import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";
import { RatingBadge } from "./RatingBadge";

export const ChooseCard = ({
  movie,
  cardWidth,
  index,
  scrollX,
  snap,
  onPress,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);

  const cardStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * snap, index * snap, (index + 1) * snap];
    return {
      transform: [
        {
          scale: interpolate(
            scrollX.value,
            inputRange,
            [0.88, 1, 0.88],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        scrollX.value,
        inputRange,
        [0.5, 1, 0.5],
        Extrapolation.CLAMP,
      ),
    };
  });

  return (
    <Animated.View style={[styles.card, { width: cardWidth }, cardStyle]}>
      <Pressable onPress={onPress}>
        <MoviePoster
          uri={movie.poster}
          style={[styles.poster, { width: cardWidth }]}
          radius={radius.sm}
          shadow
        />
        <Text style={styles.title} numberOfLines={2}>
          {movie.title}
        </Text>
        <View style={styles.ratingRow}>
          <RatingBadge rating={movie.rating} />
        </View>
        <View style={styles.genreRow}>
          {movie.genres.slice(0, 3).map((genre) => (
            <View key={genre} style={styles.genrePill}>
              <Text style={styles.genreText}>{genre}</Text>
            </View>
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      alignItems: "center",
    },
    poster: {
      aspectRatio: 2 / 3,
    },
    title: {
      ...typography.subtitle,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.md,
    },
    ratingRow: {
      marginTop: spacing.xs,
      alignItems: "center",
    },
    genreRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    genrePill: {
      backgroundColor: colors.card,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: radius.sm,
    },
    genreText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

export default ChooseCard;

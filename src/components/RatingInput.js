import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { useColors } from '../theme/useColors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

const STAR_COUNT = 5;
const STAR_SIZE = 22;

// How much of star `index` (1-based) is filled for a given rating:
// 0 = empty, 0.5 = half, 1 = full.
const getStarFill = (rating, index) => {
  if (rating == null) return 0;
  return Math.max(0, Math.min(1, rating - (index - 1)));
};

const RatingStar = ({ fill }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.starWrap}>
      <Star size={STAR_SIZE} color={colors.textMuted} fill="transparent" strokeWidth={1.5} />
      {fill > 0 && (
        <View style={[styles.starClip, { width: fill === 1 ? STAR_SIZE : STAR_SIZE / 2 }]}>
          <Star size={STAR_SIZE} color={colors.textPrimary} fill={colors.textPrimary} strokeWidth={1.5} />
        </View>
      )}
    </View>
  );
};

export const RatingInput = ({ rating, onRate }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [rowWidth, setRowWidth] = useState(STAR_COUNT * STAR_SIZE);
  // Tracks the last value we actually committed, so a drag only calls
  // onRate when it crosses into a new half-star instead of on every pixel
  // of finger movement (which would hammer the store on every frame).
  const lastValue = useSharedValue(rating ?? 0);

  useEffect(() => {
    lastValue.value = rating ?? 0;
  }, [rating, lastValue]);

  const commit = (x) => {
    'worklet';
    const raw = (x / rowWidth) * STAR_COUNT;
    // No floor at half a star — sliding (or tapping) into the very start of
    // the row lands on 0, which clears the rating instead of just tapping a
    // dedicated reset button.
    const snapped = Math.min(STAR_COUNT, Math.max(0, Math.round(raw * 2) / 2));
    if (snapped === lastValue.value) return;
    lastValue.value = snapped;
    runOnJS(onRate)(snapped === 0 ? null : snapped);
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onUpdate((event) => {
      commit(event.x);
    })
    .onEnd((event) => {
      commit(event.x);
    });

  return (
    <View style={styles.row}>
      <GestureDetector gesture={pan}>
        <View
          style={styles.stars}
          onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
        >
          {Array.from({ length: STAR_COUNT }, (_, i) => i + 1).map((index) => (
            <RatingStar key={index} fill={getStarFill(rating, index)} />
          ))}
        </View>
      </GestureDetector>

      <Text style={styles.valueText}>{rating != null ? rating.toFixed(1) : '—'}</Text>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stars: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
  },
  starWrap: {
    width: STAR_SIZE,
    height: STAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: STAR_SIZE,
    overflow: 'hidden',
  },
  valueText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    minWidth: 26,
  },
});

export default RatingInput;

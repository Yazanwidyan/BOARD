import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '../theme/useColors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { PrimaryButton } from '../components/PrimaryButton';
import { useUserStore } from '../store/userStore';
import { useMovieStore } from '../store/movieStore';
import { useSessionStore } from '../store/sessionStore';
import { generateRecommendations } from '../services/recommendations';
import { DECADE_RANGES, RUNTIME_RANGES } from '../utils/movieFilters';

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama',
  'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller',
];
const DECADES = Object.keys(DECADE_RANGES);
const RUNTIMES = Object.keys(RUNTIME_RANGES);
const SWIPE_SIZE = 10;

const RATING_MIN = 7.0;
const RATING_MAX = 9.5;
const THUMB_SIZE = 24;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const xToValue = (x, trackWidth) => {
  'worklet';
  const ratio = trackWidth > 0 ? x / trackWidth : 0;
  const raw = RATING_MIN + ratio * (RATING_MAX - RATING_MIN);
  const snapped = Math.round(raw * 2) / 2;
  return Math.min(RATING_MAX, Math.max(RATING_MIN, snapped));
};

const valueToX = (value, trackWidth) => (
  ((value - RATING_MIN) / (RATING_MAX - RATING_MIN)) * trackWidth
);

const Chip = ({ label, selected, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
};

const RatingSlider = ({ value, onChangeEnd }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [trackWidth, setTrackWidth] = useState(0);
  const [displayValue, setDisplayValue] = useState(value);
  const thumbX = useSharedValue(0);

  const handleLayout = (event) => {
    const width = event.nativeEvent.layout.width - THUMB_SIZE;
    setTrackWidth(width);
    thumbX.value = valueToX(value, width);
  };

  const pan = Gesture.Pan()
    .onChange((event) => {
      thumbX.value = clamp(thumbX.value + event.changeX, 0, trackWidth);
      runOnJS(setDisplayValue)(xToValue(thumbX.value, trackWidth));
    })
    .onEnd(() => {
      const finalValue = xToValue(thumbX.value, trackWidth);
      thumbX.value = withTiming(valueToX(finalValue, trackWidth), { duration: 150 });
      runOnJS(setDisplayValue)(finalValue);
      runOnJS(onChangeEnd)(finalValue);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value + THUMB_SIZE / 2,
  }));

  return (
    <View>
      <View style={styles.sliderLabelRow}>
        <Text style={styles.sliderLabel}>Minimum rating</Text>
        <Text style={styles.sliderValue}>{displayValue.toFixed(1)}+</Text>
      </View>
      <View style={styles.track} onLayout={handleLayout}>
        <Animated.View style={[styles.trackFill, fillStyle]} />
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </GestureDetector>
      </View>
    </View>
  );
};

const FindingMoviesLoader = () => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingDots}>
        <View style={styles.loadingDot} />
        <View style={styles.loadingDot} />
        <View style={styles.loadingDot} />
      </View>
      <Text style={styles.loadingText}>Finding your movies...</Text>
    </View>
  );
};

export const PreferencesScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const preferences = useUserStore((state) => state.preferences);
  const setPreferences = useUserStore((state) => state.setPreferences);
  const startSession = useSessionStore((state) => state.startSession);
  const [isGenerating, setIsGenerating] = useState(false);
  const insets = useSafeAreaInsets();

  const toggleGenre = (genre) => {
    const isSelected = preferences.genres.includes(genre);
    const genres = isSelected
      ? preferences.genres.filter((item) => item !== genre)
      : [...preferences.genres, genre];
    setPreferences({ genres });
  };

  const handlePickMovies = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const { bucketList } = useMovieStore.getState();
      const movies = generateRecommendations(preferences, SWIPE_SIZE, bucketList);
      startSession(movies);
      navigation.replace('Swipe');
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What are you in the mood for?</Text>
        <Text style={styles.subtitle}>Everything here is optional.</Text>

        <Text style={styles.sectionLabel}>Genres</Text>
        <View style={styles.chipRow}>
          {GENRES.map((genre) => (
            <Chip
              key={genre}
              label={genre}
              selected={preferences.genres.includes(genre)}
              onPress={() => toggleGenre(genre)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <RatingSlider
            value={preferences.minRating}
            onChangeEnd={(minRating) => setPreferences({ minRating })}
          />
        </View>

        <Text style={styles.sectionLabel}>Decade</Text>
        <View style={styles.chipRow}>
          {DECADES.map((decade) => (
            <Chip
              key={decade}
              label={decade}
              selected={preferences.decade === decade}
              onPress={() => setPreferences({ decade })}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Runtime</Text>
        <View style={styles.chipRow}>
          {RUNTIMES.map((runtime) => (
            <Chip
              key={runtime}
              label={runtime}
              selected={preferences.runtime === runtime}
              onPress={() => setPreferences({ runtime })}
            />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        {isGenerating ? (
          <FindingMoviesLoader />
        ) : (
          <PrimaryButton label="Pick My Movies" onPress={handlePickMovies} />
        )}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  chipSelected: {
    backgroundColor: colors.textPrimary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // Opposite of `chipSelected`'s background (textPrimary), so this stays
  // legible whichever way textPrimary/background flip between themes.
  chipTextSelected: {
    color: colors.background,
  },
  section: {
    marginTop: spacing.xl,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sliderLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  sliderValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  track: {
    height: THUMB_SIZE,
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -2,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textPrimary,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.textPrimary,
  },
  footer: {
    padding: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textPrimary,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default PreferencesScreen;

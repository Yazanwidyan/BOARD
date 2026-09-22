import { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clapperboard } from 'lucide-react-native';
import { useColors } from '../theme/useColors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { PrimaryButton } from '../components/PrimaryButton';
import { useUserStore } from '../store/userStore';

const SLIDES = [
  { title: 'Stop scrolling.' },
  { title: 'Swipe through great movies.' },
  { title: 'Find something worth watching.' },
];

export const OnboardingScreen = () => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = Dimensions.get('window');
  const scrollRef = useRef(null);
  const [pageIndex, setPageIndex] = useState(0);
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);

  const goToSlide = (index) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setPageIndex(index);
  };

  const handleNext = () => {
    if (pageIndex < SLIDES.length - 1) {
      goToSlide(pageIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleScrollEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setPageIndex(index);
  };

  const isLastSlide = pageIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {!isLastSlide && (
        <Pressable style={styles.skip} onPress={completeOnboarding}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.scroll}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Clapperboard size={56} color={colors.textPrimary} strokeWidth={1.5} />
            <Text style={styles.title}>{slide.title}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, index) => (
            <View
              key={slide.title}
              style={[styles.dot, index === pageIndex && styles.dotActive]}
            />
          ))}
        </View>
        <PrimaryButton
          label={isLastSlide ? "Let's Go" : 'Next'}
          onPress={handleNext}
        />
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skip: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
    padding: spacing.sm,
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.hero,
    fontSize: 30,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.textPrimary,
    width: 20,
  },
});

export default OnboardingScreen;

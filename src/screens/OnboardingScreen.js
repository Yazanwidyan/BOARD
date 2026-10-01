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
import { CompassIcon, HomeIcon, LayersIcon } from '../components/icons/TabIcons';
import { RankGemIcon } from '../components/icons/RankGemIcon';
import { useColors } from '../theme/useColors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { PrimaryButton } from '../components/PrimaryButton';
import { useUserStore } from '../store/userStore';

// Four slides walk through BOARD's actual loop — discover, watch, build
// progress through collections and challenges, level up — instead of the
// old generic "swipe through movies" pitch. Rank is shown via the real
// RankGemIcon (its own multi-tone faceted color) rather than the flat
// single-color badge the other three slides use, since forcing it into a
// solid accent circle would just look like a broken version of the icon
// that already represents rank everywhere else in the app.
const SLIDES = [
  {
    key: 'welcome',
    Icon: HomeIcon,
    title: "Bored? Let's fix that.",
    subtitle: 'BOARD turns deciding what to watch into a game.',
  },
  {
    key: 'discover',
    Icon: CompassIcon,
    title: "Discover what's next.",
    subtitle:
      'Track everything you watch, rate it, and keep a running watchlist.',
  },
  {
    key: 'progress',
    Icon: LayersIcon,
    title: 'Turn watching into a game.',
    subtitle:
      'Unlock collections, complete challenges, and earn XP for every movie.',
  },
  {
    key: 'rank',
    isRank: true,
    title: 'Level up. Rank up.',
    subtitle: 'Climb from Rookie all the way to Master as you go.',
  },
];

const SlideIcon = ({ slide, colors, styles }) => {
  if (slide.isRank) {
    return (
      <View style={styles.iconGlow}>
        <View style={styles.iconBadgeNeutral}>
          <RankGemIcon size={56} color={colors.accent} />
        </View>
      </View>
    );
  }

  const { Icon } = slide;
  return (
    <View style={styles.iconGlow}>
      <View style={styles.iconBadge}>
        <Icon size={40} color={colors.accentContrast} />
      </View>
    </View>
  );
};

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
          <View key={slide.key} style={[styles.slide, { width }]}>
            <SlideIcon slide={slide} colors={colors} styles={styles} />
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, index) => (
            <View
              key={slide.key}
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

const ICON_BADGE_SIZE = 96;
const ICON_GLOW_SIZE = 148;

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
  iconGlow: {
    width: ICON_GLOW_SIZE,
    height: ICON_GLOW_SIZE,
    borderRadius: ICON_GLOW_SIZE / 2,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: ICON_BADGE_SIZE,
    height: ICON_BADGE_SIZE,
    borderRadius: ICON_BADGE_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeNeutral: {
    width: ICON_BADGE_SIZE,
    height: ICON_BADGE_SIZE,
    borderRadius: ICON_BADGE_SIZE / 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
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
    backgroundColor: colors.accent,
    width: 20,
  },
});

export default OnboardingScreen;

import * as Haptics from "expo-haptics";
import { CheckCircle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

import { BackButton } from "../components/BackButton";
import { BoardBIcon, CompassIcon, LayersIcon } from "../components/icons/TabIcons";
import { RankGemIcon } from "../components/icons/RankGemIcon";
import { PrimaryButton } from "../components/PrimaryButton";
import { useUserStore } from "../store/userStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
];

// Three slides walk through BOARD's actual loop — discover, build progress,
// level up — instead of a generic "swipe through movies" pitch. Rank is
// shown via the real RankGemIcon (its own multi-tone faceted color) rather
// than the flat single-color badge the other slides use, since forcing it
// into a solid accent circle would just look like a broken version of the
// icon that already represents rank everywhere else in the app.
const VALUE_SLIDES = [
  {
    key: "discover",
    Icon: CompassIcon,
    title: "Discover what's next.",
    subtitle: "Track everything you watch, rate it, and keep a running watchlist.",
  },
  {
    key: "progress",
    Icon: LayersIcon,
    title: "Turn watching into a game.",
    subtitle: "Unlock collections, complete challenges, and earn XP for every movie.",
  },
  {
    key: "rank",
    isRank: true,
    title: "Level up. Rank up.",
    subtitle: "Climb from Rookie all the way to Master as you go.",
  },
];

// Step 0 = hero, 1..N = value slides, then genres, then done — a fixed
// linear sequence rather than a plain carousel, so the one functional step
// (genres) feeds real preferences into the recommendation engine instead of
// onboarding being pure marketing with no lasting effect on the app.
const GENRES_STEP = VALUE_SLIDES.length + 1;
const DONE_STEP = GENRES_STEP + 1;
const TOTAL_STEPS = DONE_STEP + 1;

const ProgressBar = ({ step, styles }) => (
  <View style={styles.progressRow}>
    {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
      <View
        key={index}
        style={[
          styles.progressSegment,
          index <= step && styles.progressSegmentActive,
        ]}
      />
    ))}
  </View>
);

const HeroStep = ({ colors, styles }) => (
  <View style={styles.slide}>
    <View style={styles.heroGlow}>
      <BoardBIcon size={64} color={colors.accent} />
    </View>
    <Text style={styles.wordmark}>BOARD</Text>
    <Text style={styles.title}>Bored? Let&apos;s fix that.</Text>
    <Text style={styles.subtitle}>
      Discover movies, track what you watch, and turn movie night into a
      game.
    </Text>
  </View>
);

const SlideStep = ({ slide, colors, styles }) => (
  <View style={styles.slide}>
    <View style={styles.iconGlow}>
      <View style={slide.isRank ? styles.iconBadgeNeutral : styles.iconBadge}>
        {slide.isRank ? (
          <RankGemIcon size={56} color={colors.accent} />
        ) : (
          <slide.Icon size={40} color={colors.accentContrast} />
        )}
      </View>
    </View>
    <Text style={styles.title}>{slide.title}</Text>
    <Text style={styles.subtitle}>{slide.subtitle}</Text>
  </View>
);

const GenresStep = ({ selectedGenres, onToggle, styles }) => (
  <View style={styles.slide}>
    <Text style={styles.title}>What do you like to watch?</Text>
    <Text style={styles.subtitle}>
      Pick a few genres — we&apos;ll use this for your first recommendations.
    </Text>
    <View style={styles.chipRow}>
      {GENRES.map((genre) => {
        const selected = selectedGenres.includes(genre);
        return (
          <Pressable
            key={genre}
            onPress={() => onToggle(genre)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text
              style={[styles.chipText, selected && styles.chipTextSelected]}
            >
              {genre}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

const DoneStep = ({ selectedGenres, colors, styles }) => (
  <View style={styles.slide}>
    <View style={styles.iconGlow}>
      <View style={styles.iconBadge}>
        <CheckCircle size={40} color={colors.accentContrast} />
      </View>
    </View>
    <Text style={styles.title}>You&apos;re all set.</Text>
    <Text style={styles.subtitle}>
      {selectedGenres.length > 0
        ? "We'll start with these — fine-tune anytime in Settings."
        : "We'll show you a bit of everything to start."}
    </Text>
    {selectedGenres.length > 0 && (
      <View style={styles.recapRow}>
        {selectedGenres.map((genre) => (
          <View key={genre} style={styles.recapChip}>
            <Text style={styles.recapChipText}>{genre}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
);

export const OnboardingScreen = () => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [step, setStep] = useState(0);
  const preferences = useUserStore((state) => state.preferences);
  const setPreferences = useUserStore((state) => state.setPreferences);
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);

  const goToStep = (nextStep) => {
    Haptics.selectionAsync();
    setStep(nextStep);
  };

  const handleBack = () => goToStep(Math.max(0, step - 1));
  const handleSkip = () => goToStep(DONE_STEP);

  const handleNext = () => {
    if (step < DONE_STEP) {
      goToStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const toggleGenre = (genre) => {
    Haptics.selectionAsync();
    const isSelected = preferences.genres.includes(genre);
    const genres = isSelected
      ? preferences.genres.filter((item) => item !== genre)
      : [...preferences.genres, genre];
    setPreferences({ genres });
  };

  const buttonLabel =
    step === 0 ? "Get Started" : step === DONE_STEP ? "Let's Go" : "Continue";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <View style={styles.topBarSlot}>
          {step > 0 && <BackButton onPress={handleBack} size={36} />}
        </View>
        <ProgressBar step={step} styles={styles} />
        <View style={[styles.topBarSlot, styles.topBarSlotRight]}>
          {step > 0 && step < DONE_STEP && (
            <Pressable onPress={handleSkip} hitSlop={8}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Animated.View
        key={step}
        entering={FadeIn.duration(250)}
        style={styles.contentWrap}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && <HeroStep colors={colors} styles={styles} />}
          {step >= 1 && step <= VALUE_SLIDES.length && (
            <SlideStep
              slide={VALUE_SLIDES[step - 1]}
              colors={colors}
              styles={styles}
            />
          )}
          {step === GENRES_STEP && (
            <GenresStep
              selectedGenres={preferences.genres}
              onToggle={toggleGenre}
              styles={styles}
            />
          )}
          {step === DONE_STEP && (
            <DoneStep
              selectedGenres={preferences.genres}
              colors={colors}
              styles={styles}
            />
          )}
        </ScrollView>
      </Animated.View>

      <View style={styles.footer}>
        <PrimaryButton label={buttonLabel} onPress={handleNext} />
      </View>
    </SafeAreaView>
  );
};

const ICON_BADGE_SIZE = 96;
const ICON_GLOW_SIZE = 148;
const TOP_BAR_SLOT_WIDTH = 56;

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: spacing.sm,
    },
    topBarSlot: {
      width: TOP_BAR_SLOT_WIDTH,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    topBarSlotRight: {
      alignItems: "flex-end",
    },
    skipText: {
      ...typography.body,
      color: colors.textSecondary,
      padding: spacing.sm,
    },
    progressRow: {
      flex: 1,
      flexDirection: "row",
      gap: spacing.xs,
    },
    progressSegment: {
      flex: 1,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.border,
    },
    progressSegmentActive: {
      backgroundColor: colors.accent,
    },
    contentWrap: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
    },
    slide: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
    },
    heroGlow: {
      width: ICON_GLOW_SIZE,
      height: ICON_GLOW_SIZE,
      borderRadius: ICON_GLOW_SIZE / 2,
      backgroundColor: colors.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    wordmark: {
      ...typography.display,
      color: colors.textPrimary,
      textAlign: "center",
    },
    iconGlow: {
      width: ICON_GLOW_SIZE,
      height: ICON_GLOW_SIZE,
      borderRadius: ICON_GLOW_SIZE / 2,
      backgroundColor: colors.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    iconBadge: {
      width: ICON_BADGE_SIZE,
      height: ICON_BADGE_SIZE,
      borderRadius: ICON_BADGE_SIZE / 2,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBadgeNeutral: {
      width: ICON_BADGE_SIZE,
      height: ICON_BADGE_SIZE,
      borderRadius: ICON_BADGE_SIZE / 2,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      ...typography.hero,
      color: colors.textPrimary,
      textAlign: "center",
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      paddingHorizontal: spacing.md,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
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
    recapRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    recapChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.successSoft,
    },
    recapChipText: {
      ...typography.label,
      fontSize: 11,
      color: colors.success,
    },
    footer: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
  });

export default OnboardingScreen;

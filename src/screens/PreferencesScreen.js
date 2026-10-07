import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { StackHeader } from "../components/ScreenHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { MOVIES } from "../data/movies";
import { generateRecommendations } from "../services/recommendations";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { DEFAULT_PREFERENCES, useUserStore } from "../store/userStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  DECADE_RANGES,
  RUNTIME_RANGES,
  applyPreferenceFilters,
  bucketListIds,
} from "../utils/movieFilters";

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
const DECADES = Object.keys(DECADE_RANGES);
const RUNTIMES = Object.keys(RUNTIME_RANGES);
// Real IMDb scores (from OMDb) run roughly 5–9.3 across the catalog.
const RATINGS = [
  { label: "Any", value: null },
  { label: "7+", value: 7 },
  { label: "7.5+", value: 7.5 },
  { label: "8+", value: 8 },
  { label: "8.5+", value: 8.5 },
];
const SWIPE_SIZE = 10;

const Chip = ({ label, selected, onPress, styles }) => (
  <Pressable
    onPress={onPress}
    style={[styles.chip, selected && styles.chipSelected]}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label}
    </Text>
  </Pressable>
);

const Section = ({ title, hint, children, styles }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {!!hint && <Text style={styles.sectionHint}>{hint}</Text>}
    </View>
    <View style={styles.chipRow}>{children}</View>
  </View>
);

// Swipe setup — the filters before a swipe session. A dismissable screen
// (close + reset in its own header), a live count of how many unwatched
// movies match, and a footer that starts the session straight away.
export const PreferencesScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const preferences = useUserStore((state) => state.preferences);
  const setPreferences = useUserStore((state) => state.setPreferences);
  const resetPreferences = useUserStore((state) => state.resetPreferences);
  const watched = useMovieStore((state) => state.watched);
  const startSession = useSessionStore((state) => state.startSession);

  const watchedIds = watched.map((entry) => entry.movieId);
  const watchedSet = new Set(watchedIds);
  const matchCount = applyPreferenceFilters(
    MOVIES.filter((movie) => !watchedSet.has(movie.id)),
    preferences,
  ).length;
  const ratingValue = preferences.minRating ?? null;
  const isDefault =
    preferences.genres.length === 0 &&
    preferences.decade === "Any" &&
    preferences.runtime === "Any" &&
    ratingValue === DEFAULT_PREFERENCES.minRating;

  const toggleGenre = (genre) => {
    const isSelected = preferences.genres.includes(genre);
    setPreferences({
      genres: isSelected
        ? preferences.genres.filter((item) => item !== genre)
        : [...preferences.genres, genre],
    });
  };

  const handleStart = () => {
    const { bucketList } = useMovieStore.getState();
    const movies = generateRecommendations(
      preferences,
      SWIPE_SIZE,
      bucketListIds(bucketList),
      watchedIds,
    );
    startSession(movies);
    navigation.replace("Swipe");
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StackHeader
        title="Swipe setup"
        close
        onBack={() => navigation.goBack()}
        right={
          <Pressable
            onPress={resetPreferences}
            disabled={isDefault}
            hitSlop={8}
          >
            <Text style={[styles.resetText, isDefault && styles.resetDisabled]}>
              Reset
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What are you in the mood for?</Text>
        <Text style={styles.subtitle}>
          All optional. Your watchlist always gets a spot first.
        </Text>

        <Section
          title="Genres"
          hint={
            preferences.genres.length > 0
              ? `${preferences.genres.length} selected`
              : "Any"
          }
          styles={styles}
        >
          {GENRES.map((genre) => (
            <Chip
              key={genre}
              label={genre}
              selected={preferences.genres.includes(genre)}
              onPress={() => toggleGenre(genre)}
              styles={styles}
            />
          ))}
        </Section>

        <Section title="Rating" styles={styles}>
          {RATINGS.map(({ label, value }) => (
            <Chip
              key={label}
              label={label}
              selected={ratingValue === value}
              onPress={() => setPreferences({ minRating: value })}
              styles={styles}
            />
          ))}
        </Section>

        <Section title="Decade" styles={styles}>
          {DECADES.map((decade) => (
            <Chip
              key={decade}
              label={decade}
              selected={preferences.decade === decade}
              onPress={() => setPreferences({ decade })}
              styles={styles}
            />
          ))}
        </Section>

        <Section title="Runtime" styles={styles}>
          {RUNTIMES.map((runtime) => (
            <Chip
              key={runtime}
              label={runtime}
              selected={preferences.runtime === runtime}
              onPress={() => setPreferences({ runtime })}
              styles={styles}
            />
          ))}
        </Section>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}
      >
        <Text style={styles.matchText}>
          {matchCount === 0
            ? "Nothing matches exactly — we'll loosen things up a little."
            : matchCount < SWIPE_SIZE
              ? `${matchCount} movies match — we'll add a few close ones.`
              : `${matchCount} unwatched movies match`}
        </Text>
        <PrimaryButton label="Start swiping" onPress={handleStart} />
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    resetText: {
      ...typography.bodyBold,
      color: colors.accentLight,
    },
    resetDisabled: {
      color: colors.textMuted,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
    },
    title: {
      ...typography.hero,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    section: {
      marginTop: spacing.lg,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    sectionHint: {
      ...typography.caption,
      color: colors.textMuted,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    chipSelected: {
      backgroundColor: colors.selected,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    chipTextSelected: {
      color: colors.selectedText,
    },
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: spacing.sm,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    matchText: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
    },
  });

export default PreferencesScreen;

import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, Check, Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Confetti } from "../components/AchievementModal";
import { BackButton } from "../components/BackButton";
import { BoardBIcon } from "../components/icons/TabIcons";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { MOVIES } from "../data/movies";
import { generateRecommendations } from "../services/recommendations";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { useUserStore } from "../store/userStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  getCollectionProgress,
  getCollectionsForMovie,
} from "../utils/collections";
import { WATCH_XP } from "../utils/xp";

// "Play, don't tell": instead of slides explaining XP and collections,
// onboarding runs the app's core loop once — mark what you've seen, earn
// real XP for it, then pick something for tonight — so you land on a Home
// with actual content instead of empty states.
const STEP = { welcome: 0, name: 1, taste: 2, reward: 3, pick: 4 };
const STEP_COUNT = 5;

const TASTE_COUNT = 18;
const TASTE_COLUMNS = 3;
const PICK_COUNT = 3;
const WALL_COLUMNS = 3;
const WALL_PER_COLUMN = 6;
const TOP_GENRES = 3;

// Tap cycle on a taste poster: nothing → seen → want → nothing.
const NEXT_MARK = { undefined: "seen", seen: "want", want: undefined };

// Well-known movies the user doesn't already have — a new install is
// seeded with demo watch history (see seedDemoState), and offering movies
// that are already watched would make a "seen" tap un-watch them.
const pickTasteMovies = () => {
  const { watched, bucketList } = useMovieStore.getState();
  const known = new Set([
    ...watched.map((entry) => entry.movieId),
    ...bucketList.map((entry) => entry.movieId),
  ]);
  return [...MOVIES]
    .sort((a, b) => a.rank - b.rank)
    .filter((movie) => !known.has(movie.id))
    .slice(0, TASTE_COUNT);
};

// Most frequent genres across the movies the user marked — becomes their
// recommendation preferences, replacing the old genre-chip step.
const deriveGenres = (movies) => {
  const counts = new Map();
  movies.forEach((movie) =>
    movie.genres.forEach((genre) =>
      counts.set(genre, (counts.get(genre) ?? 0) + 1),
    ),
  );
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_GENRES)
    .map(([genre]) => genre);
};

const ProgressBar = ({ step, styles }) => (
  <View style={styles.progressRow}>
    {Array.from({ length: STEP_COUNT }).map((_, index) => (
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

// One slowly drifting column of the welcome screen's poster wall —
// alternate columns drift in opposite directions.
const WallColumn = ({ movies, index, width, styles }) => {
  const offset = useSharedValue(0);
  const posterHeight = width * 1.5;
  const travel = posterHeight + spacing.sm;

  useEffect(() => {
    offset.value = withRepeat(
      withTiming(1, { duration: 18000 + index * 4000, easing: Easing.linear }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          (index % 2 === 0 ? -1 : 1) * travel * offset.value -
          (index % 2 === 0 ? 0 : travel),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.wallColumn, style]}>
      {movies.map((movie) => (
        <MoviePoster
          key={movie.id}
          uri={movie.poster}
          radius={radius.sm}
          style={{ width, height: posterHeight }}
        />
      ))}
    </Animated.View>
  );
};

const WelcomeStep = ({ colors, styles }) => {
  const { width } = useWindowDimensions();
  const columnWidth = (width - spacing.sm * (WALL_COLUMNS + 1)) / WALL_COLUMNS;
  const wallMovies = MOVIES.slice(0, WALL_COLUMNS * WALL_PER_COLUMN);

  return (
    <View style={styles.welcome}>
      <View style={styles.wall} pointerEvents="none">
        {Array.from({ length: WALL_COLUMNS }, (_, index) => (
          <WallColumn
            key={index}
            index={index}
            width={columnWidth}
            styles={styles}
            movies={wallMovies.slice(
              index * WALL_PER_COLUMN,
              (index + 1) * WALL_PER_COLUMN,
            )}
          />
        ))}
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(2, 0, 2, 0.35)", colors.background]}
        locations={[0, 0.72]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.welcomeText}>
        <BoardBIcon size={56} color={colors.accent} />
        <Text style={styles.welcomeTitle}>Bored? Let&apos;s fix that.</Text>
        <Text style={styles.subtitle}>
          Mark what you&apos;ve seen, earn XP, and let BOARD pick what&apos;s
          next. Takes a minute.
        </Text>
      </View>
    </View>
  );
};

const NameStep = ({ name, onChangeName, onSubmit, colors, styles }) => (
  <View style={styles.step}>
    <Text style={styles.title}>What should we call you?</Text>
    <Text style={styles.subtitle}>
      It&apos;s how BOARD greets you, and it builds your handle.
    </Text>
    <TextInput
      value={name}
      onChangeText={onChangeName}
      onSubmitEditing={onSubmit}
      placeholder="Your name"
      placeholderTextColor={colors.textMuted}
      style={styles.nameInput}
      autoFocus
      autoCapitalize="words"
      autoCorrect={false}
      returnKeyType="next"
      maxLength={24}
    />
  </View>
);

const TasteStep = ({ movies, marks, onTap, styles, colors }) => {
  const { width } = useWindowDimensions();
  const tileWidth =
    (width - spacing.md * 2 - spacing.sm * (TASTE_COLUMNS - 1)) / TASTE_COLUMNS;
  const seenCount = Object.values(marks).filter((m) => m === "seen").length;
  const wantCount = Object.values(marks).filter((m) => m === "want").length;

  return (
    <View style={styles.step}>
      <Text style={styles.title}>What have you seen?</Text>
      <Text style={styles.subtitle}>
        Tap once for seen, twice to save it for later.
      </Text>
      <Text style={styles.tasteCounter}>
        <Text style={{ color: colors.success }}>{seenCount} seen</Text>
        {"  ·  "}
        <Text style={{ color: colors.accentLight }}>{wantCount} saved</Text>
      </Text>
      <View style={styles.tasteGrid}>
        {movies.map((movie) => {
          const mark = marks[movie.id];
          return (
            <Pressable
              key={movie.id}
              onPress={() => onTap(movie.id)}
              style={{ width: tileWidth }}
            >
              <View>
                <MoviePoster
                  uri={movie.poster}
                  radius={radius.sm}
                  style={[
                    { width: tileWidth, aspectRatio: 2 / 3 },
                    mark && styles.tastePosterMarked,
                  ]}
                />
                {mark && (
                  <View
                    style={[
                      styles.tasteOverlay,
                      {
                        borderColor:
                          mark === "seen" ? colors.success : colors.accentLight,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.tasteBadge,
                        {
                          backgroundColor:
                            mark === "seen" ? colors.success : colors.accent,
                        },
                      ]}
                    >
                      {mark === "seen" ? (
                        <Check
                          size={16}
                          color={colors.background}
                          strokeWidth={3.5}
                        />
                      ) : (
                        <Bookmark
                          size={14}
                          color={colors.accentContrast}
                          fill={colors.accentContrast}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>
              <Text style={styles.tasteTitle} numberOfLines={1}>
                {movie.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const RewardStep = ({ summary, colors, styles }) => (
  <View style={[styles.step, styles.centered]}>
    <View style={styles.rewardGlow}>
      <Sparkles size={44} color={colors.rating} />
    </View>
    <Text style={styles.title}>Nice taste.</Text>
    {summary.xp > 0 && <Text style={styles.rewardXP}>+{summary.xp} XP</Text>}
    <View style={styles.rewardRows}>
      {summary.seenCount > 0 && (
        <View style={styles.rewardRow}>
          <Text style={styles.rewardLabel}>
            {summary.seenCount} movie{summary.seenCount === 1 ? "" : "s"}{" "}
            watched
          </Text>
          <Text style={styles.rewardValue}>+{summary.xp}</Text>
        </View>
      )}
      {summary.wantCount > 0 && (
        <View style={styles.rewardRow}>
          <Text style={styles.rewardLabel}>Saved to your watchlist</Text>
          <Text style={styles.rewardMuted}>{summary.wantCount}</Text>
        </View>
      )}
      {summary.collections.map((collection) => (
        <View key={collection.id} style={styles.rewardRow}>
          <Text style={styles.rewardLabel} numberOfLines={1}>
            {collection.title}
          </Text>
          <Text style={styles.rewardMuted}>
            {collection.watchedCount}/{collection.total} started
          </Text>
        </View>
      ))}
    </View>
    <Text style={styles.rewardHint}>
      Every movie you watch earns XP. Finish collections and challenges for big
      boosts.
    </Text>
  </View>
);

const PickStep = ({ movies, selectedId, onSelect, styles, colors }) => {
  const { width } = useWindowDimensions();
  const cardWidth =
    (width - spacing.md * 2 - spacing.sm * (PICK_COUNT - 1)) / PICK_COUNT;

  return (
    <View style={styles.step}>
      <Text style={styles.title}>Pick one for tonight.</Text>
      <Text style={styles.subtitle}>
        Based on what you just told us. It&apos;ll be waiting on Home.
      </Text>
      <View style={styles.pickRow}>
        {movies.map((movie) => {
          const isSelected = movie.id === selectedId;
          return (
            <Pressable
              key={movie.id}
              onPress={() => onSelect(movie.id)}
              style={[styles.pickCard, { width: cardWidth }]}
            >
              <View>
                <MoviePoster
                  uri={movie.poster}
                  radius={radius.sm}
                  style={[
                    { width: cardWidth, aspectRatio: 2 / 3 },
                    selectedId && !isSelected && styles.pickPosterDimmed,
                  ]}
                />
                {isSelected && (
                  <View style={styles.pickSelectedRing}>
                    <View style={styles.pickCheck}>
                      <Check
                        size={16}
                        color={colors.accentContrast}
                        strokeWidth={3.5}
                      />
                    </View>
                  </View>
                )}
              </View>
              <Text style={styles.pickTitle} numberOfLines={2}>
                {movie.title}
              </Text>
              <Text style={styles.pickMeta}>
                {movie.year} · {movie.genres[0]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export const OnboardingScreen = () => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [step, setStep] = useState(STEP.welcome);
  const currentName = useProfileStore((state) => state.displayName);
  const setDisplayName = useProfileStore((state) => state.setDisplayName);
  const setPreferences = useUserStore((state) => state.setPreferences);
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);

  const [name, setName] = useState(currentName === "You" ? "" : currentName);
  const [tasteMovies] = useState(pickTasteMovies);
  const [marks, setMarks] = useState({});
  // Ids already written to the stores, so going Back and Continuing again
  // never toggles the same movie twice.
  const [appliedIds, setAppliedIds] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pickMovies, setPickMovies] = useState([]);
  const [selectedPickId, setSelectedPickId] = useState(null);

  const goToStep = (nextStep) => {
    Haptics.selectionAsync();
    setStep(nextStep);
  };

  const finish = () => completeOnboarding();

  const tapTaste = (movieId) => {
    if (appliedIds.includes(movieId)) return;
    Haptics.selectionAsync();
    setMarks((current) => {
      const next = NEXT_MARK[current[movieId]];
      const updated = { ...current };
      if (next) updated[movieId] = next;
      else delete updated[movieId];
      return updated;
    });
  };

  // Writes the taste picks into the real stores (watched / watchlist),
  // derives genre preferences from them, and prepares the reward summary
  // and tonight's recommendations.
  const applyTaste = () => {
    const { toggleWatched, toggleBucketList } = useMovieStore.getState();
    const newSeen = [];
    const newWant = [];
    Object.entries(marks).forEach(([movieId, mark]) => {
      if (appliedIds.includes(movieId)) return;
      if (mark === "seen") {
        toggleWatched(movieId);
        newSeen.push(movieId);
      } else if (mark === "want") {
        toggleBucketList(movieId);
        newWant.push(movieId);
      }
    });
    setAppliedIds((current) => [...current, ...newSeen, ...newWant]);

    const markedMovies = tasteMovies.filter((movie) => marks[movie.id]);
    const genres = deriveGenres(markedMovies);
    if (genres.length > 0) setPreferences({ genres });

    const { watched } = useMovieStore.getState();
    const watchedIds = new Set(watched.map((entry) => entry.movieId));
    const seenTotal = markedMovies.filter((m) => marks[m.id] === "seen");
    const wantIds = markedMovies
      .filter((m) => marks[m.id] === "want")
      .map((m) => m.id);

    const startedCollections = new Map();
    seenTotal.forEach((movie) =>
      getCollectionsForMovie(movie.id)
        .filter((collection) => collection.type !== "genre")
        .forEach((collection) => {
          const { watchedCount, total } = getCollectionProgress(
            collection,
            watchedIds,
          );
          startedCollections.set(collection.id, {
            id: collection.id,
            title: collection.title,
            watchedCount,
            total,
          });
        }),
    );

    setSummary({
      seenCount: seenTotal.length,
      wantCount: wantIds.length,
      xp: seenTotal.length * WATCH_XP,
      collections: [...startedCollections.values()].slice(0, 3),
    });

    const preferences = useUserStore.getState().preferences;
    const recommendations = generateRecommendations(
      preferences,
      PICK_COUNT + 6,
      wantIds,
    )
      .filter((movie) => !watchedIds.has(movie.id))
      .slice(0, PICK_COUNT);
    setPickMovies(recommendations);
    setSelectedPickId(null);

    return seenTotal.length + wantIds.length > 0;
  };

  const handleNext = () => {
    if (step === STEP.welcome) return goToStep(STEP.name);
    if (step === STEP.name) {
      if (name.trim()) setDisplayName(name.trim());
      return goToStep(STEP.taste);
    }
    if (step === STEP.taste) {
      const markedAnything = applyTaste();
      if (markedAnything) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return goToStep(STEP.reward);
      }
      return goToStep(STEP.pick);
    }
    if (step === STEP.reward) return goToStep(STEP.pick);
    if (step === STEP.pick) {
      if (selectedPickId) {
        const { pickedMovie, togglePickedMovie } = useMovieStore.getState();
        if (pickedMovie !== selectedPickId) togglePickedMovie(selectedPickId);
      }
      return finish();
    }
  };

  const handleBack = () => {
    if (step === STEP.pick && !summary?.seenCount && !summary?.wantCount) {
      return goToStep(STEP.taste);
    }
    goToStep(Math.max(0, step - 1));
  };

  const markedCount = Object.keys(marks).length;
  const buttonLabel = {
    [STEP.welcome]: "Get Started",
    [STEP.name]: name.trim() ? "Continue" : "Skip for now",
    [STEP.taste]: markedCount > 0 ? "Continue" : "I'll do this later",
    [STEP.reward]: "Continue",
    [STEP.pick]: selectedPickId ? "Set as Tonight's Pick" : "Maybe later",
  }[step];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {step === STEP.welcome ? (
        <WelcomeStep colors={colors} styles={styles} />
      ) : (
        <>
          <View style={styles.topBar}>
            <View style={styles.topBarSlot}>
              <BackButton onPress={handleBack} size={36} />
            </View>
            <ProgressBar step={step} styles={styles} />
            <View style={[styles.topBarSlot, styles.topBarSlotRight]}>
              {step !== STEP.pick && (
                <Pressable onPress={finish} hitSlop={8}>
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
              keyboardShouldPersistTaps="handled"
            >
              {step === STEP.name && (
                <NameStep
                  name={name}
                  onChangeName={setName}
                  onSubmit={handleNext}
                  colors={colors}
                  styles={styles}
                />
              )}
              {step === STEP.taste && (
                <TasteStep
                  movies={tasteMovies}
                  marks={marks}
                  onTap={tapTaste}
                  styles={styles}
                  colors={colors}
                />
              )}
              {step === STEP.reward && summary && (
                <RewardStep summary={summary} colors={colors} styles={styles} />
              )}
              {step === STEP.pick && (
                <PickStep
                  movies={pickMovies}
                  selectedId={selectedPickId}
                  onSelect={(id) => {
                    Haptics.selectionAsync();
                    setSelectedPickId((current) =>
                      current === id ? null : id,
                    );
                  }}
                  styles={styles}
                  colors={colors}
                />
              )}
            </ScrollView>
          </Animated.View>

          {step === STEP.reward && (
            <Confetti
              palette={[
                colors.accent,
                colors.accentLight,
                colors.rating,
                colors.success,
                colors.danger,
              ]}
            />
          )}
        </>
      )}

      <View style={styles.footer}>
        <PrimaryButton
          label={buttonLabel}
          variant={
            (step === STEP.taste && markedCount === 0) ||
            (step === STEP.pick && !selectedPickId) ||
            (step === STEP.name && !name.trim())
              ? "secondary"
              : "primary"
          }
          onPress={handleNext}
        />
      </View>
    </SafeAreaView>
  );
};

const TOP_BAR_SLOT_WIDTH = 56;
const REWARD_GLOW_SIZE = 104;

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
    },
    progressRow: {
      flex: 1,
      flexDirection: "row",
      gap: 6,
    },
    progressSegment: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceSoft,
    },
    progressSegmentActive: {
      backgroundColor: colors.accent,
    },
    contentWrap: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    step: {
      flex: 1,
    },
    centered: {
      alignItems: "center",
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      lineHeight: 21,
    },
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },

    // Welcome
    welcome: {
      flex: 1,
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    wall: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      transform: [{ rotate: "-6deg" }, { scale: 1.2 }],
    },
    wallColumn: {
      gap: spacing.sm,
    },
    welcomeText: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    welcomeTitle: {
      ...typography.display,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },

    // Name
    nameInput: {
      ...typography.title,
      marginTop: spacing.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
      color: colors.textPrimary,
    },

    // Taste
    tasteCounter: {
      ...typography.label,
      marginTop: spacing.md,
      color: colors.textSecondary,
    },
    tasteGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    tastePosterMarked: {
      opacity: 0.55,
    },
    tasteOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderWidth: 3,
      alignItems: "center",
      justifyContent: "center",
    },
    tasteBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    tasteTitle: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },

    // Reward
    rewardGlow: {
      width: REWARD_GLOW_SIZE,
      height: REWARD_GLOW_SIZE,
      borderRadius: REWARD_GLOW_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.rating}24`,
      borderWidth: 1,
      borderColor: `${colors.rating}55`,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    rewardXP: {
      ...typography.display,
      color: colors.rating,
      marginTop: spacing.xs,
    },
    rewardRows: {
      alignSelf: "stretch",
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceSoft,
    },
    rewardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rewardLabel: {
      ...typography.bodyBold,
      flex: 1,
      color: colors.textPrimary,
    },
    rewardValue: {
      ...typography.bodyBold,
      color: colors.success,
    },
    rewardMuted: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    rewardHint: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
    },

    // Pick
    pickRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.xl,
    },
    pickCard: {
      gap: 2,
    },
    pickPosterDimmed: {
      opacity: 0.4,
    },
    pickSelectedRing: {
      ...StyleSheet.absoluteFillObject,
      borderWidth: 3,
      borderColor: colors.accent,
      alignItems: "flex-end",
      padding: 6,
    },
    pickCheck: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    pickTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    pickMeta: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
  });

export default OnboardingScreen;

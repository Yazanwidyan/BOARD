import * as Haptics from "expo-haptics";
import { Check, ChevronLeft, Heart } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../components/AppText";
import Animated, { Easing, FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Confetti } from "../components/AchievementModal";
import { MoviePoster } from "../components/MoviePoster";
import { TasteDnaBars } from "../components/TasteDnaBars";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { logEvent } from "../services/events";
import { askForReminders } from "../services/notifications";
import { useMovieStore } from "../store/movieStore";
import { useUserStore } from "../store/userStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { pickMoreMovies, pickSpreadMovies } from "../utils/onboardingTaste";
import { matchWord } from "../utils/tasteWords";
import { buildMyTasteModel, getTastePicks } from "../utils/tasteEngine";
import { t, useIsRTL } from "../i18n";

// Three short steps, after the welcome has said what ReelBoard is for —
// about a minute, and real signals for the taste engine:
//
//   seen        a poster grid spread across every kind of taste: tap a
//               film you've seen (✓, watched), then its ♥ if you loved
//               it (tiered S); "Show more" brings films like the ones
//               you've picked
//   your taste  a first read, not a verdict: the films you loved and your
//               taste in one plain sentence ("It gets sharper with every
//               film you tier") — your name asked for here only when the
//               account doesn't have one yet — and the collections those
//               films already started. Skipped when you picked nothing.
//   tonight     three picks from the taste engine, with reasons
//
// A slim top bar: back (from the second step on), how far along you are,
// and Skip (straight to the app). One big button at the bottom moves on.
const STEP = { seen: 1, dna: 2, pick: 3 };
// Your first read: how many of the films you loved it shows.
const LOVED_SHOWN = 4;
const STEP_COUNT = 3;

const GRID_FIRST = 15;
const GRID_MORE = 9;
const GRID_MAX = 60;
const GRID_COLUMNS = 3;
const GRID_GAP = 10;
const PICK_COUNT = 3;

// The bottom button: red to go on, grey to skip a step.
const FooterButton = ({ label, primary, onPress, styles }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.footerButton,
      primary ? styles.footerPrimary : styles.footerQuiet,
      pressed && styles.pressed,
    ]}
    accessibilityRole="button"
  >
    <Text style={[styles.footerText, primary ? styles.footerPrimaryText : styles.footerQuietText]}>
      {label}
    </Text>
  </Pressable>
);

// Back, a segment per step (the done ones and the open one lit, in red),
// and Skip.
const TopBar = ({ step, onBack, onSkip, styles, colors }) => {
  const rtl = useIsRTL();
  return (
    <View style={styles.topBar}>
      <View style={styles.topSide}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Back")}>
            <ChevronLeft size={26} color={colors.textPrimary} strokeWidth={2} style={rtl && styles.flipped} />
          </Pressable>
        )}
      </View>
      <View style={styles.progress} accessibilityLabel={t("{current} of {total}", { current: step, total: STEP_COUNT })}>
        {Array.from({ length: STEP_COUNT }, (_, index) => (
          <View key={index} style={[styles.progressStep, index < step && styles.progressStepOn]} />
        ))}
      </View>
      <Pressable onPress={onSkip} hitSlop={10} style={styles.skip} accessibilityRole="button">
        <Text style={styles.skipText}>{t("Skip")}</Text>
      </Pressable>
    </View>
  );
};

// A step's heading: big and bold, then a quiet line.
const Heading = ({ title, subtitle, styles }) => (
  <>
    <Text style={styles.title}>{title}</Text>
    {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </>
);

// ---------- What have you seen? ----------
// A film in the grid: its poster — ringed in red with a ✓ once seen, and
// then a ♥ to say you loved it.
const GridPoster = ({ movie, mark, width, onTap, onLove, styles, colors }) => (
  <Pressable
    onPress={onTap}
    style={({ pressed }) => [{ width }, pressed && styles.pressed]}
    accessibilityRole="button"
    accessibilityLabel={movie.title}
    accessibilityState={{ selected: !!mark }}
  >
    <View>
      <MoviePoster uri={movie.poster} style={[{ width, height: width * 1.5 }, !mark && styles.posterIdle]} />
      {!!mark && <View pointerEvents="none" style={styles.posterRing} />}
      {!!mark && (
        <Animated.View entering={ZoomIn.duration(160)} style={styles.seenBadge}>
          <Check size={13} color={colors.brandText} strokeWidth={3} />
        </Animated.View>
      )}
      {!!mark && (
        <Pressable
          onPress={onLove}
          hitSlop={8}
          style={[styles.loveButton, mark === "loved" && styles.loveButtonOn]}
          accessibilityRole="button"
          accessibilityLabel={t("Loved it")}
          accessibilityState={{ selected: mark === "loved" }}
        >
          <Heart
            size={15}
            color={mark === "loved" ? colors.brandText : colors.textPrimary}
            fill={mark === "loved" ? colors.brandText : "transparent"}
            strokeWidth={2.2}
          />
        </Pressable>
      )}
    </View>
    <Text style={[styles.gridTitle, !!mark && styles.gridTitleOn]} numberOfLines={1}>
      {movie.title}
    </Text>
  </Pressable>
);

const SeenStep = ({ movies, marks, onTap, onLove, onMore, canMore, styles, colors }) => {
  const { width } = useWindowDimensions();
  const posterWidth = Math.floor((width - spacing.md * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
  return (
    <View style={styles.step}>
      <Heading
        title={t("What have you seen?")}
        subtitle={t("Tap the ones you've seen. Tap ♥ on films you loved — they go straight into your S tier.")}
        styles={styles}
      />
      <View style={styles.grid}>
        {movies.map((movie) => (
          <Animated.View key={movie.id} entering={FadeIn.duration(280)}>
            <GridPoster
              movie={movie}
              mark={marks[movie.id]}
              width={posterWidth}
              onTap={() => onTap(movie)}
              onLove={() => onLove(movie)}
              styles={styles}
              colors={colors}
            />
          </Animated.View>
        ))}
      </View>
      {canMore && (
        <Pressable onPress={onMore} style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={styles.moreButtonText}>{t("Show more like these")}</Text>
        </Pressable>
      )}
    </View>
  );
};

// ---------- Your taste ----------
const DnaStep = ({ fingerprint, seenCount, lovedMovies, styles }) => (
  <View style={styles.step}>
    {/* A first read, not a verdict: what you loved, and one plain
        sentence — it sharpens as you tier. */}
    <Heading title={t("Your taste so far.")} subtitle={t("It gets sharper with every film you tier.")} styles={styles} />
    <Animated.View entering={FadeInDown.duration(400).easing(Easing.out(Easing.cubic))}>
      <View style={styles.dnaCard}>
        {lovedMovies.length > 0 && (
          <>
            <Text style={styles.dnaEyebrow}>{t("You loved")}</Text>
            <View style={styles.lovedRow}>
              {lovedMovies.slice(0, LOVED_SHOWN).map((movie) => (
                <MoviePoster key={movie.id} uri={movie.poster} style={styles.lovedPoster} />
              ))}
            </View>
          </>
        )}
        <View style={styles.dnaBars}>
          <TasteDnaBars fingerprint={fingerprint} />
        </View>
        <Text style={styles.dnaXPDetail}>{t("Based on {count} films", { count: seenCount })}</Text>
      </View>
    </Animated.View>
  </View>
);

// ---------- Tonight ----------
// The best pick big, as a poster card; the other two under it.
// `coldStart`: nothing marked seen — the picks are just popular, and say so.
const PickStep = ({ picks, selectedId, onSelect, coldStart, styles, colors }) => {
  const { width } = useWindowDimensions();
  const [lead, ...rest] = picks;
  const leadWidth = Math.round(width * 0.46);
  return (
    <View style={styles.step}>
      <Heading title={t("Pick one for tonight.")} subtitle={t("Chosen for your taste. It'll be waiting on Home.")} styles={styles} />
      {lead && (
        <Animated.View entering={FadeInDown.duration(320).easing(Easing.out(Easing.cubic))}>
          <Pressable
            onPress={() => onSelect(lead.movie.id)}
            style={({ pressed }) => [styles.leadPick, selectedId === lead.movie.id && styles.pickOn, pressed && styles.pressed]}
            accessibilityState={{ selected: selectedId === lead.movie.id }}
          >
            <MoviePoster uri={lead.movie.poster} style={{ width: leadWidth, height: leadWidth * 1.5 }} />
            <Text style={styles.leadTitle} numberOfLines={2}>
              {lead.movie.title}
            </Text>
            <Text style={styles.pickMeta}>
              {[lead.movie.year, coldStart ? null : matchWord(lead.match)].filter(Boolean).join(" · ")}
            </Text>
            {(coldStart || !!lead.reasons[0]) && (
              <Text style={styles.leadReason} numberOfLines={2}>
                {coldStart ? t("Popular right now. Tier one to make it yours.") : lead.reasons[0]}
              </Text>
            )}
            {selectedId === lead.movie.id && (
              <View style={styles.pickCheck}>
                <Check size={16} color={colors.brandText} strokeWidth={3.2} />
              </View>
            )}
          </Pressable>
        </Animated.View>
      )}
      <View style={styles.pickList}>
        {rest.map((pick, index) => {
          const isSelected = pick.movie.id === selectedId;
          return (
            <Animated.View
              key={pick.movie.id}
              entering={FadeInDown.duration(300).easing(Easing.out(Easing.cubic)).delay((index + 1) * 80)}
            >
              <Pressable
                onPress={() => onSelect(pick.movie.id)}
                style={({ pressed }) => [styles.pickRow, isSelected && styles.pickOn, pressed && styles.pressed]}
                accessibilityState={{ selected: isSelected }}
              >
                <MoviePoster uri={pick.movie.poster} style={styles.pickPoster} />
                <View style={styles.pickText}>
                  <Text style={styles.pickTitle} numberOfLines={2}>
                    {pick.movie.title}
                  </Text>
                  <Text style={styles.pickMeta}>
                    {[pick.movie.year, coldStart ? null : matchWord(pick.match)].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.pickCheck, styles.pickCheckInline]}>
                    <Check size={16} color={colors.brandText} strokeWidth={3.2} />
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

export const OnboardingScreen = () => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const [step, setStep] = useState(STEP.seen);
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);

  // Films already in the stores (a replay) aren't offered, or a "seen" tap
  // would un-watch them.
  const knownIds = () => {
    const { watched, bucketList } = useMovieStore.getState();
    return new Set([...watched.map((entry) => entry.movieId), ...bucketList.map((entry) => entry.movieId)]);
  };
  const [gridMovies, setGridMovies] = useState(() => pickSpreadMovies(GRID_FIRST, knownIds()));
  const [marks, setMarks] = useState({});
  // Ids already written to the stores, so Back + Next never toggles the
  // same film twice.
  const [appliedIds, setAppliedIds] = useState([]);

  // DNA + picks.
  const [fingerprint, setFingerprint] = useState(null);
  const [picks, setPicks] = useState([]);
  const [selectedPickId, setSelectedPickId] = useState(null);

  const goToStep = (nextStep) => {
    Haptics.selectionAsync();
    setStep(nextStep);
  };
  // Each step reached, for the dashboard's funnel — where people stop.
  useEffect(() => {
    const names = { [STEP.seen]: "onboarding_seen", [STEP.dna]: "onboarding_dna", [STEP.pick]: "onboarding_pick" };
    logEvent(names[step]);
  }, [step]);
  const finish = () => {
    completeOnboarding();
  };

  const markedIds = Object.keys(marks);

  // A tap marks a film seen (or clears it); its ♥ marks it loved.
  const tapPoster = (movie) => {
    if (appliedIds.includes(movie.id)) return;
    Haptics.selectionAsync();
    setMarks((current) => {
      const updated = { ...current };
      if (current[movie.id]) delete updated[movie.id];
      else updated[movie.id] = "seen";
      return updated;
    });
  };
  const loveMovie = (movie) => {
    if (appliedIds.includes(movie.id)) return;
    Haptics.selectionAsync();
    setMarks((current) => ({ ...current, [movie.id]: current[movie.id] === "loved" ? "seen" : "loved" }));
  };
  // None of these seen: a different 15 — and after that, a way past it.
  const [reshuffles, setReshuffles] = useState(0);
  const reshuffle = () => {
    Haptics.selectionAsync();
    const shown = new Set([...gridMovies.map((movie) => movie.id), ...knownIds()]);
    setGridMovies(pickSpreadMovies(GRID_FIRST, shown));
    setReshuffles((count) => count + 1);
  };

  // More films, like the ones picked so far.
  const showMore = () => {
    Haptics.selectionAsync();
    const shown = new Set([...gridMovies.map((movie) => movie.id), ...knownIds()]);
    const picked = gridMovies.filter((movie) => marks[movie.id]);
    setGridMovies((current) => [...current, ...pickMoreMovies(GRID_MORE, shown, picked)]);
  };

  // Seen → watched; loved → watched and tiered S — in the real stores.
  const applyMarks = () => {
    const { toggleWatched, setWatchedTier } = useMovieStore.getState();
    const applied = [];
    Object.entries(marks).forEach(([movieId, mark]) => {
      if (appliedIds.includes(movieId)) return;
      toggleWatched(movieId);
      if (mark === "loved") setWatchedTier(movieId, "S");
      applied.push(movieId);
    });
    setAppliedIds((current) => [...current, ...applied]);
  };

  // Everything learnt → the fingerprint and the picks; your taste card if
  // there's anything to show, else straight to tonight.
  const learn = (hasFilms) => {
    const { watched, bucketList } = useMovieStore.getState();
    setFingerprint(buildMyTasteModel(watched).fingerprint);
    setPicks(getTastePicks(watched, { watchlist: bucketList.map((entry) => entry.movieId), count: PICK_COUNT }));
    setSelectedPickId(null);
    if (hasFilms) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    goToStep(hasFilms ? STEP.dna : STEP.pick);
  };

  const handleNext = () => {
    if (step === STEP.seen) {
      if (markedIds.length === 0 && reshuffles === 0) return reshuffle();
      applyMarks();
      return learn(markedIds.length > 0);
    }
    if (step === STEP.dna) return goToStep(STEP.pick);
    if (step === STEP.pick) {
      // Only the whole way through counts (Skip doesn't).
      logEvent("onboarding_completed");
      if (!selectedPickId) return notTonight();
      const { pickedMovie, togglePickedMovie } = useMovieStore.getState();
      if (pickedMovie !== selectedPickId) togglePickedMovie(selectedPickId);
      // A nudge tonight (and the morning after)? Asked once, then in.
      askForReminders(getMovieById(selectedPickId)?.title ?? null).finally(finish);
      return undefined;
    }
    return undefined;
  };

  // Not tonight: the chosen film (if any) is saved for later — no pick, no
  // reminder asked for.
  const notTonight = () => {
    logEvent("pick_later");
    if (selectedPickId) {
      const { bucketList, toggleBucketList } = useMovieStore.getState();
      if (!bucketList.some((entry) => entry.movieId === selectedPickId)) toggleBucketList(selectedPickId);
    }
    finish();
  };

  // Skip: straight to the app, keeping whatever's been picked so far.
  const skipAll = () => {
    if (step === STEP.seen) applyMarks();
    logEvent("onboarding_skipped");
    finish();
  };

  // Back one step. What's already saved stays (appliedIds keeps the field
  // from toggling it twice), so going back and on again is safe.
  const goBack = () => {
    if (step === STEP.dna) return goToStep(STEP.seen);
    if (step === STEP.pick) return goToStep(appliedIds.length > 0 ? STEP.dna : STEP.seen);
    return undefined;
  };

  const lovedCount = markedIds.filter((id) => marks[id] === "loved").length;
  const footer = {
    [STEP.seen]:
      markedIds.length > 0
        ? {
            label:
              lovedCount > 0
                ? t("Next · {count} seen, {loved} loved", { count: markedIds.length, loved: lovedCount })
                : t("Next · {count} seen", { count: markedIds.length }),
            primary: true,
          }
        : reshuffles === 0
          ? { label: t("Show me different films"), primary: false }
          : { label: t("Skip — I'll tier as I go"), primary: false },
    [STEP.dna]: { label: t("See tonight's picks"), primary: true },
    [STEP.pick]: selectedPickId
      ? { label: t("I'll watch this tonight"), primary: true }
      : { label: t("Not tonight"), primary: false },
  }[step];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <TopBar
        step={step}
        onBack={step > STEP.seen ? goBack : null}
        onSkip={skipAll}
        styles={styles}
        colors={colors}
      />
      <Animated.View key={step} entering={FadeIn.duration(250)} style={styles.contentWrap}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === STEP.seen && (
            <SeenStep
              movies={gridMovies}
              marks={marks}
              onTap={tapPoster}
              onLove={loveMovie}
              onMore={showMore}
              canMore={gridMovies.length < GRID_MAX}
              styles={styles}
              colors={colors}
            />
          )}
          {step === STEP.dna && (
            <DnaStep
              fingerprint={fingerprint}
              seenCount={appliedIds.length}
              lovedMovies={Object.entries(marks)
                .filter(([, mark]) => mark === "loved")
                .map(([movieId]) => getMovieById(movieId))
                .filter(Boolean)}
              styles={styles}
            />
          )}
          {step === STEP.pick && (
            <PickStep
              picks={picks}
              selectedId={selectedPickId}
              coldStart={appliedIds.length === 0}
              onSelect={(id) => {
                Haptics.selectionAsync();
                setSelectedPickId((current) => (current === id ? null : id));
              }}
              styles={styles}
              colors={colors}
            />
          )}
        </ScrollView>
      </Animated.View>

      {step === STEP.dna && (
        <Confetti palette={[colors.brand, colors.rating, colors.success, colors.collection, colors.dare]} />
      )}

      <View style={styles.footer}>
        <FooterButton label={footer.label} primary={footer.primary} onPress={handleNext} styles={styles} />
        {step === STEP.pick && !!selectedPickId && (
          <Pressable onPress={notTonight} hitSlop={8} style={styles.notTonight} accessibilityRole="button">
            <Text style={styles.notTonightText}>{t("Not tonight, save it")}</Text>
          </Pressable>
        )}
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
    pressed: {
      opacity: 0.75,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    // Back on the left, the steps in the middle, Skip on the right.
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      height: 48,
      paddingHorizontal: spacing.md,
    },
    topSide: {
      width: 40,
    },
    progress: {
      flex: 1,
      flexDirection: "row",
      gap: 4,
    },
    progressStep: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.buttonFill,
    },
    progressStepOn: {
      backgroundColor: colors.brand,
    },
    skip: {
      width: 40,
      alignItems: "flex-end",
    },
    skipText: {
      ...typography.bodyBold,
      color: colors.textSecondary,
    },
    contentWrap: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    step: {},
    // A step's heading: big and bold, then a quiet line.
    title: {
      fontFamily: fonts.extraBold,
      fontSize: 30,
      lineHeight: 36,
      letterSpacing: -0.7,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 21,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },

    // What have you seen: the grid.
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GRID_GAP,
      rowGap: spacing.md,
    },
    posterIdle: {
      opacity: 0.85,
    },
    posterRing: {
      ...StyleSheet.absoluteFillObject,
      borderWidth: 3,
      borderColor: colors.brand,
      borderRadius: shape.poster,
    },
    seenBadge: {
      position: "absolute",
      top: 6,
      start: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand,
    },
    loveButton: {
      position: "absolute",
      bottom: 6,
      end: 6,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    loveButtonOn: {
      backgroundColor: colors.brand,
    },
    gridTitle: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.xs + 2,
    },
    gridTitleOn: {
      color: colors.textPrimary,
      fontFamily: fonts.semiBold,
    },
    moreButton: {
      alignSelf: "center",
      marginTop: spacing.lg,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.buttonFill,
      borderRadius: shape.chip,
    },
    moreButtonText: {
      ...typography.bodyBold,
      color: colors.brand,
    },

    // Your taste: the shareable card.
    dnaCard: {
      padding: spacing.lg,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    // The films you loved, a small row on the card.
    lovedRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    lovedPoster: {
      width: 56,
      height: 84,
    },
    dnaEyebrow: {
      ...typography.section,
      color: colors.brand,
    },
    dnaBars: {
      marginTop: spacing.md,
    },
    dnaXPDetail: {
      ...typography.caption,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },

    // Tonight: the best pick big, the others under it.
    leadPick: {
      alignItems: "center",
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    pickOn: {
      borderColor: colors.brand,
    },
    leadTitle: {
      fontFamily: fonts.display,
      fontSize: 22,
      lineHeight: 27,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.md,
    },
    leadReason: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    pickList: {
      gap: spacing.sm,
      marginTop: spacing.rail,
    },
    pickRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.sm + 2,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    pickPoster: {
      width: 48,
      height: 72,
    },
    pickText: {
      flex: 1,
      gap: 2,
    },
    pickTitle: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    pickMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    pickCheck: {
      position: "absolute",
      top: spacing.md,
      end: spacing.md,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand,
    },
    pickCheckInline: {
      position: "relative",
      top: 0,
      end: 0,
    },

    // The bottom button.
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    notTonight: {
      alignSelf: "center",
      paddingVertical: spacing.sm + 2,
    },
    notTonightText: {
      ...typography.bodyBold,
      color: colors.textSecondary,
    },
    footerButton: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: shape.card,
    },
    footerPrimary: {
      backgroundColor: colors.brand,
    },
    footerQuiet: {
      backgroundColor: colors.buttonFill,
    },
    footerText: {
      ...typography.bodyBold,
      fontSize: 16,
    },
    footerPrimaryText: {
      color: colors.brandText,
    },
    footerQuietText: {
      color: colors.textPrimary,
    },
  });

export default OnboardingScreen;

import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { Bookmark, Check, ChevronLeft, Share2 } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../components/AppText";
import Animated, { Easing, FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { Confetti } from "../components/AchievementModal";
import { MoviePoster } from "../components/MoviePoster";
import { TasteDnaBars } from "../components/TasteDnaBars";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { DIMENSIONS } from "../data/vibes";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { useTasteStore } from "../store/tasteStore";
import { useUserStore } from "../store/userStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  pickMoreMovies,
  pickQuestions,
  pickSpreadMovies,
} from "../utils/onboardingTaste";
import { buildMyTasteModel, getTastePicks } from "../utils/tasteEngine";
import { getRankCount } from "../utils/ranks";
import { getTierInfo } from "../utils/tiers";
import { t, useIsRTL } from "../i18n";

// "Play, don't tell", built around Taste DNA (data/vibes.js). In about a
// minute the engine gets real signals instead of a pile of checkmarks.
// It starts straight at "seen" — the sign-in screen just before it is the
// welcome (poster wall and all).
//
//   seen         a grid spread across every kind of taste (not the top of
//                the catalog by rank); "Show more" brings more like what you've seen
//   quick tier   up to six of those, one at a time: Loved / Liked / Not
//                for me — real tiers from minute one
//   this or that five pairs on the dimensions we know least about yet
//   your DNA     the payoff: your leanings, your watcher type, ranks — and
//                your name on a card you can share (asked for here only
//                when the account doesn't have one yet)
//   tonight      three picks from the real taste engine, with reasons
//
// A slim top bar: back (from the second step on) and how far along you
// are. Each step's bottom button moves on (several double as a skip: "I
// haven't seen these", "Skip the rest", "Skip", "Maybe later").
const STEP = { seen: 1, tier: 2, versus: 3, dna: 4, pick: 5 };
const STEP_COUNT = 5;

// The bottom button: white for going on, quiet grey for skipping.
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

// Back, and a segment per step — the done ones and the open one lit.
const TopBar = ({ step, onBack, styles, colors }) => {
  const rtl = useIsRTL();
  return (
    <View style={styles.topBar}>
      <View style={styles.topSide}>
        {onBack && (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("Back")}
          >
            <ChevronLeft
              size={26}
              color={colors.textPrimary}
              strokeWidth={2}
              style={rtl && styles.flipped}
            />
          </Pressable>
        )}
      </View>
      <View style={styles.progress} accessibilityLabel={t("{current} of {total}", { current: step, total: STEP_COUNT })}>
        {Array.from({ length: STEP_COUNT }, (_, index) => (
          <View key={index} style={[styles.progressStep, index < step && styles.progressStepOn]} />
        ))}
      </View>
      <View style={styles.topSide} />
    </View>
  );
};

const SEEN_FIRST = 12;
const SEEN_MORE = 9;
const SEEN_COLUMNS = 3;
const TIER_MAX = 6;
const PICK_COUNT = 3;
// The seen grid's posters: inside the page's margins, a little apart.
const GRID_GAP = 8;

// Tap cycle on a poster: nothing → seen → want → nothing.
const NEXT_MARK = { undefined: "seen", seen: "want", want: undefined };
// Quick tier's three answers, as real tiers.
const QUICK_TIERS = [
  { tier: "S", label: "Loved it" },
  { tier: "B", label: "Liked it" },
  { tier: "D", label: "Not for me" },
];

// ---------- What have you seen? ----------
const SeenStep = ({ movies, marks, onTap, onMore, canMore, styles, colors }) => {
  const { width } = useWindowDimensions();
  // Inside the page's side margins, whole pixels; an explicit height so
  // wrapped rows are never clipped.
  const tileWidth = Math.floor(
    (width - spacing.md * 2 - GRID_GAP * (SEEN_COLUMNS - 1)) / SEEN_COLUMNS,
  );
  const tileSize = { width: tileWidth, height: tileWidth * 1.5 };
  const seenCount = Object.values(marks).filter((m) => m === "seen").length;
  const wantCount = Object.values(marks).filter((m) => m === "want").length;

  return (
    <View style={styles.step}>
      <Text style={styles.title}>{t("What have you seen?")}</Text>
      <Text style={styles.subtitle}>
        {t("Tap once for seen, twice to save it for later.")}
      </Text>
      <Text style={styles.counter}>
        <Text style={{ color: colors.success }}>
          {t("{count} seen", { count: seenCount })}
        </Text>
        {"  ·  "}
        <Text style={{ color: colors.textPrimary }}>
          {t("{count} saved", { count: wantCount })}
        </Text>
      </Text>
      <View style={styles.seenGrid}>
        {movies.map((movie) => {
          const mark = marks[movie.id];
          return (
            <Pressable
              key={movie.id}
              onPress={() => onTap(movie.id)}
              style={{ width: tileWidth }}
              accessibilityLabel={movie.title}
            >
              <View>
                <MoviePoster
                  uri={movie.poster}
                  style={[tileSize, mark && styles.posterMarked]}
                />
                {mark && (
                  <View style={styles.markOverlay}>
                    <View style={[styles.markBadge, mark === "want" && styles.markBadgeWant]}>
                      {mark === "seen" ? (
                        <Check
                          size={18}
                          color={colors.background}
                          strokeWidth={3.2}
                        />
                      ) : (
                        <Bookmark
                          size={15}
                          color={colors.segmentOnText}
                          fill={colors.segmentOnText}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>
              <Text style={styles.gridTitle} numberOfLines={1}>
                {movie.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {canMore && (
        <Pressable onPress={onMore} style={styles.moreButton} hitSlop={8}>
          <Text style={styles.moreText}>
            {seenCount > 0 ? t("Show more like these") : t("Show more")}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

// ---------- Quick tier ----------
const QuickTierStep = ({ movie, position, total, onAnswer, styles }) => (
  <View style={[styles.step, styles.centered]}>
    <Text style={[styles.stepCount, styles.centerText]}>
      {t("{current} of {total}", { current: position, total })}
    </Text>
    <Text style={[styles.title, styles.centerText]}>
      {t("How was it?")}
    </Text>
    <Animated.View
      key={movie.id}
      entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic))}
      style={styles.tierCard}
    >
      <MoviePoster uri={movie.poster} shadow style={styles.tierPoster} />
      <Text style={styles.tierTitle} numberOfLines={2}>
        {movie.title}
      </Text>
      <Text style={styles.tierMeta}>{movie.year}</Text>
    </Animated.View>
    <View style={styles.tierButtons}>
      {QUICK_TIERS.map(({ tier, label }) => (
        <Pressable
          key={tier}
          onPress={() => onAnswer(tier)}
          style={({ pressed }) => [styles.tierAnswer, pressed && styles.tierAnswerPressed]}
          accessibilityRole="button"
          accessibilityLabel={`${t(label)} · ${tier}`}
        >
          <View style={[styles.tierAnswerTile, { backgroundColor: getTierInfo(tier).color }]}>
            <Text style={styles.tierAnswerLetter}>{tier}</Text>
          </View>
          <Text style={styles.tierAnswerText}>{t(label)}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

// ---------- This or that ----------
const VersusSide = ({ side, onPress, width, styles }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [{ width }, pressed && styles.pressed]}
    accessibilityLabel={`${t(side.label)} · ${side.movie.title}`}
  >
    <MoviePoster
      uri={side.movie.poster}
      style={{ width, height: width * 1.5 }}
    />
    <Text style={styles.versusLabel}>{t(side.label)}</Text>
    <Text style={styles.versusMovie} numberOfLines={1}>
      {t("like {title}", { title: side.movie.title })}
    </Text>
  </Pressable>
);

const VersusStep = ({ question, position, total, onAnswer, styles }) => {
  const { width } = useWindowDimensions();
  const sideWidth = Math.floor((width - spacing.md * 2 - spacing.md) / 2);
  return (
    <View style={styles.step}>
      <Text style={styles.stepCount}>
        {t("{current} of {total}", { current: position, total })}
      </Text>
      <Text style={styles.title}>{t("Tonight, which sounds better?")}</Text>
      <Text style={styles.subtitle}>
        {t("You don't need to have seen them — it's about the feeling.")}
      </Text>
      <Animated.View
        key={question.key}
        entering={FadeIn.duration(260)}
        style={styles.versusRow}
      >
        <VersusSide
          side={question.low}
          onPress={() => onAnswer(-1)}
          width={sideWidth}
          styles={styles}
        />
        <VersusSide
          side={question.high}
          onPress={() => onAnswer(1)}
          width={sideWidth}
          styles={styles}
        />
      </Animated.View>
      <View style={styles.versusExtras}>
        <Pressable onPress={() => onAnswer(0)} hitSlop={10}>
          <Text style={styles.moreText}>{t("Both sound good")}</Text>
        </Pressable>
        <Pressable onPress={() => onAnswer(0)} hitSlop={10}>
          <Text style={styles.moreText}>{t("Neither")}</Text>
        </Pressable>
      </View>
    </View>
  );
};

// ---------- Your Taste DNA ----------
const DnaStep = ({
  fingerprint,
  ranks,
  seenCount,
  name,
  askName,
  onChangeName,
  cardRef,
  onShare,
  isSharing,
  styles,
  colors,
}) => (
  <View style={styles.step}>
    {/* The card — exactly what gets shared. collapsable={false} so
        Android keeps a real view for view-shot to capture. */}
    <View ref={cardRef} collapsable={false} style={styles.dnaCard}>
      <Text style={styles.dnaEyebrow}>
        {name.trim()
          ? t("{name}'s taste DNA", { name: name.trim() })
          : t("Your taste DNA")}
      </Text>
      <View style={styles.dnaBars}>
        <TasteDnaBars fingerprint={fingerprint} />
      </View>
      <View style={styles.dnaFooter}>
        {ranks > 0 ? (
          <Text style={styles.dnaXP}>
            +{ranks} {ranks === 1 ? t("rank") : t("ranks")}
            <Text style={styles.dnaXPDetail}>
              {"  "}
              {t("from {count} movies", { count: seenCount })}
            </Text>
          </Text>
        ) : (
          <View />
        )}
        <Text style={styles.dnaBrand}>{t("on ReelBoard")}</Text>
      </View>
    </View>

    {askName && (
      <>
        <Text style={styles.nameLabel}>{t("Put your name on it (optional)")}</Text>
        <TextInput
          value={name}
          onChangeText={onChangeName}
          placeholder={t("Your name")}
          placeholderTextColor={colors.textMuted}
          style={styles.nameInput}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={24}
        />
      </>
    )}
    <Pressable
      onPress={onShare}
      disabled={isSharing}
      style={styles.shareRow}
      hitSlop={8}
    >
      <Share2 size={16} color={colors.textPrimary} />
      <Text style={styles.moreText}>
        {isSharing ? t("Preparing…") : t("Share your taste card")}
      </Text>
    </Pressable>
  </View>
);

// ---------- Tonight ----------
const PickStep = ({ picks, selectedId, onSelect, styles, colors }) => (
  <View style={styles.step}>
    <Text style={styles.title}>{t("Pick one for tonight.")}</Text>
    <Text style={styles.subtitle}>
      {t("Chosen for your taste. It'll be waiting on Home.")}
    </Text>
    <View style={styles.pickList}>
      {picks.map((pick, index) => {
        const isSelected = pick.movie.id === selectedId;
        return (
          <Animated.View
            key={pick.movie.id}
            entering={FadeInDown.duration(300)
              .easing(Easing.out(Easing.cubic))
              .delay(index * 80)}
          >
            <Pressable
              onPress={() => onSelect(pick.movie.id)}
              style={[
                styles.pickRow,
                isSelected && styles.pickRowSelected,
                selectedId && !isSelected && styles.pickRowDimmed,
              ]}
              accessibilityState={{ selected: isSelected }}
            >
              <MoviePoster uri={pick.movie.poster} style={styles.pickPoster} />
              <View style={styles.pickText}>
                <Text style={styles.pickTitle} numberOfLines={2}>
                  {pick.movie.title}
                </Text>
                <Text style={styles.pickMeta}>
                  {pick.movie.year} · {t("{match}% match", { match: pick.match })}
                </Text>
                <Text style={styles.pickReason} numberOfLines={2}>
                  {pick.reasons[0]}
                </Text>
              </View>
              {isSelected && (
                <View style={styles.pickCheck}>
                  <Check size={16} color={colors.segmentOnText} strokeWidth={3.2} />
                </View>
              )}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  </View>
);

export const OnboardingScreen = () => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const [step, setStep] = useState(STEP.seen);
  const currentName = useProfileStore((state) => state.displayName);
  const setDisplayName = useProfileStore((state) => state.setDisplayName);
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);

  // The name given at sign-up goes straight on the card; only an account
  // without one (some Google / Apple sign-ins) is asked for it.
  const hasName = !!currentName && currentName !== "You";
  const [askName] = useState(!hasName);
  const [name, setName] = useState(hasName ? currentName : "");

  // Seen: movies already in the stores (a replay) aren't offered, or a
  // "seen" tap would un-watch them.
  const knownIds = () => {
    const { watched, bucketList } = useMovieStore.getState();
    return new Set([
      ...watched.map((entry) => entry.movieId),
      ...bucketList.map((entry) => entry.movieId),
    ]);
  };
  const [gridMovies, setGridMovies] = useState(() =>
    pickSpreadMovies(SEEN_FIRST, knownIds()),
  );
  const [marks, setMarks] = useState({});
  // Ids already written to the stores, so Back + Continue never toggles
  // the same movie twice.
  const [appliedIds, setAppliedIds] = useState([]);
  const [ranksGained, setRanksGained] = useState(0);

  // Quick tier: the seen ones, in order.
  const [tierQueue, setTierQueue] = useState([]);
  const [tierIndex, setTierIndex] = useState(0);

  // This or that.
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [leanings, setLeanings] = useState(DIMENSIONS.map(() => 0));

  // DNA + picks.
  const [fingerprint, setFingerprint] = useState(null);
  const [picks, setPicks] = useState([]);
  const [selectedPickId, setSelectedPickId] = useState(null);
  const cardRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  const goToStep = (nextStep) => {
    Haptics.selectionAsync();
    setStep(nextStep);
  };
  const finish = () => {
    if (name.trim() && name.trim() !== currentName) setDisplayName(name.trim());
    completeOnboarding();
  };

  const seenIds = Object.keys(marks).filter((id) => marks[id] === "seen");

  const tapPoster = (movieId) => {
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

  const showMore = () => {
    Haptics.selectionAsync();
    const shown = new Set([...gridMovies.map((movie) => movie.id), ...knownIds()]);
    const more = pickMoreMovies(
      SEEN_MORE,
      shown,
      seenIds.map(getMovieById).filter(Boolean),
    );
    setGridMovies((current) => [...current, ...more]);
  };

  // Seen → watched, want → watchlist, in the real stores.
  const applyMarks = () => {
    const { toggleWatched, toggleBucketList } = useMovieStore.getState();
    const ranksBefore = getRankCount(useMovieStore.getState().watched);
    const applied = [];
    Object.entries(marks).forEach(([movieId, mark]) => {
      if (appliedIds.includes(movieId)) return;
      if (mark === "seen") toggleWatched(movieId);
      else if (mark === "want") toggleBucketList(movieId);
      applied.push(movieId);
    });
    setAppliedIds((current) => [...current, ...applied]);
    setRanksGained(
      (current) =>
        current + getRankCount(useMovieStore.getState().watched) - ranksBefore,
    );
  };

  // Move to "this or that", asking about what the tiers so far leave open.
  const startVersus = () => {
    const model = buildMyTasteModel(useMovieStore.getState().watched);
    setQuestions(pickQuestions(model.fingerprint, new Set(Object.keys(marks))));
    setQuestionIndex(0);
    goToStep(STEP.versus);
  };

  // Everything learnt → the fingerprint and the picks.
  const startDna = (finalLeanings) => {
    useTasteStore.getState().setLeanings(finalLeanings);
    const { watched, bucketList } = useMovieStore.getState();
    setFingerprint(buildMyTasteModel(watched).fingerprint);
    setPicks(
      getTastePicks(watched, {
        watchlist: bucketList.map((entry) => entry.movieId),
        count: PICK_COUNT,
      }),
    );
    setSelectedPickId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep(STEP.dna);
  };

  const answerTier = (tier) => {
    Haptics.selectionAsync();
    useMovieStore.getState().setWatchedTier(tierQueue[tierIndex], tier);
    if (tierIndex + 1 < tierQueue.length) setTierIndex(tierIndex + 1);
    else startVersus();
  };

  const answerVersus = (lean) => {
    Haptics.selectionAsync();
    const next = [...leanings];
    next[questions[questionIndex].index] = lean;
    setLeanings(next);
    if (questionIndex + 1 < questions.length) setQuestionIndex(questionIndex + 1);
    else startDna(next);
  };

  const shareCard = async () => {
    if (isSharing) return;
    setIsSharing(true);
    const fallback = `${t("My taste DNA")} ${t("on ReelBoard")}`;
    try {
      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: t("Your taste DNA"),
          UTI: "public.png",
        });
      } else {
        await Share.share({ message: fallback });
      }
    } catch {
      await Share.share({ message: fallback });
    } finally {
      setIsSharing(false);
    }
  };

  const handleNext = () => {
    if (step === STEP.seen) {
      applyMarks();
      // Quick tier the seen ones that aren't tiered yet.
      const { watched } = useMovieStore.getState();
      const queue = seenIds
        .filter((id) => {
          const entry = watched.find((item) => item.movieId === id);
          return entry && !entry.tier;
        })
        .slice(0, TIER_MAX);
      if (queue.length > 0) {
        setTierQueue(queue);
        setTierIndex(0);
        return goToStep(STEP.tier);
      }
      return startVersus();
    }
    if (step === STEP.tier) return startVersus();
    if (step === STEP.versus) return startDna(leanings);
    if (step === STEP.dna) return goToStep(STEP.pick);
    if (step === STEP.pick) {
      if (selectedPickId) {
        const { pickedMovie, togglePickedMovie } = useMovieStore.getState();
        if (pickedMovie !== selectedPickId) togglePickedMovie(selectedPickId);
      }
      return finish();
    }
  };

  // Back one step. What's already saved stays (appliedIds keeps the seen
  // grid from toggling it twice), so going back and on again is safe.
  const goBack = () => {
    if (step === STEP.tier) return goToStep(STEP.seen);
    if (step === STEP.versus) {
      if (tierQueue.length > 0) {
        setTierIndex(tierQueue.length - 1);
        return goToStep(STEP.tier);
      }
      return goToStep(STEP.seen);
    }
    if (step === STEP.dna) {
      setQuestionIndex(Math.max(0, questions.length - 1));
      return goToStep(STEP.versus);
    }
    if (step === STEP.pick) return goToStep(STEP.dna);
    return undefined;
  };

  const markedCount = Object.keys(marks).length;
  const footer = {
    [STEP.seen]:
      markedCount > 0
        ? { label: t("Continue"), primary: true }
        : { label: t("I haven't seen these"), primary: false },
    [STEP.tier]: { label: t("Skip the rest"), primary: false },
    [STEP.versus]: { label: t("Skip"), primary: false },
    [STEP.dna]: { label: t("See tonight's picks"), primary: true },
    [STEP.pick]: selectedPickId
      ? { label: t("Set as tonight's pick"), primary: true }
      : { label: t("Maybe later"), primary: false },
  }[step];

  const tierMovie = getMovieById(tierQueue[tierIndex]);
  const question = questions[questionIndex];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <TopBar
        step={step}
        onBack={step > STEP.seen ? goBack : null}
        styles={styles}
        colors={colors}
      />
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
          {step === STEP.seen && (
            <SeenStep
              movies={gridMovies}
              marks={marks}
              onTap={tapPoster}
              onMore={showMore}
              canMore={gridMovies.length < 40}
              styles={styles}
              colors={colors}
            />
          )}
          {step === STEP.tier && tierMovie && (
            <QuickTierStep
              movie={tierMovie}
              position={tierIndex + 1}
              total={tierQueue.length}
              onAnswer={answerTier}
              styles={styles}
            />
          )}
          {step === STEP.versus && question && (
            <VersusStep
              question={question}
              position={questionIndex + 1}
              total={questions.length}
              onAnswer={answerVersus}
              styles={styles}
            />
          )}
          {step === STEP.dna && (
            <DnaStep
              fingerprint={fingerprint}
              ranks={ranksGained}
              seenCount={seenIds.length}
              name={name}
              askName={askName}
              onChangeName={setName}
              cardRef={cardRef}
              onShare={shareCard}
              isSharing={isSharing}
              styles={styles}
              colors={colors}
            />
          )}
          {step === STEP.pick && (
            <PickStep
              picks={picks}
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

      {step === STEP.dna && (
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

      <View style={styles.footer}>
        <FooterButton
          label={footer.label}
          primary={footer.primary}
          onPress={handleNext}
          styles={styles}
        />
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
    // Back on the left, the steps in the middle.
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      height: 44,
      paddingHorizontal: spacing.md,
    },
    topSide: {
      width: 28,
    },
    progress: {
      flex: 1,
      flexDirection: "row",
      gap: 4,
    },
    progressStep: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    progressStepOn: {
      backgroundColor: colors.selected,
    },
    contentWrap: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    step: {
      flex: 1,
    },
    centered: {
      alignItems: "center",
    },
    centerText: {
      textAlign: "center",
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
    stepCount: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    footerButton: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 50,
      paddingHorizontal: spacing.md,
      borderRadius: shape.control,
    },
    footerPrimary: {
      backgroundColor: colors.textPrimary,
    },
    footerQuiet: {
      backgroundColor: colors.buttonFill,
    },
    footerText: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
    },
    footerPrimaryText: {
      color: colors.background,
    },
    footerQuietText: {
      color: colors.textPrimary,
    },
    moreText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },

    // Seen
    counter: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      marginTop: spacing.md,
      color: colors.textSecondary,
    },
    seenGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: GRID_GAP,
      rowGap: spacing.md,
      marginTop: spacing.md,
    },
    posterMarked: {
      opacity: 0.4,
    },
    // Marked: the poster dimmed, a round badge in its middle — a green
    // check for seen, a slate bookmark for saved.
    markOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
    markBadge: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.success,
      borderRadius: 18,
    },
    markBadgeWant: {
      backgroundColor: colors.segmentOn,
    },
    gridTitle: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
      paddingHorizontal: spacing.xs,
    },
    moreButton: {
      alignSelf: "center",
      marginTop: spacing.lg,
      paddingVertical: spacing.sm,
    },

    // Quick tier
    tierCard: {
      alignItems: "center",
      marginTop: spacing.lg,
    },
    tierPoster: {
      width: 168,
      height: 252,
    },
    tierTitle: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 27,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.md,
    },
    tierMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    // The three answers: rows in one rounded card.
    tierButtons: {
      alignSelf: "stretch",
      marginTop: spacing.lg,
      borderRadius: shape.card,
      overflow: "hidden",
    },
    tierAnswer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 56,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    tierAnswerPressed: {
      backgroundColor: colors.cardElevated,
    },
    tierAnswerTile: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: shape.poster,
    },
    tierAnswerLetter: {
      ...typography.title,
      fontSize: 18,
      lineHeight: 22,
      color: "#0C0C0C",
    },
    tierAnswerText: {
      ...typography.bodyBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
    },

    // This or that
    versusRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.lg,
    },
    versusLabel: {
      ...typography.title,
      fontSize: 18,
      lineHeight: 24,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    versusMovie: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    versusExtras: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.xl,
      marginTop: spacing.lg,
    },

    // Your DNA
    dnaCard: {
      padding: spacing.md,
      paddingTop: spacing.lg,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    dnaEyebrow: {
      ...typography.caption,
      color: colors.textMuted,
    },
    dnaBars: {
      marginTop: spacing.lg,
    },
    dnaFooter: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginTop: spacing.lg,
    },
    dnaXP: {
      ...typography.title,
      fontSize: 18,
      lineHeight: 24,
      color: colors.rating,
    },
    dnaXPDetail: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    dnaBrand: {
      ...typography.bodyBold,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textMuted,
    },
    nameLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    nameInput: {
      ...typography.body,
      fontSize: 16,
      lineHeight: 21,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      color: colors.textPrimary,
    },
    shareRow: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: spacing.sm,
      marginTop: spacing.lg,
      paddingVertical: spacing.sm,
    },

    // Tonight
    // Rows in one rounded card; the chosen one lifts a shade, with a check.
    pickList: {
      marginTop: spacing.lg,
      borderRadius: shape.card,
      overflow: "hidden",
    },
    pickRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    pickRowSelected: {
      backgroundColor: colors.cardElevatedLight,
    },
    pickRowDimmed: {
      opacity: 0.5,
    },
    pickPoster: {
      width: 64,
      height: 96,
    },
    pickText: {
      flex: 1,
      gap: 2,
    },
    pickTitle: {
      ...typography.bodyBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    pickMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    pickReason: {
      ...typography.caption,
      color: colors.textPrimary,
      marginTop: 2,
    },
    pickCheck: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.segmentOn,
      borderRadius: 14,
    },
  });

export default OnboardingScreen;

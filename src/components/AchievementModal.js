import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Share2, Star, TrendingUp, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { getMovieById } from "../data/movies";
import { t, useLayoutDirection } from "../i18n";
import { useAchievementStore } from "../store/achievementStore";
import { useSheetStore } from "../store/sheetStore";
import { useMovieStore } from "../store/movieStore";
import { openShareCard } from "../store/shareCardStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";
import { describeNext, getClosestRanks, getTitle, sortByRarity } from "../utils/ranks";
import { getMilestones } from "../utils/milestones";
import { isRated } from "../utils/tiers";
import { useRankRarity, useRankSummary } from "../utils/useRanks";
import { Text } from "./AppText";
import { DialogArt } from "./DialogArt";
import { MilestoneMedal } from "./MilestoneMedal";
import { MoviePoster } from "./MoviePoster";
import { RankBadge } from "./RankBadge";

// The reward moment, full screen — an award, not a dialog. The film you
// watched fills the screen behind it, darkened (or, without one, the
// moment's colour glows on the page). The thing you earned leads, by name,
// not a generic "New Rank!":
//
//                                   ✕
//     ╲ ╱      a projector's beam falling from the top of the screen
//   ┌──────┐   onto the hero — the film's poster (its rank tile stamped
//   │ HERO │   on the corner), or the rank's tile, or the title art —
//   └──────┘   switching on with one flicker
//   NEW RANK                       what kind of moment
//   Explorer                       what you earned
//   Time Traveler · 14% of watchers
//   also earned                    anything else this one action brought
//   [23] Lead ━━━━━━━━━━──  7 ranks to Star   (fills from before to after)
//   ↗ 1 film to Wolf · King of the World      (what's next)
//   [ Tier it ]                    the one main action (white)
//   [ Share / See your ranks ]     the second (grey)
//
// ✕, a tap on the backdrop or the system back closes it. Everything that
// moves respects the system's Reduce Motion.

const HERO_HEIGHT = 220;
const POSTER_WIDTH = 132;
// The glow behind the hero.
const GLOW = 340;
// Milestones count as this moment's when they were reached in the last
// few minutes (by the film just watched).
const MILESTONE_FRESH_MS = 3 * 60 * 1000;
const MEDAL = 76;
const BAR_DELAY = 450;
const BAR_MS = 700;
const ROWS_DELAY = 380;
const ROW_STAGGER = 70;
// One easing for everything that arrives: quick, then settles — no
// overshoot, no wobble.
const ARRIVE = { duration: 340, easing: Easing.out(Easing.cubic) };
const HERO_IN = ZoomIn.duration(320).easing(Easing.out(Easing.cubic));
const CONFETTI_COUNT = 22;

// 8-digit hex (#RRGGBBAA) — every theme colour used here is 6-digit hex.
const withAlpha = (hex, alphaHex) => `${hex}${alphaHex}`;

// ---------- Confetti (also used by Onboarding) ----------

const ConfettiPiece = ({ index, width, palette }) => {
  const progress = useSharedValue(0);
  // Deterministic per-index spread, so the burst looks scattered without
  // re-randomizing on every render.
  const seed = (index * 37) % 100;
  const startX = (seed / 100) * width;
  const drift = ((index % 5) - 2) * 18;
  const fall = 260 + ((index * 53) % 160);
  const spin = ((index % 2 === 0 ? 1 : -1) * (180 + seed * 3)) | 0;
  const color = palette[index % palette.length];
  const isStrip = index % 3 === 0;

  useEffect(() => {
    progress.value = withDelay(
      (index % 6) * 40,
      withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value ** 3,
    transform: [
      { translateX: startX + drift * progress.value },
      { translateY: -20 + fall * progress.value },
      { rotate: `${spin * progress.value}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        confettiStyles.piece,
        isStrip ? confettiStyles.strip : confettiStyles.square,
        { backgroundColor: color },
        style,
      ]}
    />
  );
};

// Skipped entirely when the system's Reduce Motion setting is on.
export const Confetti = ({ palette }) => {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: CONFETTI_COUNT }, (_, index) => (
        <ConfettiPiece key={index} index={index} width={width} palette={palette} />
      ))}
    </View>
  );
};

const confettiStyles = StyleSheet.create({
  piece: {
    position: "absolute",
    top: 0,
    start: 0,
    borderRadius: 2,
  },
  square: {
    width: 8,
    height: 8,
  },
  strip: {
    width: 5,
    height: 12,
  },
});

// ---------- What the moment is about ----------

// What leads, and everything else as "also earned". In order: a new title,
// a finished saga, new ranks (the rarest leads), a step on a saga's
// ladder, a finished dare — or just the film you watched.
const getHeadline = (achievement, rarity, colors) => {
  const { reason, movieId, ranks, sagaSteps, dare, ranksBefore, ranksAfter } = achievement;
  const movie = movieId ? getMovieById(movieId) : null;
  const before = getTitle(ranksBefore);
  const after = getTitle(ranksAfter);
  const sortedRanks = sortByRarity(ranks, rarity);
  const finished = sagaSteps.find((step) => step.top) ?? null;
  const rankItem = (rank) => ({
    key: rank.id,
    rank,
    title: t(rank.title),
    detail: t(rank.track.title),
    counted: true,
  });
  const sagaItem = (step) => ({
    key: step.id,
    rank: step,
    title: t(step.title),
    detail: step.top
      ? t("{saga} · complete", { saga: t(step.track.title) })
      : t(step.track.title),
    counted: false,
  });
  const dareItem = dare && { key: "dare", dare: true, title: dare.title, detail: t("Dare complete"), counted: false };
  const all = [...sortedRanks.map(rankItem), ...sagaSteps.map(sagaItem), dareItem].filter(Boolean);
  const rarityOf = (rank) =>
    rarity[rank.id] != null ? t("{percent}% of watchers", { percent: rarity[rank.id] }) : null;

  if (after.step > before.step) {
    return {
      kind: "title",
      color: colors.rating,
      confetti: true,
      eyebrow: t("New title"),
      title: t(after.name),
      subtitle: t("{count} ranks", { count: ranksAfter }),
      lead: null,
      also: all,
      movie,
    };
  }
  if (finished) {
    return {
      kind: "collection",
      color: colors.rating,
      confetti: true,
      eyebrow: t("Collection complete"),
      title: t(finished.title),
      subtitle: t("Every film in {saga}", { saga: t(finished.track.title) }),
      lead: finished,
      also: all.filter((item) => item.key !== finished.id),
      movie,
    };
  }
  if (sortedRanks.length > 0) {
    const [lead] = sortedRanks;
    return {
      kind: "rank",
      color: colors.rating,
      confetti: true,
      eyebrow: sortedRanks.length > 1 ? t("{count} new ranks", { count: sortedRanks.length }) : t("New rank"),
      title: t(lead.title),
      subtitle: [t(lead.track.title), rarityOf(lead)].filter(Boolean).join(" · "),
      lead,
      also: all.filter((item) => item.key !== lead.id),
      movie,
    };
  }
  if (sagaSteps.length > 0) {
    const [lead] = sagaSteps;
    return {
      kind: "saga",
      color: colors.rating,
      confetti: false,
      eyebrow: t("Collection rank"),
      title: t(lead.title),
      subtitle: t(lead.track.title),
      lead,
      also: all.filter((item) => item.key !== lead.id),
      movie,
    };
  }
  if (dare) {
    return {
      kind: "challenge",
      color: colors.danger,
      confetti: true,
      eyebrow: t("Dare complete"),
      title: dare.title,
      subtitle: movie?.title ?? null,
      lead: null,
      also: [],
      movie,
    };
  }
  return {
    kind: reason === "rewatch" ? "rewatch" : "watched",
    color: colors.success,
    confetti: false,
    eyebrow: reason === "rewatch" ? t("Rewatched") : t("Watched"),
    title: movie?.title ?? t("Marked as watched"),
    subtitle: movie ? [movie.year, formatRuntime(movie.runtime)].filter(Boolean).join(" · ") : null,
    lead: null,
    also: [],
    movie,
  };
};

// ---------- Pieces of the dialog ----------

// A soft glow in the moment's colour behind the hero, as Replay's medals
// sit in their own light; it fades in (and, with motion on, swells once).
const HeroGlow = ({ color }) => {
  const reduceMotion = useReducedMotion();
  const on = useSharedValue(0);
  useEffect(() => {
    on.value = reduceMotion
      ? withTiming(1, { duration: 400 })
      : withDelay(80, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: on.value,
    transform: [{ scale: 0.85 + on.value * 0.15 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles_.glow, style]}>
      <Svg width={GLOW} height={GLOW}>
        <Defs>
          <RadialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="0.55" />
            <Stop offset="0.55" stopColor={color} stopOpacity="0.18" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#heroGlow)" />
      </Svg>
    </Animated.View>
  );
};

// The film you watched, tilted in, with what it earned stamped on its
// corner — the rank's tile, or a check.
const PosterHero = ({ movie, stamp, color, styles }) => (
  <Animated.View entering={HERO_IN.delay(120)} style={styles.posterHero}>
    <MoviePoster uri={movie.poster} shadow style={{ width: POSTER_WIDTH, height: POSTER_WIDTH * 1.5 }} />
    <Animated.View
      entering={ZoomIn.duration(220).easing(Easing.out(Easing.cubic)).delay(420)}
      style={styles.stampWrap}
    >
      {stamp ? (
        <View style={styles.stampTile}>
          <RankBadge track={stamp.track} step={stamp} size={44} />
        </View>
      ) : (
        <View style={[styles.stampCheck, { backgroundColor: color }]}>
          <Check size={20} color="#FFFFFF" strokeWidth={3} />
        </View>
      )}
    </Animated.View>
  </Animated.View>
);

// Where you are on the way to your next title, animated from before to
// after; the count chip pops. Crossing a title fills the bar, flashes,
// flips the title, and fills again from empty to the new progress.
const TitleProgress = ({ ranksBefore, ranksAfter, color, styles, colors }) => {
  const reduceMotion = useReducedMotion();
  const before = getTitle(ranksBefore);
  const after = getTitle(ranksAfter);
  const titleUp = after.step > before.step;
  const gained = ranksAfter - ranksBefore;
  const [shown, setShown] = useState(reduceMotion || !titleUp ? after : before);
  const fill = useSharedValue(reduceMotion ? after.progress : before.progress);
  const flash = useSharedValue(0);
  const chipScale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    const timing = { duration: BAR_MS, easing: Easing.out(Easing.cubic) };
    const onTitleUp = () => {
      setShown(after);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };
    if (titleUp) {
      fill.value = withDelay(
        BAR_DELAY,
        withSequence(
          withTiming(1, timing, (finished) => {
            if (finished) runOnJS(onTitleUp)();
          }),
          withTiming(0, { duration: 0 }),
          withTiming(after.progress, timing),
        ),
      );
      flash.value = withDelay(
        BAR_DELAY + BAR_MS,
        withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 500 })),
      );
    } else {
      fill.value = withDelay(BAR_DELAY, withTiming(after.progress, timing));
    }
    if (gained > 0) {
      chipScale.value = withDelay(
        BAR_DELAY,
        withSequence(
          withTiming(1.15, { duration: 160, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 220, easing: Easing.inOut(Easing.quad) }),
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(fill.value, 0.02) * 100}%` }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const chipStyle = useAnimatedStyle(() => ({ transform: [{ scale: chipScale.value }] }));

  return (
    <View style={styles.titleBlock}>
      <View style={styles.titleTop}>
        <Animated.View style={[styles.countChip, { backgroundColor: color }, chipStyle]}>
          <Text style={styles.countChipText}>{ranksAfter}</Text>
        </Animated.View>
        <View style={styles.titleText}>
          <Text style={styles.titleName} numberOfLines={1}>
            {t(shown.name)}
            {gained > 0 && (
              <Text style={[styles.titleGain, { color }]}>
                {"  "}
                {gained === 1 ? t("+1 rank") : t("+{count} ranks", { count: gained })}
              </Text>
            )}
          </Text>
          <Text style={styles.titleToGo} numberOfLines={1}>
            {shown.next
              ? t("{count} ranks to {title}", {
                  count: Math.max(0, shown.next.at - ranksAfter),
                  title: t(shown.next.name),
                })
              : t("The top title")}
          </Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: color }, fillStyle]} />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.textPrimary }, flashStyle]}
        />
      </View>
    </View>
  );
};

// One more thing this action earned: its tile, what and where, and "+1"
// for a rank (a check for the rest).
const AlsoRow = ({ item, index, last, color, styles, colors }) => (
  <Animated.View
    entering={FadeInDown.duration(300).delay(ROWS_DELAY + index * ROW_STAGGER)}
    style={[styles.alsoRow, !last && styles.alsoRule]}
  >
    {item.rank ? (
      <RankBadge track={item.rank.track} step={item.rank} size={34} />
    ) : (
      <View style={[styles.alsoIcon, { backgroundColor: withAlpha(colors.danger, "29") }]}>
        <Check size={16} color={colors.danger} strokeWidth={3} />
      </View>
    )}
    <View style={styles.alsoText}>
      <Text style={styles.alsoTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.alsoDetail} numberOfLines={1}>
        {item.detail}
      </Text>
    </View>
    {item.counted ? (
      <Text style={[styles.alsoGain, { color }]}>+1</Text>
    ) : (
      <Check size={16} color={colors.textMuted} strokeWidth={2.6} />
    )}
  </Animated.View>
);

// ---------- The dialog ----------

// Mounted once inside AppNavigator (needs useNavigation for "See your
// ranks"), so any screen can trigger it via
// useAchievementStore.getState().showAchievement({...}).
// It waits while any bottom sheet is still on screen (store/sheetStore) —
// marking a film watched from a sheet would otherwise put two Modals up at
// once, and on iOS the second freezes the screen — then a beat more for
// the sheet's Modal to finish going.
const AFTER_SHEET_MS = 120;

export const AchievementModal = () => {
  const achievement = useAchievementStore((state) => state.achievement);
  const sheetOpen = useSheetStore((state) => state.open > 0);
  const [clear, setClear] = useState(!sheetOpen);
  useEffect(() => {
    if (sheetOpen) {
      setClear(false);
      return undefined;
    }
    const timer = setTimeout(() => setClear(true), AFTER_SHEET_MS);
    return () => clearTimeout(timer);
  }, [sheetOpen]);
  if (!achievement || !clear) return null;
  // Keyed so every new achievement remounts — everything replays.
  return <AchievementDialog key={achievement.id} achievement={achievement} />;
};

const AchievementDialog = ({ achievement }) => {
  const colors = useColors();
  const direction = useLayoutDirection();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation();
  const hideAchievement = useAchievementStore((state) => state.hideAchievement);
  const rarity = useRankRarity();
  const summary = useRankSummary();
  const watchedNow = useMovieStore((state) => state.watched);

  const { shareCollectionId, ranksBefore, ranksAfter } = achievement;
  const headline = getHeadline(achievement, rarity, colors);
  const { movie, color } = headline;
  // What's next: the track closest to its next rank, now.
  const [upNext] = getClosestRanks(summary.tracks, 1);
  // A film you just watched and haven't tiered yet → "Tier it" leads, and
  // opens the tier screen once this closes.
  const canTier =
    !!movie && watchedNow.some((entry) => entry.movieId === movie.id && !isRated(entry));
  const showProgress = ranksAfter > ranksBefore || headline.kind === "title";
  // Milestones this very watch crossed (minutes, films, directors).
  const freshMilestones = getMilestones(watchedNow).filter(
    (milestone) => milestone.reachedAt && Date.now() - milestone.reachedAt < MILESTONE_FRESH_MS,
  );

  // Fades in; closes by fading out (✕, the backdrop, the system back).
  const appear = useSharedValue(0);
  useEffect(() => {
    appear.value = withTiming(1, { duration: 260 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once only — a second tap mid-close mustn't navigate twice.
  const closing = useRef(false);
  // `after`: what to open once it's gone (another sheet — two at once
  // don't mix). `goTo`: a screen to open right away, underneath, so it's
  // already there as this fades — no flash of the screen behind.
  const close = (after, goTo) => {
    if (closing.current) return;
    closing.current = true;
    if (goTo) navigation.navigate(...goTo);
    const finish = () => {
      hideAchievement();
      if (after) setTimeout(after, 250);
    };
    appear.value = withDelay(
      goTo ? 120 : 0,
      withTiming(0, { duration: 200 }, () => runOnJS(finish)()),
    );
  };
  const appearStyle = useAnimatedStyle(() => ({ opacity: appear.value }));

  // The main action: tier the film, else share a finished saga, else just
  // "Nice". The second: share (when tiering leads), else your ranks.
  const primary = canTier
    ? {
        label: t("Tier it"),
        icon: <Star size={16} color={colors.brandText} fill={colors.brandText} />,
        onPress: () => close(null, ["TierMovie", { movieId: movie.id }]),
      }
    : shareCollectionId
      ? {
          label: t("Share it"),
          icon: <Share2 size={16} color={colors.brandText} strokeWidth={2.2} />,
          onPress: () => close(() => openShareCard(shareCollectionId)),
        }
      : { label: t("Nice"), onPress: () => close() };
  const secondary =
    canTier && shareCollectionId
      ? { label: t("Share it"), onPress: () => close(() => openShareCard(shareCollectionId)) }
      : { label: t("See your ranks"), onPress: () => close(null, ["Ranks"]) };

  const hero =
    movie && headline.kind !== "title" ? (
      <PosterHero movie={movie} stamp={headline.lead} color={color} styles={styles} />
    ) : headline.lead ? (
      <Animated.View entering={HERO_IN.delay(120)}>
        <RankBadge track={headline.lead.track} step={headline.lead} size={HERO_HEIGHT - 70} />
      </Animated.View>
    ) : (
      <Animated.View entering={HERO_IN.delay(120)}>
        <DialogArt
          kind={headline.kind === "title" ? "level" : headline.kind}
          color={color}
          level={headline.kind === "title" ? getTitle(ranksAfter).step : null}
          size={HERO_HEIGHT - 30}
        />
      </Animated.View>
    );
  const still = movie?.backdrop ?? movie?.poster ?? null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => close()}>
      <Animated.View style={[styles.screen, { direction }, appearStyle]}>
        {/* The film behind it, darkened — or the moment's colour glowing on
            the page. Tap it to close. */}
        {still && (
          <Image
            source={{ uri: still }}
            blurRadius={movie?.backdrop ? 6 : 30}
            style={[StyleSheet.absoluteFill, styles.still]}
            resizeMode="cover"
          />
        )}
        <LinearGradient
          colors={[withAlpha(colors.background, "B3"), withAlpha(colors.background, "E6"), colors.background]}
          locations={[0, 0.5, 0.85]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[withAlpha(color, "38"), withAlpha(color, "00")]}
          locations={[0, 0.6]}
          style={StyleSheet.absoluteFill}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessible={false} />

        {headline.confetti && (
          <Confetti palette={[color, colors.accent, colors.rating, colors.success, colors.danger]} />
        )}

        <View
          style={[
            styles.content,
            { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.md },
          ]}
          pointerEvents="box-none"
          accessibilityViewIsModal
        >
          {/* The hero over its rays, then what it is. */}
          <View style={styles.middle} pointerEvents="box-none">
            <View style={styles.heroWrap} pointerEvents="none">
              <HeroGlow color={color} />
              {hero}
            </View>
            {/* Wrapped, so the app's Text (and its Arabic font) draws them. */}
            <Animated.View entering={FadeInDown.duration(320).delay(220)}>
              <Text style={[styles.eyebrow, { color }]}>{headline.eyebrow}</Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(320).delay(280)}>
              <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
                {headline.title}
              </Text>
            </Animated.View>
            {!!headline.subtitle && (
              <Animated.View entering={FadeInDown.duration(320).delay(330)}>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {headline.subtitle}
                </Text>
              </Animated.View>
            )}

            {headline.also.length > 0 && (
              <View style={styles.alsoBlock}>
                <Text style={styles.alsoLabel}>{t("Also earned")}</Text>
                <ScrollView
                  style={[styles.alsoScroll, { maxHeight: windowHeight * 0.2 }]}
                  contentContainerStyle={styles.alsoList}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {headline.also.map((item, index) => (
                    <AlsoRow
                      key={item.key}
                      item={item}
                      index={index}
                      last={index === headline.also.length - 1}
                      color={color}
                      styles={styles}
                      colors={colors}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {freshMilestones.length > 0 && (
              <Animated.View entering={FadeInDown.duration(320).delay(ROWS_DELAY)} style={styles.milestones}>
                <Text style={styles.alsoLabel}>{t("New milestone")}</Text>
                <View style={styles.medals}>
                  {freshMilestones.slice(0, 3).map((milestone) => (
                    <View key={milestone.key} style={styles.medal}>
                      <MilestoneMedal milestone={milestone} size={MEDAL} />
                      <Text style={styles.medalLabel} numberOfLines={1}>
                        {t(milestone.label)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {showProgress && (
              <TitleProgress
                ranksBefore={ranksBefore}
                ranksAfter={ranksAfter}
                color={colors.rating}
                styles={styles}
                colors={colors}
              />
            )}

            {/* Always a next goal. */}
            {upNext && (
              <Animated.View
                entering={FadeInDown.duration(300).delay(ROWS_DELAY + 200)}
                style={styles.upNext}
              >
                <TrendingUp size={15} color={colors.textSecondary} strokeWidth={2.2} />
                <Text style={styles.upNextText} numberOfLines={1}>
                  {describeNext(upNext)}
                  <Text style={styles.upNextTrack}>{` · ${t(upNext.title)}`}</Text>
                </Text>
              </Animated.View>
            )}
          </View>

          {/* The two actions: red, then grey with red words. */}
          <Animated.View entering={FadeIn.duration(300).delay(500)} style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.button, styles.buttonMain, pressed && styles.pressed]}
              onPress={primary.onPress}
              accessibilityRole="button"
            >
              {primary.icon}
              <Text style={[styles.buttonText, styles.buttonMainText]}>{primary.label}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.button, styles.buttonQuiet, pressed && styles.pressed]}
              onPress={secondary.onPress}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, styles.buttonQuietText]}>{secondary.label}</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* ✕, top corner. */}
        <Pressable
          style={({ pressed }) => [styles.close, { top: insets.top + spacing.sm }, pressed && styles.pressed]}
          onPress={() => close()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("Close")}
        >
          <X size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

// Layout-only styles the glow needs outside createStyles: centred on the
// hero.
const styles_ = StyleSheet.create({
  glow: {
    position: "absolute",
    alignSelf: "center",
    width: GLOW,
    height: GLOW,
  },
});

const createStyles = (colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    still: {
      opacity: 0.55,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.md,
    },
    middle: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    heroWrap: {
      height: HERO_HEIGHT,
      alignSelf: "stretch",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    close: {
      position: "absolute",
      end: spacing.md,
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.buttonFill,
      borderRadius: 19,
    },
    pressed: {
      opacity: 0.75,
    },

    // Hero
    posterHero: {
      transform: [{ rotate: "-4deg" }],
    },
    stampWrap: {
      position: "absolute",
      end: -16,
      bottom: -12,
    },
    stampTile: {
      padding: 3,
      backgroundColor: colors.background,
      borderRadius: shape.card,
    },
    stampCheck: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: colors.background,
    },

    // Heading: what kind of moment, what you earned, where
    eyebrow: {
      ...typography.section,
      fontSize: 13,
    },
    title: {
      fontFamily: fonts.extraBold,
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -0.8,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 2,
    },

    // Also earned
    alsoBlock: {
      alignSelf: "stretch",
    },
    alsoLabel: {
      ...typography.section,
      color: colors.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    alsoScroll: {
      alignSelf: "stretch",
      flexGrow: 0,
      flexShrink: 1,
      minHeight: 0,
    },
    // One grouped card, a hairline between the rows.
    alsoList: {
      backgroundColor: colors.card,
      borderRadius: shape.card,
      overflow: "hidden",
    },
    alsoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 4,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
    },
    alsoRule: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    // New milestones: their medals in a row.
    milestones: {
      alignSelf: "stretch",
      alignItems: "center",
    },
    medals: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.lg,
    },
    medal: {
      alignItems: "center",
      maxWidth: MEDAL + 30,
    },
    medalLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs + 2,
    },
    alsoIcon: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    alsoText: {
      flex: 1,
      gap: 1,
    },
    alsoTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    alsoDetail: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    alsoGain: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
    },

    // Title bar
    titleBlock: {
      alignSelf: "stretch",
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      gap: spacing.sm + 2,
      borderRadius: shape.card,
    },
    titleTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
    },
    // The chip sits on the slate, so the page's colour for its text.
    countChip: {
      minWidth: 34,
      height: 34,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    countChipText: {
      ...typography.title,
      fontSize: 16,
      lineHeight: 22,
      color: colors.background,
    },
    titleText: {
      flex: 1,
    },
    titleName: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    titleGain: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
    },
    titleToGo: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    barTrack: {
      height: 8,
      overflow: "hidden",
      backgroundColor: colors.border,
      borderRadius: shape.chip,
    },
    barFill: {
      height: "100%",
    },

    // Up next
    upNext: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
      gap: spacing.sm,
      marginTop: spacing.sm + 4,
    },
    upNextText: {
      ...typography.caption,
      flex: 1,
      color: colors.textPrimary,
    },
    upNextTrack: {
      color: colors.textSecondary,
    },

    // Actions: red, then grey with red words, full width.
    actions: {
      gap: spacing.sm,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 50,
      borderRadius: shape.card,
    },
    buttonMain: {
      backgroundColor: colors.brand,
    },
    buttonQuiet: {
      backgroundColor: colors.buttonFill,
    },
    buttonText: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    buttonMainText: {
      color: colors.brandText,
    },
    buttonQuietText: {
      color: colors.brand,
    },
  });

export default AchievementModal;

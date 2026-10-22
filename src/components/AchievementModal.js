import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Check, ChevronRight, Star, TrendingUp } from "lucide-react-native";
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
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeInDown,
  ZoomIn,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Path, RadialGradient, Stop } from "react-native-svg";

import { getMovieById } from "../data/movies";
import { t, useIsRTL, useLayoutDirection } from "../i18n";
import { useAchievementStore } from "../store/achievementStore";
import { useMovieStore } from "../store/movieStore";
import { openShareCard } from "../store/shareCardStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";
import { describeNext, getClosestRanks, getTitle, sortByRarity } from "../utils/ranks";
import { isRated } from "../utils/tiers";
import { useRankRarity, useRankSummary } from "../utils/useRanks";
import { Text } from "./AppText";
import { DialogArt } from "./DialogArt";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";
import { RankBadge } from "./RankBadge";

// The reward moment: a sheet that rises from the bottom over a dimmed,
// blurred version of what you just did. The thing you earned leads —
// by name, not a generic "New Rank!":
//
//   ┌ rays ┐   the hero — the film you watched (its rank tile stamped on
//   │ HERO │   the corner), or the rank's tile, or the title art — over
//   └──────┘   slow light rays in the moment's colour
//   NEW RANK                       what kind of moment
//   Explorer                       what you earned
//   Time Traveler · 14% of watchers
//   also earned                    anything else this one action brought
//   [23] Lead ━━━━━━━━━━──  7 ranks to Star   (fills from before to after)
//   ↗ 1 film to Wolf · King of the World      (what's next)
//   [ Tier it ]                    one main action
//   See your ranks ›   Later
//
// Swipe it down, tap outside or tap a button to close. Everything that
// moves respects the system's Reduce Motion.

const HERO_HEIGHT = 176;
const HERO_OVERLAP = 76; // how far the hero hangs over the sheet
const POSTER_WIDTH = 112;
const RAYS_SIZE = 340;
const BAR_DELAY = 450;
const BAR_MS = 700;
const ROWS_DELAY = 380;
const ROW_STAGGER = 70;
const DISMISS_DISTANCE = 110;
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

// Light rays behind the hero: thin wedges fading out from the centre,
// turning slowly.
const RAY_COUNT = 14;
const rayPath = (index, radius) => {
  const center = radius;
  const angle = (index * 360) / RAY_COUNT;
  const half = 5.5;
  const point = (degrees) => {
    const radians = (degrees * Math.PI) / 180;
    return `${(center + Math.cos(radians) * radius).toFixed(1)} ${(center + Math.sin(radians) * radius).toFixed(1)}`;
  };
  return `M${center} ${center} L${point(angle - half)} L${point(angle + half)} Z`;
};

const Rays = ({ color }) => {
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.value = withTiming(1, { duration: 500 });
    if (reduceMotion) return;
    rotation.value = withRepeat(
      withTiming(360, { duration: 30000, easing: Easing.linear }),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ rotate: `${rotation.value}deg` }, { scale: 0.6 + appear.value * 0.4 }],
  }));

  const radius = RAYS_SIZE / 2;
  return (
    <Animated.View pointerEvents="none" style={[styles_.rays, style]}>
      <Svg width={RAYS_SIZE} height={RAYS_SIZE}>
        <Defs>
          <RadialGradient id="rayFade" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="0.55" />
            <Stop offset="0.45" stopColor={color} stopOpacity="0.18" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {Array.from({ length: RAY_COUNT }, (_, index) => (
          <Path key={index} d={rayPath(index, radius)} fill="url(#rayFade)" />
        ))}
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
const AlsoRow = ({ item, index, color, styles, colors }) => (
  <Animated.View
    entering={FadeInDown.duration(300).delay(ROWS_DELAY + index * ROW_STAGGER)}
    style={styles.alsoRow}
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
export const AchievementModal = () => {
  const achievement = useAchievementStore((state) => state.achievement);
  if (!achievement) return null;
  // Keyed so every new achievement remounts — everything replays.
  return <AchievementDialog key={achievement.id} achievement={achievement} />;
};

const AchievementDialog = ({ achievement }) => {
  const colors = useColors();
  const direction = useLayoutDirection();
  const rtl = useIsRTL();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation();
  const reduceMotion = useReducedMotion();
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

  // Rise in; close by sliding back down (button, outside tap, swipe).
  const translateY = useSharedValue(reduceMotion ? 0 : windowHeight);
  const backdrop = useSharedValue(0);
  useEffect(() => {
    backdrop.value = withTiming(1, { duration: 220 });
    translateY.value = withTiming(0, ARRIVE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once only — a second tap mid-close mustn't navigate twice.
  const closing = useRef(false);
  const close = (after) => {
    if (closing.current) return;
    closing.current = true;
    const finish = () => {
      hideAchievement();
      if (after) setTimeout(after, 250);
    };
    backdrop.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(
      windowHeight,
      { duration: 240, easing: Easing.in(Easing.quad) },
      () => runOnJS(finish)(),
    );
  };

  const pan = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > 900) {
        runOnJS(close)();
      } else {
        translateY.value = withTiming(0, ARRIVE);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  // The one main action: tier the film, else share a finished saga, else
  // just "Nice". The others close it ("Later").
  const primary = canTier
    ? {
        label: t("Tier it"),
        icon: <Star size={16} color={colors.accentContrast} />,
        onPress: () => close(() => navigation.navigate("TierMovie", { movieId: movie.id })),
        dismissible: true,
      }
    : shareCollectionId
      ? {
          label: t("Share it"),
          onPress: () => close(() => openShareCard(shareCollectionId)),
          dismissible: true,
        }
      : { label: t("Nice"), onPress: () => close(), dismissible: false };
  const openRanks = () => close(() => navigation.navigate("Ranks"));

  const hero =
    movie && headline.kind !== "title" ? (
      <PosterHero movie={movie} stamp={headline.lead} color={color} styles={styles} />
    ) : headline.lead ? (
      <Animated.View entering={HERO_IN.delay(120)}>
        <RankBadge track={headline.lead.track} step={headline.lead} size={HERO_HEIGHT - 56} />
      </Animated.View>
    ) : (
      <Animated.View entering={HERO_IN.delay(120)}>
        <DialogArt
          kind={headline.kind === "title" ? "level" : headline.kind}
          color={color}
          level={headline.kind === "title" ? getTitle(ranksAfter).step : null}
          size={HERO_HEIGHT - 16}
        />
      </Animated.View>
    );

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => close()}>
      <GestureHandlerRootView style={{ flex: 1, direction }}>
        {/* The moment behind it: the poster blurred (or the moment's colour
            glowing), dimmed. Tap it to close. */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <View style={[StyleSheet.absoluteFill, styles.scrim]} />
          {movie && (
            <Image
              source={{ uri: movie.poster }}
              blurRadius={40}
              style={[StyleSheet.absoluteFill, styles.backdropImage]}
            />
          )}
          <LinearGradient
            colors={[withAlpha(color, "40"), "rgba(0,0,0,0)"]}
            locations={[0, 0.7]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel={t("Close")} />
        </Animated.View>

        {headline.confetti && (
          <Confetti palette={[color, colors.accent, colors.rating, colors.success, colors.danger]} />
        )}

        {/* Kept below the status bar: however much there is, the sheet never
            grows past it — the "also earned" list shrinks and scrolls. */}
        <View style={[styles.bottom, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.sheetWrap, sheetStyle]}>
              <Rays color={color} />

              <View style={[styles.card, { paddingBottom: insets.bottom + spacing.md }]} accessibilityViewIsModal>
                <View style={styles.grabber} />
                <Text style={[styles.eyebrow, { color }]}>{headline.eyebrow}</Text>
                <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
                  {headline.title}
                </Text>
                {!!headline.subtitle && (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {headline.subtitle}
                  </Text>
                )}

                {headline.also.length > 0 && (
                  <>
                    <Text style={styles.alsoLabel}>{t("Also earned")}</Text>
                    <ScrollView
                      style={[styles.alsoScroll, { maxHeight: windowHeight * 0.24 }]}
                      contentContainerStyle={styles.alsoList}
                      showsVerticalScrollIndicator={false}
                      bounces={false}
                    >
                      {headline.also.map((item, index) => (
                        <AlsoRow key={item.key} item={item} index={index} color={color} styles={styles} colors={colors} />
                      ))}
                    </ScrollView>
                  </>
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

                <PrimaryButton label={primary.label} icon={primary.icon} onPress={primary.onPress} style={styles.primary} />
                <View style={styles.links}>
                  <Pressable onPress={openRanks} hitSlop={8} style={styles.link} accessibilityRole="button">
                    <Text style={styles.linkText}>{t("See your ranks")}</Text>
                    <ChevronRight size={15} color={colors.textSecondary} style={rtl && styles.flipped} />
                  </Pressable>
                  {primary.dismissible && (
                    <Pressable onPress={() => close()} hitSlop={8} style={styles.link} accessibilityRole="button">
                      <Text style={styles.linkMuted}>{t("Later")}</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.heroWrap} pointerEvents="none">
                {hero}
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

// Layout-only styles the Rays component needs outside createStyles.
const styles_ = StyleSheet.create({
  rays: {
    position: "absolute",
    top: HERO_HEIGHT / 2 - RAYS_SIZE / 2,
    alignSelf: "center",
    width: RAYS_SIZE,
    height: RAYS_SIZE,
  },
});

const createStyles = (colors) =>
  StyleSheet.create({
    scrim: {
      backgroundColor: "rgba(2, 0, 2, 0.72)",
    },
    backdropImage: {
      opacity: 0.35,
    },
    bottom: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheetWrap: {
      paddingTop: HERO_HEIGHT - HERO_OVERLAP,
      flexShrink: 1,
      minHeight: 0,
    },
    heroWrap: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      height: HERO_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
      flexShrink: 1,
      minHeight: 0,
      alignItems: "center",
      backgroundColor: colors.cardElevated,
      paddingTop: HERO_OVERLAP + spacing.md,
      paddingHorizontal: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderRadius: shape.card,
    },
    grabber: {
      position: "absolute",
      top: spacing.sm,
      width: 36,
      height: 4,
      backgroundColor: colors.border,
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
      backgroundColor: colors.cardElevated,
      borderRadius: shape.card,
    },
    stampCheck: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: colors.cardElevated,
    },

    // Heading: what kind of moment, what you earned, where
    eyebrow: {
      ...typography.label,
      fontSize: 12,
      letterSpacing: 1.4,
    },
    title: {
      ...typography.display,
      fontSize: 30,
      lineHeight: 36,
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
    alsoLabel: {
      ...typography.caption,
      alignSelf: "stretch",
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    alsoScroll: {
      alignSelf: "stretch",
      flexGrow: 0,
      flexShrink: 1,
      minHeight: 0,
    },
    alsoList: {
      gap: 2,
    },
    alsoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 4,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm + 4,
      backgroundColor: colors.surfaceSoft,
      borderRadius: shape.card,
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
      padding: spacing.sm + 4,
      backgroundColor: colors.surfaceSoft,
      gap: spacing.sm + 2,
      borderRadius: shape.card,
    },
    titleTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
    },
    // The chip sits on the gold, so dark text.
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
      color: "#111214",
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

    // Actions
    primary: {
      alignSelf: "stretch",
      marginTop: spacing.md + 4,
    },
    links: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.xl,
      marginTop: spacing.sm + 4,
    },
    link: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingVertical: spacing.xs,
    },
    linkText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    linkMuted: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 19,
      color: colors.textMuted,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
  });

export default AchievementModal;

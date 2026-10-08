import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  Award,
  CalendarDays,
  Check,
  Clapperboard,
  Film,
  Layers,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from "lucide-react-native";
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
import { t, useLayoutDirection } from "../i18n";
import { useAchievementStore } from "../store/achievementStore";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { openShareCard } from "../store/shareCardStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { badgeParams } from "../utils/achievementFeedback";
import { getBadges } from "../utils/badges";
import { isRated } from "../utils/tiers";
import { getLevel } from "../utils/xp";
import { Text } from "./AppText";
import { BadgeArt } from "./BadgeArt";
import { getBadgeLook } from "./BadgeMedal";
import { DialogArt } from "./DialogArt";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";

// The reward moment, reimagined as a sheet that rises from the bottom over
// a dimmed, blurred version of what you just did:
//
//   ┌ rays ┐   the hero — the movie's own poster (stamped), the medal, or
//   │ HERO │   the level art — floats over the sheet's top edge, on slow
//   └──────┘   light rays in the moment's colour
//   eyebrow · title · what it was about
//   +225 XP           counts up
//   [7] Film Buff ━━━━━━━━━━━──  420 XP to level 8
//                     the bar fills from where you were to where you are;
//                     crossing a level fills it, flashes, flips the level
//                     and carries on
//   rewards           one row each, with its own icon, arriving in turn
//   [View progress] [Nice]
//
// Swipe it down, tap outside or tap a button to close. Everything that
// moves respects the system's Reduce Motion.

const HERO_HEIGHT = 168;
const HERO_OVERLAP = 72; // how far the hero hangs over the sheet
const POSTER_WIDTH = 112;
const RAYS_SIZE = 340;
const COUNT_UP_DELAY = 250;
const COUNT_UP_MS = 800;
const BAR_DELAY = 450;
const BAR_MS = 700;
const ROWS_DELAY = 380;
const ROW_STAGGER = 80;
const DISMISS_DISTANCE = 110;
// One easing for everything that arrives: quick, then settles — no
// overshoot, no wobble.
const ARRIVE = { duration: 340, easing: Easing.out(Easing.cubic) };
const HERO_IN = ZoomIn.duration(320).easing(Easing.out(Easing.cubic));
const CONFETTI_COUNT = 22;

// Each kind of moment has its colour (rays, XP, the bar, the art) and
// whether it's big enough for confetti. "multi" is one action earning
// several kinds at once ("Big Night!").
const getKindTheme = (kind, colors) =>
  ({
    watched: { color: colors.success, confetti: false, eyebrow: "Watched" },
    rewatch: { color: colors.success, confetti: false, eyebrow: "Rewatch" },
    badge: { color: colors.rating, confetti: false, eyebrow: "New badge" },
    collection: {
      color: colors.rating,
      confetti: true,
      eyebrow: "Collection",
    },
    challenge: { color: colors.danger, confetti: true, eyebrow: "Dare" },
    multi: { color: colors.rating, confetti: true, eyebrow: "Big night" },
    level: { color: colors.rating, confetti: true, eyebrow: "Level up" },
  })[kind] ?? {
    color: colors.textPrimary,
    confetti: false,
    eyebrow: "Reward",
  };

// One icon per kind of reward row (by its label — see achievementFeedback).
const ROW_ICONS = {
  Watched: Film,
  "New genre": Sparkles,
  "New decade": CalendarDays,
  "Director depth": Clapperboard,
  "Collection complete": Layers,
  "Dare complete": Target,
  "Badge earned": Award,
  Rated: Star,
  "Level up": TrendingUp,
};

// 8-digit hex (#RRGGBBAA) — every theme colour used here is 6-digit hex.
const withAlpha = (hex, alphaHex) => `${hex}${alphaHex}`;

// Counts from 0 up to `value` after `delay`, easing out. With Reduce
// Motion on it just shows the number.
const useCountUp = (value, delay = 0) => {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return undefined;
    }
    let frame;
    let start;
    const tick = () => {
      start ??= Date.now();
      const progress = Math.min(1, (Date.now() - start) / COUNT_UP_MS);
      setDisplay(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, delay, reduceMotion]);
  return display;
};

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
        <ConfettiPiece
          key={index}
          index={index}
          width={width}
          palette={palette}
        />
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
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: 0.6 + appear.value * 0.4 },
    ],
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

// The movie you watched, tilted in, with a check stamped on its corner.
const PosterHero = ({ movie, color, styles }) => (
  <Animated.View
    entering={HERO_IN.delay(120)}
    style={styles.posterHero}
  >
    <MoviePoster
      uri={movie.poster}
      shadow
      style={{ width: POSTER_WIDTH, height: POSTER_WIDTH * 1.5 }}
    />
    <Animated.View
      entering={ZoomIn.duration(220)
        .easing(Easing.out(Easing.cubic))
        .delay(420)}
      style={[styles.stamp, { backgroundColor: color }]}
    >
      <Check size={20} color="#FFFFFF" strokeWidth={3} />
    </Animated.View>
  </Animated.View>
);

// Where you are in your level, animated from before to after. Crossing a
// level fills the bar, flashes, flips the level number, and fills again
// from empty to the new progress.
const LevelProgress = ({ xpBefore, xpAfter, color, styles, colors }) => {
  const reduceMotion = useReducedMotion();
  const before = getLevel(xpBefore);
  const after = getLevel(xpAfter);
  const leveledUp = after.level > before.level;
  const [shown, setShown] = useState(reduceMotion ? after : before);
  const fill = useSharedValue(reduceMotion ? after.progress : before.progress);
  const flash = useSharedValue(0);
  const chipScale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    const timing = { duration: BAR_MS, easing: Easing.out(Easing.cubic) };
    const onLevelUp = () => {
      setShown(after);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };
    if (leveledUp) {
      fill.value = withDelay(
        BAR_DELAY,
        withSequence(
          withTiming(1, timing, (finished) => {
            if (finished) runOnJS(onLevelUp)();
          }),
          withTiming(0, { duration: 0 }),
          withTiming(after.progress, timing),
        ),
      );
      flash.value = withDelay(
        BAR_DELAY + BAR_MS,
        withSequence(
          withTiming(1, { duration: 120 }),
          withTiming(0, { duration: 500 }),
        ),
      );
      chipScale.value = withDelay(
        BAR_DELAY + BAR_MS,
        withSequence(
          withTiming(1.12, { duration: 160, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 220, easing: Easing.inOut(Easing.quad) }),
        ),
      );
    } else {
      fill.value = withDelay(BAR_DELAY, withTiming(after.progress, timing));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(fill.value, 0.02) * 100}%`,
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chipScale.value }],
  }));

  const toGo = Math.max(0, Math.ceil(shown.requiredXP - shown.currentXP));

  return (
    <View style={styles.levelBlock}>
      <View style={styles.levelTop}>
        <Animated.View
          style={[styles.levelChip, { backgroundColor: color }, chipStyle]}
        >
          <Text style={styles.levelChipText}>{shown.level}</Text>
        </Animated.View>
        <View style={styles.levelText}>
          <Text style={styles.levelName} numberOfLines={1}>
            {shown.name}
          </Text>
          <Text style={styles.levelToGo} numberOfLines={1}>
            {t("{count} XP to level {level}", {
              count: toGo,
              level: shown.level + 1,
            })}
          </Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <Animated.View
          style={[styles.barFill, { backgroundColor: color }, fillStyle]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.textPrimary },
            flashStyle,
          ]}
        />
      </View>
    </View>
  );
};

// One reward: its icon on a tint of the moment's colour, what and why,
// and the XP it added (or a check for recognition-only rewards).
const RewardRow = ({ row, index, color, styles, colors }) => {
  const Icon = ROW_ICONS[row.label] ?? Sparkles;
  return (
    <Animated.View
      entering={FadeInDown.duration(320).delay(ROWS_DELAY + index * ROW_STAGGER)}
      style={styles.row}
    >
      <View style={[styles.rowIcon, { backgroundColor: withAlpha(color, "22") }]}>
        <Icon size={20} color={color} strokeWidth={2.2} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {row.label}
        </Text>
        {!!row.detail && (
          <Text style={styles.rowDetail} numberOfLines={1}>
            {row.detail}
          </Text>
        )}
      </View>
      {row.xp != null ? (
        <View style={[styles.xpPill, { borderColor: withAlpha(color, "66") }]}>
          <Text style={[styles.xpPillText, { color }]}>+{row.xp}</Text>
        </View>
      ) : (
        <View style={[styles.checkPill, { backgroundColor: colors.successSoft }]}>
          <Check size={14} color={colors.success} strokeWidth={3} />
        </View>
      )}
    </Animated.View>
  );
};

// ---------- The dialog ----------

// Mounted once inside AppNavigator (needs useNavigation for "View
// progress"), so any screen can trigger it via
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
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation();
  const reduceMotion = useReducedMotion();
  const hideAchievement = useAchievementStore((state) => state.hideAchievement);

  const {
    title,
    rows,
    total,
    kind,
    shareCollectionId,
    tierMovieId,
    xpBefore,
    xpAfter,
  } = achievement;
  const theme = getKindTheme(kind, colors);
  const countedTotal = useCountUp(total, COUNT_UP_DELAY);

  const movie = tierMovieId ? getMovieById(tierMovieId) : null;
  // A badge moment shows the real medal (the first one earned here).
  // Plain store values only — a selector that builds a new array each time
  // would re-render forever.
  const badgeRow = kind === "badge" ? rows.find((row) => row.badge) : null;
  const watchedNow = useMovieStore((state) => state.watched);
  const bucketListNow = useMovieStore((state) => state.bucketList);
  const challengeHistory = useChallengeStore((state) => state.history);
  const badgeLook = badgeRow
    ? getBadgeLook(
        badgeRow.badge,
        getBadges(badgeParams(watchedNow, bucketListNow, challengeHistory)),
      )
    : null;
  const newLevel = xpAfter != null ? getLevel(xpAfter).level : null;
  // A movie you just watched and haven't tiered yet → "Tier it" leads, and
  // opens the tier screen once this closes.
  const canTier =
    !!movie &&
    watchedNow.some(
      (entry) => entry.movieId === movie.id && !isRated(entry),
    );
  // What the moment is about, under the title.
  const subtitle = movie
    ? `${movie.title} · ${movie.year}`
    : (badgeRow?.detail ?? rows.find((row) => row.detail)?.detail ?? null);

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

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  const handleShare = () => close(() => openShareCard(shareCollectionId));
  const handleTierIt = () =>
    close(() => navigation.navigate("TierMovie", { movieId: movie.id }));
  const handleViewProgress = () =>
    close(() =>
      navigation.navigate("Main", {
        screen: "Profile",
        params: { openLeagueSheet: true },
      }),
    );

  const hero = badgeLook ? (
    <Animated.View entering={HERO_IN.delay(120)}>
      <BadgeArt
        emblem={badgeRow.badge.category}
        tier={badgeLook.tierIndex}
        metal={badgeLook.metal}
        size={HERO_HEIGHT - 24}
      />
    </Animated.View>
  ) : movie && kind !== "level" ? (
    <PosterHero movie={movie} color={theme.color} styles={styles} />
  ) : (
    <Animated.View entering={HERO_IN.delay(120)}>
      <DialogArt
        kind={kind}
        color={theme.color}
        level={kind === "level" ? newLevel : null}
        size={HERO_HEIGHT - 16}
      />
    </Animated.View>
  );

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => close()}
    >
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
            colors={[withAlpha(theme.color, "40"), "rgba(0,0,0,0)"]}
            locations={[0, 0.7]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
        </Animated.View>

        {theme.confetti && (
          <Confetti
            palette={[
              theme.color,
              colors.accent,
              colors.rating,
              colors.success,
              colors.danger,
            ]}
          />
        )}

        <View style={styles.bottom} pointerEvents="box-none">
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.sheetWrap, sheetStyle]}>
              <Rays color={theme.color} />

              <View
                style={[
                  styles.card,
                  { paddingBottom: insets.bottom + spacing.md },
                ]}
              >
                <View style={styles.grabber} />
                <Text style={[styles.eyebrow, { color: theme.color }]}>
                  {t(theme.eyebrow)}
                </Text>
                <Text style={styles.title}>{title}</Text>
                {!!subtitle && (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}

                {total > 0 && (
                  <View style={styles.xpRow}>
                    <Text style={[styles.xpValue, { color: theme.color }]}>
                      +{countedTotal}
                    </Text>
                    <Text style={styles.xpUnit}>{t("XP")}</Text>
                  </View>
                )}

                {xpAfter != null && (
                  <LevelProgress
                    xpBefore={xpBefore ?? xpAfter}
                    xpAfter={xpAfter}
                    color={theme.color}
                    styles={styles}
                    colors={colors}
                  />
                )}

                {/* The breakdown: full width, left-aligned, one tile per
                    reward under a small "What you earned" label. */}
                <Text style={styles.rowsLabel}>{t("What you earned")}</Text>
                <ScrollView
                  style={[styles.rowsScroll, { maxHeight: windowHeight * 0.3 }]}
                  contentContainerStyle={styles.rows}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {rows.map((row, index) => (
                    <RewardRow
                      key={`${index}-${row.label}`}
                      row={row}
                      index={index}
                      color={theme.color}
                      styles={styles}
                      colors={colors}
                    />
                  ))}
                </ScrollView>

                {/* Finishing a director / actor / franchise set makes
                    sharing the main action — that's the brag moment. */}
                {canTier && (
                  <PrimaryButton
                    label={t("Tier it")}
                    icon={<Star size={16} color={colors.accentContrast} />}
                    onPress={handleTierIt}
                    style={styles.tierButton}
                  />
                )}
                <View style={[styles.actions, canTier && styles.actionsUnder]}>
                  <PrimaryButton
                    label={shareCollectionId ? t("Done") : t("View progress")}
                    variant="secondary"
                    onPress={shareCollectionId ? () => close() : handleViewProgress}
                    style={styles.flex}
                  />
                  <PrimaryButton
                    label={shareCollectionId ? t("Share it") : t("Nice")}
                    variant={canTier ? "secondary" : "primary"}
                    onPress={shareCollectionId ? handleShare : () => close()}
                    style={styles.flex}
                  />
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
    flex: {
      flex: 1,
    },
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
      alignItems: "center",
      backgroundColor: colors.cardElevated,
      paddingTop: HERO_OVERLAP + spacing.sm,
      paddingHorizontal: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
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
    stamp: {
      position: "absolute",
      end: -12,
      bottom: -10,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: colors.cardElevated,
    },

    // Heading
    eyebrow: {
      ...typography.bodyBold,
      fontSize: 12,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    title: {
      ...typography.hero,
      fontSize: 26,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: 2,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 2,
    },

    // XP total
    xpRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 6,
      marginTop: spacing.sm,
    },
    xpValue: {
      ...typography.display,
      fontSize: 44,
      lineHeight: 52,
      letterSpacing: -1,
    },
    xpUnit: {
      ...typography.title,
      fontSize: 18,
      color: colors.textSecondary,
    },

    // Level bar
    levelBlock: {
      alignSelf: "stretch",
      marginTop: spacing.md,
      padding: spacing.sm + 4,
      backgroundColor: colors.surfaceSoft,
      gap: spacing.sm + 2,
    },
    levelTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
    },
    // The chip sits on the moment's (light) colour, so dark text.
    levelChip: {
      minWidth: 34,
      height: 34,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    levelChipText: {
      ...typography.title,
      fontSize: 16,
      color: "#111214",
    },
    levelText: {
      flex: 1,
    },
    levelName: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    levelToGo: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    barTrack: {
      height: 8,
      overflow: "hidden",
      backgroundColor: colors.border,
    },
    barFill: {
      height: "100%",
    },

    // Reward rows — the card centres everything, so the list stretches
    // itself to full width, and each reward is its own roomy tile.
    rowsLabel: {
      ...typography.caption,
      alignSelf: "stretch",
      color: colors.textMuted,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    rowsScroll: {
      alignSelf: "stretch",
      flexGrow: 0,
    },
    rows: {
      gap: 2,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm + 4,
      paddingHorizontal: spacing.sm + 4,
      backgroundColor: colors.surfaceSoft,
    },
    rowIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowLabel: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    rowDetail: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    xpPill: {
      minWidth: 56,
      alignItems: "center",
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
      borderWidth: 1,
    },
    xpPillText: {
      ...typography.bodyBold,
      fontSize: 14,
    },
    checkPill: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },

    tierButton: {
      alignSelf: "stretch",
      marginTop: spacing.md,
    },
    // Under "Tier it": the two smaller actions, 2px below.
    actionsUnder: {
      marginTop: 2,
    },
    actions: {
      flexDirection: "row",
      alignSelf: "stretch",
      gap: 2,
      marginTop: spacing.md,
    },
  });

export default AchievementModal;

import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "./AppText";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useAchievementStore } from "../store/achievementStore";
import { useMovieStore } from "../store/movieStore";
import { openShareCard } from "../store/shareCardStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { badgeParams, giveRatingFeedback } from "../utils/achievementFeedback";
import { getBadges } from "../utils/badges";
import { getTier } from "../utils/tiers";
import { BadgeArt } from "./BadgeArt";
import { getBadgeLook } from "./BadgeMedal";
import { DialogArt, StampCheck } from "./DialogArt";
import { PrimaryButton } from "./PrimaryButton";
import { TierPicker } from "./TierPicker";
import { t, useLayoutDirection } from "../i18n";

const HERO_SIZE = 132;
const COUNT_UP_MS = 700;
const CONFETTI_COUNT = 22;

// Each reward type gets its own colour (the hero art draws in it — see
// DialogArt), so finishing a collection doesn't look identical to marking
// one movie watched. "multi" is when one action earned several kinds at
// once ("Big Night!"). Big moments also get a confetti burst.
const getKindTheme = (kind, colors) =>
  ({
    watched: { color: colors.textPrimary, confetti: false },
    rewatch: { color: colors.textPrimary, confetti: false },
    badge: { color: colors.rating, confetti: false },
    collection: { color: colors.success, confetti: true },
    challenge: { color: colors.accent, confetti: true },
    multi: { color: colors.rating, confetti: true },
    level: { color: colors.rating, confetti: true },
  })[kind] ?? { color: colors.textPrimary, confetti: false };

// 8-digit hex (#RRGGBBAA) — every theme color is a plain 6-digit hex.
const withAlpha = (hex, alphaHex) => `${hex}${alphaHex}`;

// Counts from 0 up to `value` once on mount, easing out.
// With the system's Reduce Motion on, it just shows the final number.
const useCountUp = (value) => {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return undefined;
    }
    let frame;
    const start = Date.now();
    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / COUNT_UP_MS);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion]);
  return display;
};

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

// Mounted once inside AppNavigator (needs useNavigation for "View Details")
// so any screen can trigger it via
// useAchievementStore.getState().showAchievement({...}) without prop-drilling
// navigation through every call site.
export const AchievementModal = () => {
  const achievement = useAchievementStore((state) => state.achievement);
  if (!achievement) return null;
  // Keyed so every new achievement remounts — count-up and confetti replay.
  return <AchievementDialog key={achievement.id} achievement={achievement} />;
};

const AchievementDialog = ({ achievement }) => {
  const colors = useColors();
  const direction = useLayoutDirection();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const hideAchievement = useAchievementStore((state) => state.hideAchievement);

  const { title, rows, total, kind, shareCollectionId, tierMovieId } =
    achievement;
  // Just marked watched → tier it right here, no trip to the movie page.
  const tierEntry = useMovieStore((state) =>
    tierMovieId
      ? state.watched.find((entry) => entry.movieId === tierMovieId)
      : null,
  );
  const handleTier = (tier) => {
    const watchedBefore = useMovieStore.getState().watched;
    useMovieStore.getState().setWatchedTier(tierMovieId, tier);
    giveRatingFeedback(watchedBefore);
  };
  const theme = getKindTheme(kind, colors);
  const countedTotal = useCountUp(total);

  // The movie this is about (a watch), shown under the title.
  const movie = tierMovieId ? getMovieById(tierMovieId) : null;
  // A badge moment shows the real medal (the highest one earned here).
  const badgeRow = kind === "badge" ? rows.find((row) => row.badge) : null;
  // Plain store values only — a selector that builds a new array each
  // time would re-render forever.
  const watchedNow = useMovieStore((state) => state.watched);
  const bucketListNow = useMovieStore((state) => state.bucketList);
  const challengeHistory = useChallengeStore((state) => state.history);
  const allBadges = badgeRow
    ? getBadges(badgeParams(watchedNow, bucketListNow, challengeHistory))
    : null;
  const badgeLook =
    badgeRow && allBadges ? getBadgeLook(badgeRow.badge, allBadges) : null;
  const levelNumber = Number(
    rows.find((row) => row.label === "Level up")?.detail?.match(/\d+/)?.[0],
  );

  const handleShare = () => {
    hideAchievement();
    // After the dialog's Modal has closed, so the two don't overlap.
    setTimeout(() => openShareCard(shareCollectionId), 250);
  };

  const handleViewDetails = () => {
    hideAchievement();
    navigation.navigate("Main", {
      screen: "Profile",
      params: { openLeagueSheet: true },
    });
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={hideAchievement}
    >
      {/* Modals are their own layer: carry the language's direction. */}
      <View style={{ flex: 1, direction }}>
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          style={styles.overlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={hideAchievement}
          />

          {theme.confetti && (
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

          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.card}
          >
            {/* Hero art — custom, per kind of moment */}
            <Animated.View entering={ZoomIn.duration(280)} style={styles.hero}>
              {badgeLook ? (
                <BadgeArt
                  emblem={badgeRow.badge.category}
                  tier={badgeLook.tierIndex}
                  metal={badgeLook.metal}
                  size={HERO_SIZE - 16}
                />
              ) : (
                <DialogArt
                  kind={kind}
                  color={theme.color}
                  level={Number.isFinite(levelNumber) ? levelNumber : null}
                  size={HERO_SIZE}
                />
              )}
            </Animated.View>

            <Text style={styles.title}>{title}</Text>
            {movie && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {movie.title}
              </Text>
            )}

            {/* XP as an admit-one ticket */}
            {total > 0 && (
              <View
                style={[
                  styles.xpTicket,
                  { borderColor: withAlpha(theme.color, "88") },
                ]}
              >
                <View style={[styles.xpNotch, styles.xpNotchLeft]} />
                <View style={[styles.xpNotch, styles.xpNotchRight]} />
                <Text style={[styles.xpValue, { color: theme.color }]}>
                  +{countedTotal}
                </Text>
                <Text style={styles.xpUnit}>{t("XP")}</Text>
              </View>
            )}

            {/* What it was for, as a box-office receipt */}
            <View style={styles.receipt}>
              {rows.map((row, index) => (
                <View key={`${index}-${row.label}`} style={styles.receiptRow}>
                  <Text style={styles.receiptLabel} numberOfLines={1}>
                    {row.label}
                    {row.detail ? (
                      <Text style={styles.receiptDetail}>
                        {"  "}
                        {row.detail}
                      </Text>
                    ) : null}
                  </Text>
                  <View style={styles.receiptLeader} />
                  {row.xp != null ? (
                    <Text style={styles.receiptXP}>+{row.xp}</Text>
                  ) : (
                    <StampCheck color={colors.success} />
                  )}
                </View>
              ))}
            </View>

            {tierEntry && (
              <View style={styles.tierBlock}>
                <Text style={styles.tierPrompt}>{t("How was it?")}</Text>
                <TierPicker
                  tier={getTier(tierEntry)}
                  onChange={handleTier}
                  compact
                />
              </View>
            )}

            {/* Finishing a director / actor / franchise set makes sharing
              the main action — that's the brag moment. */}
            {shareCollectionId ? (
              <PrimaryButton
                label={t("Share it")}
                onPress={handleShare}
                style={styles.primaryButton}
              />
            ) : (
              <PrimaryButton
                label={t("View details")}
                onPress={handleViewDetails}
                style={styles.primaryButton}
              />
            )}
            <PrimaryButton
              label={t("Nice")}
              variant="ghost"
              dense
              onPress={hideAchievement}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(2, 0, 2, 0.7)",
      paddingHorizontal: spacing.lg,
    },
    card: {
      width: "100%",
      alignItems: "center",
      backgroundColor: colors.cardElevated,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    hero: {
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.hero,
      fontSize: 24,
      color: colors.textPrimary,
      textAlign: "center",
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 2,
    },
    // An admit-one ticket: dashed edge, a half-circle notch cut into each
    // side (circles in the card's colour).
    xpTicket: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 5,
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg + 4,
      paddingVertical: spacing.xs,
      borderRadius: 0,
      borderWidth: 1.5,
      borderStyle: "dashed",
      overflow: "hidden",
    },
    xpNotch: {
      position: "absolute",
      top: "50%",
      width: 14,
      height: 14,
      marginTop: -7,
      borderRadius: 7,
      backgroundColor: colors.cardElevated,
    },
    xpNotchLeft: {
      start: -8,
    },
    xpNotchRight: {
      end: -8,
    },
    xpValue: {
      ...typography.display,
      fontSize: 30,
      lineHeight: 38,
    },
    xpUnit: {
      ...typography.subtitle,
      color: colors.textSecondary,
    },
    tierBlock: {
      width: "100%",
      marginTop: spacing.md,
    },
    tierPrompt: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    // Receipt: dashed tear edges top and bottom, one line per reward with a
    // dotted leader to the value.
    receipt: {
      width: "100%",
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: 1.5,
      borderBottomWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.border,
    },
    receiptRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
      paddingVertical: 6,
    },
    receiptLabel: {
      ...typography.bodyBold,
      flexShrink: 1,
      color: colors.textPrimary,
    },
    receiptDetail: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    receiptLeader: {
      flex: 1,
      minWidth: spacing.md,
      height: 1,
      borderBottomWidth: 1.5,
      borderStyle: "dotted",
      borderColor: colors.border,
    },
    receiptXP: {
      ...typography.bodyBold,
      color: colors.success,
    },
    primaryButton: {
      width: "100%",
      marginTop: spacing.lg,
    },
  });

export default AchievementModal;

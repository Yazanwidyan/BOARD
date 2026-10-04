import { useNavigation } from "@react-navigation/native";
import { Award, CheckCircle, RotateCw, Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useAchievementStore } from "../store/achievementStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { LayersIcon, TargetIcon } from "./icons/TabIcons";
import { PrimaryButton } from "./PrimaryButton";

const GLOW_SIZE = 104;
const COUNT_UP_MS = 700;
const CONFETTI_COUNT = 22;

// Each reward type gets its own icon + color, so finishing a collection
// doesn't look identical to marking one movie watched. "multi" is when one
// action earned several kinds at once ("Big Night!"). Big moments also get
// a confetti burst.
const getKindTheme = (kind, colors) =>
  ({
    watched: { Icon: CheckCircle, color: colors.accentLight, confetti: false },
    rewatch: { Icon: RotateCw, color: colors.accentLight, confetti: false },
    badge: { Icon: Award, color: colors.rating, confetti: false },
    collection: { Icon: LayersIcon, color: colors.success, confetti: true },
    challenge: { Icon: TargetIcon, color: colors.accent, confetti: true },
    multi: { Icon: Sparkles, color: colors.rating, confetti: true },
  })[kind] ?? {
    Icon: Sparkles,
    color: colors.accentLight,
    confetti: false,
  };

// 8-digit hex (#RRGGBBAA) — every theme color is a plain 6-digit hex.
const withAlpha = (hex, alphaHex) => `${hex}${alphaHex}`;

// Counts from 0 up to `value` once on mount, easing out.
const useCountUp = (value) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / COUNT_UP_MS);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
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

export const Confetti = ({ palette }) => {
  const { width } = useWindowDimensions();
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
    left: 0,
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
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const hideAchievement = useAchievementStore((state) => state.hideAchievement);

  const { title, rows, total, kind } = achievement;
  const theme = getKindTheme(kind, colors);
  const { Icon } = theme;
  const countedTotal = useCountUp(total);

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
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(150)}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={hideAchievement} />

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
          entering={ZoomIn.springify().damping(16).stiffness(180)}
          exiting={FadeOut.duration(150)}
          style={styles.card}
        >
          <View
            style={[
              styles.glow,
              {
                backgroundColor: withAlpha(theme.color, "24"),
                borderColor: withAlpha(theme.color, "55"),
              },
            ]}
          >
            <Icon size={44} color={theme.color} strokeWidth={2} />
          </View>

          <Text style={styles.title}>{title}</Text>

          <View style={styles.totalRow}>
            <Text style={[styles.totalValue, { color: theme.color }]}>
              +{countedTotal}
            </Text>
            <Text style={styles.totalUnit}>XP</Text>
          </View>

          <View style={styles.rows}>
            {rows.map((row, index) => (
              <View key={`${index}-${row.label}`} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  {row.detail && (
                    <Text style={styles.rowDetail} numberOfLines={1}>
                      {row.detail}
                    </Text>
                  )}
                </View>
                <Text style={styles.rowXP}>+{row.xp}</Text>
              </View>
            ))}
          </View>

          <PrimaryButton
            label="View Details"
            onPress={handleViewDetails}
            style={styles.primaryButton}
          />
          <PrimaryButton
            label="Nice"
            variant="ghost"
            dense
            onPress={hideAchievement}
          />
        </Animated.View>
      </Animated.View>
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
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.08)",
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    glow: {
      width: GLOW_SIZE,
      height: GLOW_SIZE,
      borderRadius: GLOW_SIZE / 2,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    title: {
      ...typography.hero,
      fontSize: 24,
      color: colors.textPrimary,
      textAlign: "center",
    },
    totalRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 4,
      marginTop: spacing.xs,
    },
    totalValue: {
      ...typography.display,
    },
    totalUnit: {
      ...typography.subtitle,
      color: colors.textSecondary,
    },
    rows: {
      width: "100%",
      marginTop: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowText: {
      flex: 1,
      marginRight: spacing.sm,
      gap: 1,
    },
    rowLabel: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    rowDetail: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    rowXP: {
      ...typography.bodyBold,
      color: colors.success,
    },
    primaryButton: {
      width: "100%",
      marginTop: spacing.lg,
    },
  });

export default AchievementModal;

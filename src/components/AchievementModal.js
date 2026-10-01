import { useNavigation } from "@react-navigation/native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";

import { useAchievementStore } from "../store/achievementStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { RankGemIcon } from "./icons/RankGemIcon";
import { PrimaryButton } from "./PrimaryButton";

// Mounted once inside AppNavigator (needs useNavigation for "View Details")
// so any screen can trigger it via
// useAchievementStore.getState().showAchievement({...}) without prop-drilling
// navigation through every call site. A real card — icon, glow, XP
// breakdown, actions — standing in for a native Alert, which read as a
// system dialog rather than something this app earned you.
const GEM_SIZE = 64;
const GLOW_SIZE = 108;

export const AchievementModal = () => {
  const colors = useColors();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const achievement = useAchievementStore((state) => state.achievement);
  const hideAchievement = useAchievementStore((state) => state.hideAchievement);

  if (!achievement) return null;

  const { title, rows, total } = achievement;
  const showTotal = rows.length > 1;

  const handleViewDetails = () => {
    hideAchievement();
    navigation.navigate("Main", {
      screen: "Profile",
      params: { openLeagueSheet: true },
    });
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={hideAchievement}>
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(150)}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={hideAchievement} />

        <Animated.View
          entering={ZoomIn.duration(280)}
          exiting={FadeOut.duration(150)}
          style={styles.card}
        >
          <View style={styles.glow}>
            <RankGemIcon size={GEM_SIZE} color={colors.accent} />
          </View>

          <Text style={styles.title}>{title}</Text>

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
                <View style={styles.xpPill}>
                  <Text style={styles.xpPillText}>+{row.xp} XP</Text>
                </View>
              </View>
            ))}
          </View>

          {showTotal && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>+{total} XP</Text>
            </View>
          )}

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
      backgroundColor: "rgba(2, 0, 2, 0.6)",
      paddingHorizontal: spacing.xl,
    },
    card: {
      width: "100%",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.xl,
      gap: spacing.xs,
    },
    glow: {
      width: GLOW_SIZE,
      height: GLOW_SIZE,
      borderRadius: GLOW_SIZE / 2,
      backgroundColor: colors.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.hero,
      fontSize: 22,
      color: colors.textPrimary,
      textAlign: "center",
    },
    rows: {
      width: "100%",
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.cardElevatedLight,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
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
    xpPill: {
      backgroundColor: colors.successSoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    xpPillText: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.success,
    },
    totalRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
    },
    totalLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    totalValue: {
      ...typography.title,
      color: colors.success,
    },
    primaryButton: {
      width: "100%",
      marginTop: spacing.md + spacing.sm,
    },
  });

export default AchievementModal;

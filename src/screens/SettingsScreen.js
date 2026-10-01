import {
  Bookmark,
  CheckCircle,
  ChevronRight,
  Clapperboard,
  Info,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Trash,
} from "lucide-react-native";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { useUserStore } from "../store/userStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { resetAppData } from "../utils/resetAppData";

const APP_VERSION = "1.0.0";

const SettingsRow = ({ icon, label, onPress, destructive, value }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <Text
        style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}
      >
        {label}
      </Text>
      {value ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : onPress ? (
        <ChevronRight size={18} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
};

const confirmAction = (title, message, onConfirm) => {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: onConfirm },
  ]);
};

export const SettingsScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const clearBucketList = useMovieStore((state) => state.clearBucketList);
  const clearPickedMovie = useMovieStore((state) => state.clearPickedMovie);
  const clearWatched = useMovieStore((state) => state.clearWatched);
  const endSession = useSessionStore((state) => state.endSession);
  const replayOnboarding = useUserStore((state) => state.replayOnboarding);
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.sectionLabel}>Discovery</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={<SlidersHorizontal size={18} color={colors.textPrimary} />}
            label="Preferences"
            onPress={() => navigation.navigate("Preferences")}
          />
          <SettingsRow
            icon={<Shuffle size={18} color={colors.textPrimary} />}
            label="Reset Recommendations"
            onPress={() =>
              confirmAction(
                "Reset Recommendations",
                "This will end your current pick session.",
                endSession,
              )
            }
          />
        </View>

        <Text style={styles.sectionLabel}>Your Data</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={<Bookmark size={18} color={colors.textPrimary} />}
            label="Clear Watchlist"
            destructive
            onPress={() =>
              confirmAction(
                "Clear Watchlist",
                "This will remove all movies from your watchlist.",
                clearBucketList,
              )
            }
          />
          <SettingsRow
            icon={<Clapperboard size={18} color={colors.textPrimary} />}
            label="Clear Current Pick"
            destructive
            onPress={() =>
              confirmAction(
                "Clear Current Pick",
                "This will remove tonight’s pick from your Home screen.",
                clearPickedMovie,
              )
            }
          />
          <SettingsRow
            icon={<CheckCircle size={18} color={colors.textPrimary} />}
            label="Clear Watched History"
            destructive
            onPress={() =>
              confirmAction(
                "Clear Watched History",
                "This will remove all movies marked as watched.",
                clearWatched,
              )
            }
          />
          <SettingsRow
            icon={<Trash size={18} color={colors.textPrimary} />}
            label="Reset App (Start Fresh)"
            destructive
            onPress={() =>
              confirmAction(
                "Reset App",
                "This wipes everything — watched, watchlist, XP, badges, challenges, profile — and takes you back through onboarding like a brand-new install. This can't be undone.",
                resetAppData,
              )
            }
          />
        </View>

        <Text style={styles.sectionLabel}>App</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={<RotateCcw size={18} color={colors.textPrimary} />}
            label="Replay Onboarding"
            onPress={replayOnboarding}
          />
          <SettingsRow
            icon={<Info size={18} color={colors.textPrimary} />}
            label="About"
            onPress={() =>
              Alert.alert(
                "BOARD",
                "BOARD turns deciding what to watch into a game — discover, build progress, unlock collections, and complete challenges as you go.",
              )
            }
          />
          <SettingsRow
            icon={<Info size={18} color={colors.textPrimary} />}
            label="Version"
            value={APP_VERSION}
          />
        </View>
      </ScrollView>
      <ScreenBottomFade />
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: spacing.sm,
      textAlign: "center",
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    rowPressed: {
      backgroundColor: colors.cardElevated,
    },
    rowIcon: {
      width: 28,
      alignItems: "center",
    },
    rowLabel: {
      ...typography.body,
      color: colors.textPrimary,
      flex: 1,
      marginLeft: spacing.sm,
    },
    rowLabelDestructive: {
      color: colors.textPrimary,
    },
    rowValue: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });

export default SettingsScreen;

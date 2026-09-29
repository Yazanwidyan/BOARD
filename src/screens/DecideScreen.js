import {
  Bot,
  ChevronRight,
  GalleryHorizontal,
  ListChecks,
  RotateCw,
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

import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const showComingSoon = (feature) => Alert.alert(feature, "Coming soon.");

// The two real, usable ways to decide — full-width feature cards with a
// solid accent badge and a large translucent "ghost" icon in the corner, so
// they read as the primary content on this screen.
const FeatureCard = ({ icon, ghostIcon, title, subtitle, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.featureCard} onPress={onPress}>
      <View style={styles.featureGhost}>{ghostIcon}</View>
      <View style={styles.featureIconBadge}>{icon}</View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </Pressable>
  );
};

// The not-yet-real ways to decide — small, muted, and clearly secondary so
// they never compete with the two features that actually work.
const SoonTile = ({ icon, label, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.soonTile} onPress={onPress}>
      {icon}
      <Text style={styles.soonLabel}>{label}</Text>
      <View style={styles.soonBadge}>
        <Text style={styles.soonBadgeText}>Soon</Text>
      </View>
    </Pressable>
  );
};

export const DecideScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Decide</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        <Text style={styles.intro}>
          Not sure what to watch tonight? Pick a way to decide.
        </Text>

        <FeatureCard
          icon={
            <GalleryHorizontal
              size={26}
              color={colors.accentContrast}
              strokeWidth={2}
            />
          }
          ghostIcon={
            <GalleryHorizontal
              size={96}
              color={colors.textPrimary}
              strokeWidth={1.2}
            />
          }
          title="Swipe to Decide"
          subtitle="Set your mood, then swipe through picks until one wins."
          onPress={() => navigation.navigate("Preferences")}
        />
        <FeatureCard
          icon={
            <RotateCw size={26} color={colors.accentContrast} strokeWidth={2} />
          }
          ghostIcon={
            <RotateCw size={96} color={colors.textPrimary} strokeWidth={1.2} />
          }
          title="Spin to Decide"
          subtitle="Spin the wheel through your watchlist for a random pick."
          onPress={() => navigation.navigate("Spin")}
        />

        <Text style={styles.sectionLabel}>More ways to decide</Text>
        <View style={styles.soonRow}>
          <SoonTile
            icon={<Bot size={22} color={colors.textMuted} strokeWidth={1.8} />}
            label="Ask AI"
            onPress={() => showComingSoon("Ask AI")}
          />
          <SoonTile
            icon={
              <ListChecks
                size={22}
                color={colors.textMuted}
                strokeWidth={1.8}
              />
            }
            label="Collaborative Lists"
            onPress={() => showComingSoon("Collaborative Lists")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
    },
    intro: {
      ...typography.body,
      color: colors.textSecondary,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    featureCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      overflow: "hidden",
    },
    featureGhost: {
      position: "absolute",
      right: -18,
      top: -18,
      opacity: 0.06,
    },
    featureIconBadge: {
      width: 56,
      height: 56,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    featureText: {
      flex: 1,
      gap: 4,
      marginRight: spacing.sm,
    },
    featureTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    featureSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
      marginLeft: spacing.md,
    },
    soonRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    soonTile: {
      flex: 1,
      alignItems: "flex-start",
      gap: spacing.xs,
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: spacing.md,
      opacity: 0.6,
    },
    soonLabel: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textMuted,
    },
    soonBadge: {
      position: "absolute",
      top: spacing.sm,
      right: spacing.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.sm,
      backgroundColor: colors.background,
    },
    soonBadgeText: {
      ...typography.label,
      fontSize: 9,
      color: colors.textMuted,
    },
  });

export default DecideScreen;

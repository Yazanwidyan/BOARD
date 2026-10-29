import { ChevronLeft } from "lucide-react-native";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { MilestoneMedal } from "../components/MilestoneMedal";
import { HeaderIconButton } from "../components/ScreenHeader";
import { useMoviesVersion } from "../data/movies";
import { t, useIsRTL } from "../i18n";
import { useLanguageStore } from "../store/languageStore";
import { useMovieStore } from "../store/movieStore";
import { spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getMilestones } from "../utils/milestones";

const COLUMNS = 3;
const GAP = spacing.md;

// Every milestone, as Apple Music Replay's Milestones page: a large title,
// then the medals three across — the reached ones first, with the day each
// was reached, then the ones in progress, in steel.
export const MilestonesScreen = ({ navigation }) => {
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const { width } = useWindowDimensions();
  const language = useLanguageStore((state) => state.language);
  const watched = useMovieStore((state) => state.watched);
  const milestones = getMilestones(watched);
  const medal = Math.floor((width - spacing.md * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const locale = language === "ar" ? "ar" : "en";

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t("Milestones")}</Text>
        <Text style={styles.subtitle}>{t("All time")}</Text>
        <View style={styles.grid}>
          {milestones.map((milestone) => (
            <View key={milestone.key} style={[styles.cell, { width: medal }]}>
              <MilestoneMedal milestone={milestone} size={medal} />
              <Text style={styles.when} numberOfLines={1}>
                {milestone.reachedAt
                  ? new Date(milestone.reachedAt).toLocaleDateString(locale, { day: "numeric", month: "long" })
                  : t("In progress")}
              </Text>
              <Text style={styles.kind} numberOfLines={1}>
                {t(milestone.short)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      {/* Back, floating over the page. */}
      <View style={[styles.back, { top: insets.top + spacing.sm }]}>
        <HeaderIconButton round onPress={() => navigation.goBack()} accessibilityLabel={t("Back")}>
          <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2} style={rtl && styles.flipped} />
        </HeaderIconButton>
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    back: {
      position: "absolute",
      start: spacing.md,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    title: {
      fontFamily: fonts.extraBold,
      fontSize: 36,
      lineHeight: 42,
      letterSpacing: -0.8,
      color: colors.textPrimary,
      paddingHorizontal: spacing.md,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.lg,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: GAP,
      rowGap: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    cell: {
      alignItems: "center",
    },
    // The day it was reached, or "In progress": small grey capitals.
    when: {
      ...typography.section,
      color: colors.textMuted,
      marginTop: spacing.md,
    },
    kind: {
      ...typography.subtitle,
      fontSize: 16,
      color: colors.textPrimary,
      marginTop: 2,
    },
  });

export default MilestonesScreen;

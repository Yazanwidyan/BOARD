import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { LaurelIcon } from "../components/icons/Laurel";
import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { TrophyCabinet, getAllTrophies } from "../components/TrophyCabinet";
import { useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

// Your collections, all of them — every saga: the ones you've completed,
// in gold laurels (newest first), then the rest in pewter, the closest to
// done first, each with how far along you are. Opened from Profile and from
// Library's Collections. (Its route is still "Trophies".)
export const TrophiesScreen = ({ navigation }) => {
  useMoviesVersion();
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const watched = useMovieStore((state) => state.watched);

  const all = getAllTrophies(watched);
  const won = all.filter((item) => !item.progress);
  const toWin = all.filter((item) => item.progress);
  const openCollection = (collectionId) => navigation.push("CollectionDetails", { collectionId });

  return (
    <View style={styles.container}>
      <StackHeader title={t("Your collections")} onBack={() => navigation.goBack()} scrollY={headerScroll.scrollY} />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* How many, big, over its laurels. */}
        <View style={styles.summary}>
          <LaurelIcon size={56} />
          <Text style={styles.count}>
            {t("{count} of {total} completed", { count: won.length, total: all.length })}
          </Text>
          <Text style={styles.hint}>{t("Watch every film in a collection to complete it.")}</Text>
        </View>

        {won.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.heading}>{t("Completed")}</Text>
            <TrophyCabinet finished={won} onOpen={openCollection} />
          </View>
        )}

        {toWin.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.heading}>{t("Not finished yet")}</Text>
            <TrophyCabinet finished={toWin} onOpen={openCollection} />
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
    },
    summary: {
      alignItems: "center",
      gap: spacing.xs,
    },
    count: {
      fontFamily: fonts.extraBold,
      fontSize: 28,
      lineHeight: 34,
      color: colors.textPrimary,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
    },
    section: {
      marginTop: spacing.section,
    },
    heading: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      lineHeight: 26,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
  });

export default TrophiesScreen;

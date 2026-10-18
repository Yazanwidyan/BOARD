import * as Sharing from "expo-sharing";
import { Share2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { Text } from "../components/AppText";
import { ReelBoardIcon } from "../components/icons/TabIcons";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { StackHeader } from "../components/ScreenHeader";
import { t } from "../i18n";
import { useLanguageStore } from "../store/languageStore";
import { useMovieStore } from "../store/movieStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { buildRecap, getRecapPeriods } from "../utils/recap";
import { getTier, getTierInfo } from "../utils/tiers";
import { useMoviesVersion } from "../data/movies";

// "Your month on ReelBoard": a recap of a month or the year so far — how
// much you watched, your top genres and director, your favourites and the
// XP it earned — as a card you can share. Opened from Profile, from Home at
// the start of a month, and from the monthly notification.
export const RecapScreen = ({ navigation, route }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const language = useLanguageStore((state) => state.language);
  const watched = useMovieStore((state) => state.watched);
  const periods = getRecapPeriods();
  const [periodKey, setPeriodKey] = useState(route?.params?.period ?? periods[0].key);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef(null);

  const period = periods.find((item) => item.key === periodKey) ?? periods[0];
  const recap = buildRecap(watched, period);
  const locale = language === "ar" ? "ar" : "en";
  const periodName =
    period.kind === "year"
      ? String(period.date.getFullYear())
      : period.date.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const hours = Math.round(recap.minutes / 60);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    const fallback = t("My {period} on ReelBoard: {count} movies, {hours} hours.", {
      period: periodName,
      count: recap.count,
      hours,
    });
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile" });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png" });
      } else {
        await Share.share({ message: fallback });
      }
    } catch {
      await Share.share({ message: fallback });
    } finally {
      setSharing(false);
    }
  };

  const labels = {
    "this-month": t("This month"),
    "last-month": t("Last month"),
    "this-year": t("This year"),
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("Your recap")} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.periods}>
          {periods.map((item) => {
            const selected = item.key === period.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.period, selected && styles.periodSelected]}
                onPress={() => setPeriodKey(item.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.periodText, selected && styles.periodTextSelected]}>
                  {labels[item.key]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {recap.count === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.title}>{t("Nothing logged for {period} yet", { period: periodName })}</Text>
            <Text style={styles.muted}>
              {t("Watch something and mark it watched — your recap fills in as you go.")}
            </Text>
            <PrimaryButton
              label={t("Find something to watch")}
              onPress={() => navigation.navigate("Main", { screen: "Decide" })}
              style={styles.fullButton}
            />
          </View>
        ) : (
          <>
            {/* The card — this is what gets shared. */}
            <View ref={cardRef} collapsable={false} style={styles.card}>
              <View style={styles.cardTop}>
                <ReelBoardIcon size={22} color={colors.textPrimary} />
                <Text style={styles.cardBrand}>ReelBoard</Text>
              </View>
              <Text style={styles.cardPeriod}>{periodName}</Text>

              <View style={styles.stats}>
                {[
                  [recap.count, recap.count === 1 ? t("movie") : t("movies")],
                  [`${hours}h`, t("watched")],
                  [`+${recap.xp}`, "XP"],
                ].map(([value, label]) => (
                  <View key={label} style={styles.stat}>
                    <Text style={styles.statValue}>{value}</Text>
                    <Text style={styles.statLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              {recap.favourites.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>{t("Favourites")}</Text>
                  <View style={styles.posters}>
                    {recap.favourites.map(({ movie, entry }) => {
                      const tier = getTierInfo(getTier(entry));
                      return (
                        <View key={movie.id} style={styles.posterWrap}>
                          <MoviePoster uri={movie.poster} style={styles.poster} />
                          {tier && (
                            <View style={[styles.tierTag, { backgroundColor: tier.color }]}>
                              <Text style={styles.tierText}>{tier.key}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {recap.topGenres.length > 0 && (
                <Text style={styles.line}>
                  <Text style={styles.lineLabel}>{t("Top genres")} · </Text>
                  {recap.topGenres.map(({ key }) => t(key)).join(", ")}
                </Text>
              )}
              {recap.topDirector && (
                <Text style={styles.line}>
                  <Text style={styles.lineLabel}>{t("Most watched director")} · </Text>
                  {t("{name} ({count} films)", { name: recap.topDirector.key, count: recap.topDirector.count })}
                </Text>
              )}
              {recap.longest && (
                <Text style={styles.line}>
                  <Text style={styles.lineLabel}>{t("Longest sit")} · </Text>
                  {recap.longest.title} ({recap.longest.runtime} min)
                </Text>
              )}
            </View>

            <PrimaryButton
              label={sharing ? t("Preparing…") : t("Share your recap")}
              icon={<Share2 size={16} color={colors.accentContrast} />}
              onPress={share}
              disabled={sharing}
              style={styles.fullButton}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    body: {
      padding: spacing.md,
      gap: spacing.md,
    },
    periods: {
      flexDirection: "row",
      gap: 2,
    },
    period: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.sm + 2,
      backgroundColor: colors.card,
    },
    periodSelected: {
      backgroundColor: colors.selected,
    },
    periodText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    periodTextSelected: {
      color: colors.selectedText,
    },
    empty: {
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xl,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
      textAlign: "center",
    },
    muted: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
    fullButton: {
      alignSelf: "stretch",
    },
    card: {
      padding: spacing.lg,
      backgroundColor: colors.card,
      gap: spacing.sm,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
    },
    cardBrand: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    cardPeriod: {
      ...typography.display,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    stats: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginVertical: spacing.sm,
    },
    stat: {
      alignItems: "flex-start",
    },
    statValue: {
      ...typography.hero,
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    sectionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    posters: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
    },
    posterWrap: {
      width: "31.8%",
    },
    poster: {
      width: "100%",
      aspectRatio: 2 / 3,
    },
    tierTag: {
      position: "absolute",
      top: 4,
      start: 4,
      minWidth: 20,
      alignItems: "center",
      paddingHorizontal: 4,
    },
    tierText: {
      ...typography.label,
      fontSize: 12,
      color: "#0C1014",
    },
    line: {
      ...typography.body,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    lineLabel: {
      color: colors.textMuted,
    },
  });

export default RecapScreen;

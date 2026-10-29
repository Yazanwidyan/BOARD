import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, Share, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { Text } from "../components/AppText";
import { MilestoneMedal } from "../components/MilestoneMedal";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { HeaderIconButton } from "../components/ScreenHeader";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { t, useIsRTL } from "../i18n";
import { useLanguageStore } from "../store/languageStore";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getSagaForPerson } from "../utils/collections";
import { getMilestones } from "../utils/milestones";
import { formatRuntime } from "../utils/movieFilters";
import { buildRecap, getRecapPeriods } from "../utils/recap";
import { getTier, tierRank } from "../utils/tiers";

const HERO_HEIGHT = 380;
const GAP = spacing.rail;
const GENRE_TILE = 150;
const ROW_ART = 54;
const SHOWN = 6;
const MILESTONES_SHOWN = 6;

// The films watched in a period, grouped by `keysOf` (a film's director,
// its genres…): [{ key, count, minutes, top }] — the most watched first,
// `top` the best-tiered film of each.
const groupWatched = (entries, keysOf) => {
  const groups = new Map();
  entries.forEach((entry) => {
    const movie = getMovieById(entry.movieId);
    if (!movie) return;
    [keysOf(movie)]
      .flat()
      .filter(Boolean)
      .forEach((key) => {
        const group = groups.get(key) ?? { key, count: 0, minutes: 0, top: null };
        group.count += 1;
        group.minutes += movie.runtime ?? 0;
        if (!group.top || tierRank(entry) < tierRank(group.top.entry)) group.top = { movie, entry };
        groups.set(key, group);
      });
  });
  return [...groups.values()].sort((a, b) => b.count - a.count || b.minutes - a.minutes);
};

// A section's heading, as in Apple Music: big and bold, with a › when it
// opens somewhere.
const Heading = ({ title, onPress, styles, colors, rtl }) => (
  <Pressable
    style={({ pressed }) => [styles.heading, pressed && onPress && styles.pressed]}
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole={onPress ? "button" : "header"}
  >
    <Text style={styles.headingText} numberOfLines={1}>
      {title}
    </Text>
    {onPress && <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.6} style={rtl && styles.flipped} />}
  </Pressable>
);

// Your recap, as Apple Music Replay: the headline ("2,824 minutes in
// September.") over your top film's still, the period, then your top films
// as big ranked cards, your top directors as a ranked list, your top genres
// as tiles and your milestones as medals (with their own page). Share sends
// the headline as an image. Opened from Home's Replay, Library, Profile and
// the monthly notification.
export const RecapScreen = ({ navigation, route }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const { width } = useWindowDimensions();
  const language = useLanguageStore((state) => state.language);
  const watched = useMovieStore((state) => state.watched);
  const periods = getRecapPeriods();
  const [periodKey, setPeriodKey] = useState(route?.params?.period ?? periods[0].key);
  const [sharing, setSharing] = useState(false);
  const heroRef = useRef(null);

  const period = periods.find((item) => item.key === periodKey) ?? periods[0];
  const recap = buildRecap(watched, period);
  const locale = language === "ar" ? "ar" : "en";
  const periodName =
    period.kind === "year"
      ? String(period.date.getFullYear())
      : period.date.toLocaleDateString(locale, { month: "long" });
  const hours = Math.round(recap.minutes / 60);
  const inPeriod = watched.filter((entry) => entry.timestamp >= period.start && entry.timestamp < period.end);
  const directors = groupWatched(inPeriod, (movie) => movie.director).slice(0, SHOWN);
  const genres = groupWatched(inPeriod, (movie) => movie.genres).slice(0, SHOWN);
  const milestones = getMilestones(watched).slice(0, MILESTONES_SHOWN);
  const lead = recap.favourites[0]?.movie;
  const cardWidth = Math.round((width - spacing.md * 2) * 0.62);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    const fallback = t("My {period} on ReelBoard: {count} movies, {hours} hours.", {
      period: periodName,
      count: recap.count,
      hours,
    });
    try {
      const uri = await captureRef(heroRef, { format: "png", quality: 1, result: "tmpfile" });
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
  const periodChips = (
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
            <Text style={[styles.periodText, selected && styles.periodTextSelected]}>{labels[item.key]}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* The headline over your top film's still — what Share sends. */}
        <View ref={heroRef} collapsable={false} style={[styles.hero, { minHeight: HERO_HEIGHT + insets.top }]}>
          {lead && (
            <>
              <Image source={{ uri: lead.backdrop ?? lead.poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient
                colors={[`${colors.background}55`, `${colors.background}99`, colors.background]}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
              />
            </>
          )}
          <Text style={styles.eyebrow}>{t("Replay")}</Text>
          <Text style={styles.headline}>
            {recap.count > 0
              ? t("{minutes} minutes in {period}.", {
                  minutes: recap.minutes.toLocaleString(locale),
                  period: periodName,
                })
              : t("Nothing logged for {period} yet", { period: periodName })}
          </Text>
          {recap.count > 0 && (
            <Text style={styles.subline}>
              {t("{count} films", { count: recap.count })}
              {recap.ranks > 0 ? ` · +${recap.ranks} ${recap.ranks === 1 ? t("rank") : t("ranks")}` : ""}
            </Text>
          )}
        </View>
        {periodChips}

        {recap.count === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.muted}>
              {t("Watch something and mark it watched — your recap fills in as you go.")}
            </Text>
            <PrimaryButton
              label={t("Find something to watch")}
              onPress={() => navigation.navigate("Main", { screen: "Home" })}
              style={styles.fullButton}
            />
          </View>
        ) : (
          <>
            {/* Your top films: big ranked cards, like Top Artists. */}
            <Heading title={t("Your top films")} styles={styles} colors={colors} rtl={rtl} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              snapToInterval={cardWidth + GAP}
              decelerationRate="fast"
            >
              {recap.favourites.map(({ movie, entry }, index) => (
                <Pressable
                  key={movie.id}
                  style={({ pressed }) => [
                    styles.filmCard,
                    { width: cardWidth, height: Math.round(cardWidth * 1.33) },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`${index + 1}. ${movie.title}`}
                >
                  <MoviePoster uri={movie.poster} style={StyleSheet.absoluteFill} />
                  <LinearGradient
                    colors={["rgba(0,0,0,0.35)", "transparent", "rgba(0,0,0,0.85)"]}
                    locations={[0, 0.35, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.filmRank}>{index + 1}</Text>
                  <View style={styles.filmWords}>
                    <Text style={styles.filmTitle} numberOfLines={1}>
                      {movie.title}
                    </Text>
                    <Text style={styles.filmMeta} numberOfLines={1}>
                      {[getTier(entry) && t("Tier {tier}", { tier: getTier(entry) }), movie.runtime && formatRuntime(movie.runtime)]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {/* Your top directors: a ranked list, like Top Songs. */}
            {directors.length > 0 && (
              <>
                <Heading title={t("Your top directors")} styles={styles} colors={colors} rtl={rtl} />
                {directors.map((group, index) => {
                  const saga = getSagaForPerson(group.key);
                  return (
                    <Pressable
                      key={group.key}
                      style={({ pressed }) => [styles.row, pressed && saga && styles.rowPressed]}
                      onPress={saga ? () => navigation.navigate("CollectionDetails", { collectionId: saga.id }) : undefined}
                      disabled={!saga}
                    >
                      <MoviePoster uri={group.top?.movie.poster} style={styles.rowArt} />
                      <Text style={styles.rowRank}>{index + 1}</Text>
                      <View style={[styles.rowWords, index < directors.length - 1 && styles.rowRule]}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {group.key}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {t("{count} films", { count: group.count })} · {formatRuntime(group.minutes)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            )}

            {/* Your top genres: tiles, like Top Albums. */}
            {genres.length > 0 && (
              <>
                <Heading title={t("Your top genres")} styles={styles} colors={colors} rtl={rtl} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                  {genres.map((group, index) => (
                    <View key={group.key} style={{ width: GENRE_TILE }}>
                      <Image
                        source={{ uri: group.top?.movie.backdrop ?? group.top?.movie.poster }}
                        style={styles.genreArt}
                        resizeMode="cover"
                      />
                      <Text style={styles.genreRank}>{index + 1}</Text>
                      <Text style={styles.genreName} numberOfLines={1}>
                        {t(group.key)}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {t("{count} films", { count: group.count })}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {formatRuntime(group.minutes)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}

        {/* Your milestones: medal cards, opening every one. */}
        {milestones.length > 0 && (
          <>
            <Heading
              title={t("Your milestones")}
              onPress={() => navigation.navigate("Milestones")}
              styles={styles}
              colors={colors}
              rtl={rtl}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              snapToInterval={cardWidth + GAP}
              decelerationRate="fast"
            >
              {milestones.map((milestone) => (
                <Pressable
                  key={milestone.key}
                  style={({ pressed }) => [styles.milestoneCard, { width: cardWidth }, pressed && styles.pressed]}
                  onPress={() => navigation.navigate("Milestones")}
                  accessibilityRole="button"
                >
                  <MilestoneMedal milestone={milestone} size={Math.round(cardWidth * 0.72)} />
                  <Text style={styles.milestoneTitle} numberOfLines={1}>
                    {t(milestone.label)}
                  </Text>
                  <Text style={styles.milestoneWhen} numberOfLines={1}>
                    {milestone.reachedAt
                      ? t("Reached {date}", {
                          date: new Date(milestone.reachedAt).toLocaleDateString(locale, {
                            day: "numeric",
                            month: "long",
                          }),
                        })
                      : t("In progress")}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      {/* Back and Share, floating over the page. */}
      <View style={[styles.floating, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <HeaderIconButton round onPress={() => navigation.goBack()} accessibilityLabel={t("Back")}>
          <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2} style={rtl && styles.flipped} />
        </HeaderIconButton>
        {recap.count > 0 && (
          <HeaderIconButton
            round
            onPress={share}
            accessibilityLabel={sharing ? t("Preparing…") : t("Share your recap")}
          >
            <Share2 size={20} color={colors.textPrimary} strokeWidth={2} />
          </HeaderIconButton>
        )}
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
    pressed: {
      opacity: 0.8,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    floating: {
      position: "absolute",
      start: spacing.md,
      end: spacing.md,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    hero: {
      justifyContent: "flex-end",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
      backgroundColor: colors.background,
      overflow: "hidden",
    },
    eyebrow: {
      ...typography.section,
      color: colors.brand,
      marginBottom: spacing.xs,
    },
    // "2,824 minutes in September."
    headline: {
      fontFamily: fonts.extraBold,
      fontSize: 40,
      lineHeight: 46,
      letterSpacing: -1,
      color: colors.textPrimary,
    },
    subline: {
      ...typography.subtitle,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    periods: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    period: {
      paddingVertical: 7,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.chip,
    },
    periodSelected: {
      backgroundColor: colors.textPrimary,
    },
    periodText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    periodTextSelected: {
      color: colors.background,
    },
    empty: {
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      paddingTop: spacing.xl,
    },
    muted: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
    fullButton: {
      alignSelf: "stretch",
    },
    heading: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 2,
      paddingHorizontal: spacing.md,
      marginTop: 32,
      marginBottom: spacing.sm + 4,
    },
    headingText: {
      fontFamily: fonts.extraBold,
      fontSize: 24,
      lineHeight: 30,
      letterSpacing: -0.4,
      color: colors.textPrimary,
    },
    rail: {
      gap: GAP,
      paddingHorizontal: spacing.md,
    },
    // A top film: its poster filling a tall card, the rank on top.
    filmCard: {
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: shape.card + 4,
      overflow: "hidden",
    },
    filmRank: {
      fontFamily: fonts.extraBold,
      fontSize: 48,
      lineHeight: 54,
      color: "#FFFFFF",
      paddingHorizontal: spacing.md + 2,
      paddingTop: spacing.sm,
    },
    filmWords: {
      alignItems: "center",
      padding: spacing.md,
      gap: 2,
    },
    filmTitle: {
      ...typography.subtitle,
      fontFamily: fonts.bold,
      fontSize: 17,
      color: "#FFFFFF",
    },
    filmMeta: {
      ...typography.body,
      color: "rgba(255, 255, 255, 0.85)",
    },
    // A top director: art, rank, name — a hairline under the words.
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingStart: spacing.md,
    },
    rowPressed: {
      backgroundColor: colors.card,
    },
    rowArt: {
      width: ROW_ART,
      height: ROW_ART,
      marginVertical: spacing.xs + 2,
    },
    rowRank: {
      fontFamily: fonts.bold,
      fontSize: 17,
      minWidth: 18,
      color: colors.textPrimary,
    },
    rowWords: {
      flex: 1,
      alignSelf: "stretch",
      justifyContent: "center",
      paddingEnd: spacing.md,
    },
    rowRule: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowTitle: {
      ...typography.subtitle,
      fontFamily: fonts.regular,
      fontSize: 17,
      color: colors.textPrimary,
    },
    rowMeta: {
      ...typography.body,
      color: colors.textSecondary,
    },
    // A top genre: a square still, then its rank, name and numbers.
    genreArt: {
      width: GENRE_TILE,
      height: GENRE_TILE,
      backgroundColor: colors.card,
      borderRadius: shape.poster,
    },
    genreRank: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    genreName: {
      ...typography.subtitle,
      fontFamily: fonts.semiBold,
      fontSize: 16,
      color: colors.textPrimary,
    },
    // A milestone: its medal, what it is and when.
    milestoneCard: {
      alignItems: "center",
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
      backgroundColor: colors.card,
      borderRadius: shape.card + 4,
    },
    milestoneTitle: {
      ...typography.subtitle,
      fontFamily: fonts.bold,
      fontSize: 18,
      color: colors.textPrimary,
      marginTop: spacing.lg,
    },
    milestoneWhen: {
      ...typography.body,
      color: colors.textSecondary,
    },
  });

export default RecapScreen;

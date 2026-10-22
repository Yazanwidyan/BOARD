import { useQuery } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, ChevronDown, Search, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { Text } from "../components/AppText";
import { MoviePoster } from "../components/MoviePoster";
import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { MOVIES, getMovieById, useMoviesVersion } from "../data/movies";
import { useMovieSearch } from "../hooks/useMovieSearch";
import { t } from "../i18n";
import { api } from "../services/api";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { toggleBucketListWithFeedback } from "../utils/achievementFeedback";
import { byWeightedRating, isInBucketList } from "../utils/movieFilters";
import { explainSimilarity } from "../utils/similarity";
import { tierRank } from "../utils/tiers";

const LIKE_COUNT = 30;
const FAVOURITES = 12;
const COLUMNS = 3;
const GAP = 2;
const RING = 46;

// How similar, as a small ring: green when it's close, slate when it's a
// fair likeness, grey when it's loose.
const PercentRing = ({ percent, colors, styles }) => {
  const stroke = 4;
  const r = (RING - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const color = percent >= 75 ? colors.success : percent >= 50 ? colors.rating : colors.textMuted;
  return (
    <View style={styles.ring}>
      <Svg width={RING} height={RING}>
        <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          fill="none"
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <View style={styles.ringText} pointerEvents="none">
        <Text style={[styles.ringValue, { color }]}>{percent}%</Text>
      </View>
    </View>
  );
};

// One similar film: poster, what it is, why in a line, and how similar.
// Tapped, it opens up: a bar for each part of the likeness with what it
// is, and Open / Save.
const SimilarRow = ({ target, item, open, onToggle, onOpen, styles, colors }) => {
  const movie = getMovieById(item.id);
  const bucketList = useMovieStore((state) => state.bucketList);
  if (!movie) return null;
  const saved = isInBucketList(bucketList, movie.id);
  const parts = explainSimilarity(target, movie, item);
  return (
    <View style={styles.rowWrap}>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <MoviePoster uri={movie.poster} style={styles.rowPoster} />
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {movie.title}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {[movie.year, movie.genres?.slice(0, 2).map((genre) => t(genre)).join(", ")].filter(Boolean).join(" · ")}
          </Text>
          {parts[0] && (
            <Text style={styles.rowReason} numberOfLines={1}>
              {parts[0].text}
            </Text>
          )}
        </View>
        <PercentRing percent={item.percent} colors={colors} styles={styles} />
        <ChevronDown
          size={16}
          color={colors.textMuted}
          style={open && styles.chevronOpen}
        />
      </Pressable>

      {open && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.explain}>
          <Text style={styles.explainTitle}>
            {t("{percent}% similar to {title}", { percent: item.percent, title: target.title })}
          </Text>
          {parts.map((part) => (
            <View key={part.key} style={styles.part}>
              <View style={styles.partHead}>
                <Text style={styles.partLabel}>{part.label}</Text>
                <View style={styles.partTrack}>
                  <View style={[styles.partFill, { width: `${Math.round(part.value * 100)}%` }]} />
                </View>
                <Text style={styles.partValue}>{Math.round(part.value * 100)}%</Text>
              </View>
              <Text style={styles.partText}>{part.text}</Text>
            </View>
          ))}
          <View style={styles.explainActions}>
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.rowPressed]}
              onPress={() => onOpen(movie.id)}
              accessibilityRole="button"
            >
              <Text style={styles.actionText}>{t("Open")}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.rowPressed]}
              onPress={() => toggleBucketListWithFeedback(movie.id)}
              accessibilityRole="button"
            >
              {saved ? (
                <BookmarkCheck size={16} color={colors.textPrimary} strokeWidth={2} />
              ) : (
                <Bookmark size={16} color={colors.textPrimary} strokeWidth={2} />
              )}
              <Text style={styles.actionText}>{saved ? t("Saved") : t("Save")}</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

// Decide's "More like…": pick a movie — search, or one of your favourites
// — and see the films most like it (GET /api/movies/:id/like), each with
// how similar it is and, tapped, why: whether its fans went on to like it,
// what they're both about, their feel, genres, story, cast and era.
export const SimilarScreen = ({ navigation, route }) => {
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const headerScroll = useStackHeaderScroll();
  const watched = useMovieStore((state) => state.watched);
  const [targetId, setTargetId] = useState(route.params?.movieId ?? null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const search = useMovieSearch(query, 20);

  const like = useQuery({
    // The director's own films belong here too (the movie page leaves them
    // to its "Also by" row).
    queryKey: ["movie", targetId, "like", LIKE_COUNT, "director"],
    queryFn: () => api.get(`/movies/${targetId}/like?count=${LIKE_COUNT}&sameDirector=true`),
    enabled: !!targetId,
    staleTime: 60 * 60 * 1000,
  });
  const target = targetId ? getMovieById(targetId) : null;
  // The point here is how alike, so the closest first.
  const similar = [...(like.data?.similar ?? [])].sort((a, b) => b.percent - a.percent || b.score - a.score);

  // To pick from without typing: your best-tiered films, else the
  // best-rated.
  const yours = [...watched]
    .sort((a, b) => tierRank(a) - tierRank(b))
    .map((entry) => getMovieById(entry.movieId))
    .filter((movie) => movie && !movie.partial);
  const favourites = (yours.length >= COLUMNS ? yours : [...MOVIES].sort(byWeightedRating)).slice(0, FAVOURITES);
  const tile = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);

  const choose = (movieId) => {
    setTargetId(movieId);
    setOpenId(null);
    setQuery("");
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("More like…")} onBack={() => navigation.goBack()} scrollY={headerScroll.scrollY} />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!target ? (
          <>
            <Text style={styles.intro}>
              {t("Pick a movie you loved — see what's like it, how much, and why.")}
            </Text>
            <View style={styles.searchBar}>
              <Search size={18} color={colors.textSecondary} strokeWidth={1.9} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("Search a movie")}
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
                style={styles.searchInput}
                returnKeyType="search"
              />
              {!!query && (
                <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel={t("Clear")}>
                  <X size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {query.trim().length >= 2 ? (
              <View style={styles.results}>
                {search.results.map(({ movie }, index) => (
                  <Pressable
                    key={movie.id}
                    style={({ pressed }) => [styles.result, index > 0 && styles.resultDivider, pressed && styles.rowPressed]}
                    onPress={() => choose(movie.id)}
                  >
                    <MoviePoster uri={movie.poster} style={styles.resultPoster} />
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {movie.title}
                      </Text>
                      <Text style={styles.rowMeta}>{movie.year}</Text>
                    </View>
                  </Pressable>
                ))}
                {search.results.length === 0 && (
                  <Text style={styles.note}>
                    {search.searching ? t("Searching…") : t("No movies found.")}
                  </Text>
                )}
              </View>
            ) : (
              <>
                <Text style={styles.label}>
                  {yours.length >= COLUMNS ? t("Your favourites") : t("Popular picks")}
                </Text>
                <View style={styles.grid}>
                  {favourites.map((movie) => (
                    <Pressable
                      key={movie.id}
                      onPress={() => choose(movie.id)}
                      accessibilityLabel={movie.title}
                      style={({ pressed }) => pressed && styles.tilePressed}
                    >
                      <MoviePoster uri={movie.poster} style={{ width: tile, height: tile * 1.5 }} />
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </>
        ) : (
          <>
            {/* The movie it's compared with. */}
            <View style={styles.hero}>
              <MoviePoster uri={target.poster} style={styles.heroPoster} />
              <View style={styles.rowText}>
                <Text style={styles.heroEyebrow}>{t("More like")}</Text>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {target.title}
                </Text>
                <Text style={styles.rowMeta}>{target.year}</Text>
              </View>
              <Pressable
                onPress={() => setTargetId(null)}
                hitSlop={8}
                style={styles.change}
                accessibilityRole="button"
              >
                <Text style={styles.changeText}>{t("Change")}</Text>
              </Pressable>
            </View>

            {like.isLoading ? (
              <Text style={styles.note}>{t("Finding films like it…")}</Text>
            ) : like.isError ? (
              <Text style={styles.note}>{t("Can't reach ReelBoard right now — check your connection.")}</Text>
            ) : (
              <>
                <Text style={styles.label}>
                  {t("Closest first · tap one to see why")}
                </Text>
                <View style={styles.list}>
                  {similar.map((item, index) => (
                    <Animated.View key={item.id} entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(220)}>
                      {index > 0 && <View style={styles.separator} />}
                      <SimilarRow
                        target={target}
                        item={item}
                        open={openId === item.id}
                        onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                        onOpen={(movieId) => navigation.push("MovieDetails", { movieId })}
                        styles={styles}
                        colors={colors}
                      />
                    </Animated.View>
                  ))}
                </View>
              </>
            )}
          </>
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
    intro: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textSecondary,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 52,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.control,
      marginHorizontal: spacing.md,
    },
    searchInput: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 20,
      flex: 1,
      paddingVertical: spacing.sm + 2,
      color: colors.textPrimary,
    },
    label: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    note: {
      ...typography.body,
      fontSize: 14,
      lineHeight: 19,
      color: colors.textMuted,
      textAlign: "center",
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GAP,
    },
    tilePressed: {
      opacity: 0.8,
    },
    results: {
      marginTop: 2,
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    result: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    resultDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    resultPoster: {
      width: 40,
      height: 60,
    },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      marginHorizontal: spacing.md,
    },
    heroPoster: {
      width: 64,
      height: 96,
    },
    heroEyebrow: {
      ...typography.caption,
      color: colors.rating,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      fontSize: 11,
    },
    heroTitle: {
      ...typography.title,
      color: colors.textPrimary,
    },
    change: {
      alignSelf: "flex-start",
    },
    changeText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    list: {
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginStart: spacing.md + 52 + spacing.md,
    },
    rowWrap: {},
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    rowPressed: {
      backgroundColor: colors.cardElevated,
    },
    rowPoster: {
      width: 52,
      height: 78,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    rowMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    rowReason: {
      ...typography.caption,
      fontSize: 12,
      color: colors.rating,
      marginTop: 1,
    },
    chevronOpen: {
      transform: [{ rotate: "180deg" }],
    },
    ring: {
      width: RING,
      height: RING,
      alignItems: "center",
      justifyContent: "center",
    },
    ringText: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
    ringValue: {
      ...typography.bodyBold,
      fontSize: 12,
      lineHeight: 16,
      fontVariant: ["tabular-nums"],
    },
    // Why — a bar for each part, and what it is.
    explain: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      paddingTop: spacing.xs,
      gap: spacing.sm + 2,
      backgroundColor: colors.background,
      borderRadius: shape.control,
    },
    explainTitle: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 19,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    part: {
      gap: 3,
    },
    partHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    partLabel: {
      ...typography.bodyBold,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
      width: 58,
    },
    partTrack: {
      flex: 1,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: shape.chip,
    },
    partFill: {
      height: 4,
      backgroundColor: colors.rating,
      borderRadius: shape.chip,
    },
    partValue: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
      width: 34,
      textAlign: "right",
      fontVariant: ["tabular-nums"],
    },
    partText: {
      ...typography.caption,
      color: colors.textSecondary,
      marginStart: 58 + spacing.sm,
    },
    explainActions: {
      flexDirection: "row",
      gap: 2,
      marginTop: spacing.xs,
    },
    action: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: spacing.sm + 2,
      backgroundColor: colors.card,
      borderRadius: shape.control,
    },
    actionText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },
  });

export default SimilarScreen;

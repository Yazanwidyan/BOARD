import { ChevronLeft, EyeOff, LayoutGrid, List, Search, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { FilmRow } from "../components/FilmRow";
import { MoviePoster } from "../components/MoviePoster";
import { DockHeader, HeaderIconButton, useDockHeader } from "../components/ScreenHeader";
import { TierBadge } from "../components/TierBadge";
import { MOVIES, getMovieById, useMoviesVersion } from "../data/movies";
import { t, useIsRTL } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { byWeightedRating } from "../utils/movieFilters";
import { findMovies } from "../utils/movieSearch";
import { getTier } from "../utils/tiers";

const COLUMNS = 3;
const GAP = spacing.rail;

// How the films can be ordered: the list's own order (a category's best
// first, a Discover row's as it was), the newest, or by title.
const SORTS = [
  { key: "top", label: "Top", sort: null },
  { key: "new", label: "Newest", sort: (a, b) => (b.year ?? 0) - (a.year ?? 0) || byWeightedRating(a, b) },
  { key: "az", label: "A–Z", sort: (a, b) => a.title.localeCompare(b.title) },
];

// Grid or list — kept while the app is open, so the next list opens the
// way you left the last one.
let lastView = "grid";

// A list of films — a category from Search, a Discover row's "All ›", a
// person's films. Given `title` + `movieIds` it shows just those (in their
// order); without them, the whole catalog. Under the header: a field to
// find one, the order (Top / Newest / A–Z) and "Not seen"; then the films
// as posters three across (title and year under each, your tier on the
// ones you've seen) or as rows (components/FilmRow, as Search's) — the
// header's button switches.
export const BrowseMoviesScreen = ({ navigation, route }) => {
  const rowTitle = route?.params?.title;
  const rowIds = route?.params?.movieIds;
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const { width } = useWindowDimensions();
  const header = useDockHeader();
  const watched = useMovieStore((state) => state.watched);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("top");
  const [unseenOnly, setUnseenOnly] = useState(false);
  const [view, setView] = useState(lastView);
  const tile = Math.floor((width - spacing.md * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  // Any of the row's movies not on the phone are fetched; the list fills
  // in as they arrive.
  const moviesVersion = useMoviesVersion();
  const baseMovies = useMemo(
    () => (rowIds ? rowIds.map(getMovieById).filter(Boolean) : [...MOVIES]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowIds, moviesVersion],
  );

  const entryOf = (movieId) => watched.find((entry) => entry.movieId === movieId) ?? null;
  const shown = useMemo(() => {
    const seen = new Set(watched.map((entry) => entry.movieId));
    const kept = unseenOnly ? baseMovies.filter((movie) => !seen.has(movie.id)) : baseMovies;
    // Searching: best matches first (title, director or cast — see
    // utils/movieSearch); otherwise the chosen order.
    if (query.trim()) return findMovies(kept, query);
    const { sort } = SORTS.find((item) => item.key === sortKey);
    return sort ? [...kept].sort(sort) : kept;
  }, [baseMovies, watched, unseenOnly, query, sortKey]);

  const switchView = () => {
    const next = view === "grid" ? "list" : "grid";
    lastView = next;
    setView(next);
  };
  const openMovie = (movie) => navigation.navigate("MovieDetails", { movieId: movie.id });

  const controls = (
    <View style={styles.controls}>
      <View style={styles.field}>
        <Search size={16} color={colors.textSecondary} strokeWidth={2.2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={
            rowIds
              ? t("Search {rowIdsCount} movies...", { rowIdsCount: baseMovies.length })
              : t("Search movies, directors, actors...")
          }
          placeholderTextColor={colors.textMuted}
          style={[styles.input, rtl && styles.inputRtl]}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Clear")}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
      >
        {SORTS.map((item) => {
          const active = !query.trim() && item.key === sortKey;
          return (
            <Pressable
              key={item.key}
              onPress={() => setSortKey(item.key)}
              style={({ pressed }) => [styles.chip, active && styles.chipOn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{t(item.label)}</Text>
            </Pressable>
          );
        })}
        <View style={styles.chipGap} />
        <Pressable
          onPress={() => setUnseenOnly((value) => !value)}
          style={({ pressed }) => [styles.chip, unseenOnly && styles.chipOn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityState={{ selected: unseenOnly }}
        >
          <EyeOff size={14} color={unseenOnly ? colors.selectedText : colors.textSecondary} strokeWidth={2.2} />
          <Text style={[styles.chipText, unseenOnly && styles.chipTextOn]}>{t("Not seen")}</Text>
        </Pressable>
      </ScrollView>
      <Text style={styles.count}>{t("{count} films", { count: shown.length })}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Animated.FlatList
        // A new key when the layout changes: a list can't change its columns
        // in place.
        key={view}
        data={shown}
        numColumns={view === "grid" ? COLUMNS : 1}
        keyExtractor={(item) => item.id}
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: header.barBottom + spacing.sm,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        columnWrapperStyle={view === "grid" ? styles.gridRow : undefined}
        ListHeaderComponent={controls}
        ListEmptyComponent={<Text style={styles.empty}>{t("No films match.")}</Text>}
        renderItem={({ item, index }) =>
          view === "grid" ? (
            <Pressable
              style={({ pressed }) => [{ width: tile }, pressed && styles.pressed]}
              onPress={() => openMovie(item)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <View>
                <MoviePoster uri={item.poster} style={{ width: tile, height: Math.round(tile * 1.5) }} />
                {!!entryOf(item.id) && <TierBadge tier={getTier(entryOf(item.id))} onPoster />}
              </View>
              <Text style={styles.gridTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {!!item.year && <Text style={styles.gridYear}>{item.year}</Text>}
            </Pressable>
          ) : (
            <FilmRow movie={item} onPress={() => openMovie(item)} last={index === shown.length - 1} />
          )
        }
      />
      <DockHeader
        {...header.props}
        title={rowTitle ?? t("Browse Movies")}
        compact
        avatar={false}
        back={
          <HeaderIconButton round onPress={() => navigation.goBack()} accessibilityLabel={t("Back")}>
            <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2} style={rtl && styles.flipped} />
          </HeaderIconButton>
        }
        right={
          <HeaderIconButton
            onPress={switchView}
            accessibilityLabel={view === "grid" ? t("Show as a list") : t("Show as a grid")}
          >
            {view === "grid" ? (
              <List size={21} color={colors.textPrimary} strokeWidth={1.9} />
            ) : (
              <LayoutGrid size={20} color={colors.textPrimary} strokeWidth={1.9} />
            )}
          </HeaderIconButton>
        }
      />
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
      opacity: 0.7,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    controls: {
      gap: spacing.sm + 2,
      marginBottom: spacing.md,
    },
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      height: 42,
      marginHorizontal: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.chip,
    },
    input: {
      ...typography.body,
      flex: 1,
      height: "100%",
      color: colors.textPrimary,
    },
    inputRtl: {
      textAlign: "right",
    },
    chips: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      height: 34,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.chip,
    },
    chipOn: {
      backgroundColor: colors.selected,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    chipTextOn: {
      color: colors.selectedText,
    },
    // Between the order and "Not seen".
    chipGap: {
      width: StyleSheet.hairlineWidth,
      marginHorizontal: spacing.xs,
      backgroundColor: colors.border,
    },
    count: {
      ...typography.caption,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
    },
    gridRow: {
      gap: GAP,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    gridTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textPrimary,
      marginTop: 6,
    },
    gridYear: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xl,
    },
  });

export default BrowseMoviesScreen;

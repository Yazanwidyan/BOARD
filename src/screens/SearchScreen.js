import { ClipboardPaste, Clock, Search, X } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "../components/AppText";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BrowseTiles } from "../components/BrowseTiles";
import { EmptyState } from "../components/EmptyState";
import { MovieListRow } from "../components/MovieListRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { DockHeader, useDockHeader } from "../components/ScreenHeader";
import { useTabBarClearance } from "../components/TonightBar";
import { rememberMovies } from "../data/movies";
import { useMovieSearch } from "../hooks/useMovieSearch";
import { api } from "../services/api";
import { useRecentSearchStore } from "../store/recentSearchStore";
import { showToast } from "../store/toastStore";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { toggleBucketListWithFeedback } from "../utils/achievementFeedback";
import { isInBucketList } from "../utils/movieFilters";
import { t } from "../i18n";

const RESULTS_LIMIT = 60;

// One pasted title: ReelBoard's own movies first, then all of TMDB — the
// exact title, else one containing it.
const findTitle = async (line) => {
  const lower = line.toLowerCase();
  const pick = (movies) =>
    movies.find((movie) => movie.title.toLowerCase() === lower) ??
    movies.find((movie) => movie.title.toLowerCase().includes(lower));
  const term = encodeURIComponent(line);
  const pool = await api.get(`/movies?q=${term}&limit=10`);
  const fromPool = pick(pool.movies);
  if (fromPool) return fromPool;
  const { results } = await api.get(`/movies/search?q=${term}`);
  rememberMovies(results.map((result) => ({ ...result, partial: true })));
  return pick(results) ?? null;
};

const LOOKUPS_AT_ONCE = 4;

const matchTitles = async (lines) => {
  const normalizedLines = lines
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean);

  const found = [];
  for (let i = 0; i < normalizedLines.length; i += LOOKUPS_AT_ONCE) {
    const batch = normalizedLines.slice(i, i + LOOKUPS_AT_ONCE);
    found.push(...(await Promise.all(batch.map(findTitle))));
  }
  const matched = [];
  const unmatched = [];
  normalizedLines.forEach((line, index) => {
    const movie = found[index];
    if (movie && !matched.some((other) => other.id === movie.id)) {
      matched.push(movie);
    } else if (!movie) {
      unmatched.push(line);
    }
  });
  return { matched, unmatched };
};

export const SearchScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarClearance();
  const header = useDockHeader();
  const [query, setQuery] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteResult, setPasteResult] = useState(null);
  const [matching, setMatching] = useState(false);
  const bucketList = useMovieStore((state) => state.bucketList);
  const recentSearches = useRecentSearchStore((state) => state.recentSearches);
  const addSearch = useRecentSearchStore((state) => state.addSearch);
  const clearSearches = useRecentSearchStore((state) => state.clearSearches);

  const trimmed = query.trim();
  // Any movie — by title, director or cast, best matches first
  // (hooks/useMovieSearch).
  const search = useMovieSearch(query, RESULTS_LIMIT);
  const results = search.results.map((result) => result.movie);

  const handlePasteSubmit = async () => {
    setMatching(true);
    try {
      setPasteResult(await matchTitles(pasteText));
    } catch {
      showToast(t("Can't search right now — check your connection."));
    } finally {
      setMatching(false);
    }
  };

  const handleAddMatched = () => {
    if (!pasteResult) return;
    pasteResult.matched
      .filter((movie) => !isInBucketList(bucketList, movie.id))
      .forEach((movie) => toggleBucketListWithFeedback(movie.id));
    setPasteMode(false);
    setPasteText("");
    setPasteResult(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: header.barBottom + spacing.underHeader }]}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("Search movies, directors, actors...")}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => addSearch(query)}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel={t("Clear")}>
              <X size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {trimmed ? (
        results.length === 0 ? (
          <EmptyState
            art="noMatches"
            title={
              search.searching
                ? t("Searching…")
                : search.failed
                  ? t("Can't search right now — check your connection.")
                  : t("No matches")
            }
            subtitle={
              search.searching || search.failed
                ? ""
                : t('Nothing found for "{query}"', { query: query })
            }
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + tabBarClearance }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <MovieListRow
                movie={item}
                inQueue={isInBucketList(bucketList, item.id)}
                onToggleQueue={() => toggleBucketListWithFeedback(item.id)}
                onPress={() => {
                  // A search that found something: remembered.
                  addSearch(query);
                  navigation.navigate("MovieDetails", { movieId: item.id });
                }}
              />
            )}
          />
        )
      ) : (
        // Before you type, as Apple Music's Search: what you searched
        // lately, the kinds of film to browse, and pasting a list.
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + tabBarClearance }}
        >
          {recentSearches.length > 0 && (
            <View style={styles.block}>
              <View style={styles.headingRow}>
                <Text style={styles.heading}>{t("Recent")}</Text>
                <Pressable onPress={clearSearches} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.clear}>{t("Clear")}</Text>
                </Pressable>
              </View>
              {recentSearches.map((term, index) => (
                <Pressable
                  key={term}
                  style={({ pressed }) => [styles.recentRow, pressed && styles.rowPressed]}
                  onPress={() => setQuery(term)}
                  accessibilityRole="button"
                >
                  <Clock size={18} color={colors.textMuted} strokeWidth={2} />
                  <View style={[styles.recentWords, index < recentSearches.length - 1 && styles.rowRule]}>
                    <Text style={styles.recentText} numberOfLines={1}>
                      {term}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.block}>
            <View style={styles.headingRow}>
              <Text style={styles.heading}>{t("Browse")}</Text>
            </View>
            <BrowseTiles navigation={navigation} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.pasteButton, pressed && styles.rowPressed]}
            onPress={() => setPasteMode(true)}
            accessibilityRole="button"
          >
            <ClipboardPaste size={16} color={colors.brand} strokeWidth={2.2} />
            <Text style={styles.pasteButtonText}>{t("Copy and Paste List of Titles")}</Text>
          </Pressable>
        </ScrollView>
      )}

      {pasteMode && (
        <View style={styles.pasteOverlay}>
          <View
            style={[
              styles.pasteSheet,
              { paddingBottom: insets.bottom + spacing.md },
            ]}
          >
            <View style={styles.pasteHeaderRow}>
              <Text style={styles.pasteTitle}>
                {t("Paste a List of Titles")}
              </Text>
              <Pressable
                onPress={() => {
                  setPasteMode(false);
                  setPasteText("");
                  setPasteResult(null);
                }}
                hitSlop={8}
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.pasteHint}>
              {t("One title per line (or comma-separated).")}
            </Text>
            <TextInput
              value={pasteText}
              onChangeText={(text) => {
                setPasteText(text);
                setPasteResult(null);
              }}
              placeholder={t("The Godfather\nPulp Fiction\nInception")}
              placeholderTextColor={colors.textMuted}
              style={styles.pasteInput}
              multiline
              textAlignVertical="top"
            />

            {pasteResult && (
              <Text style={styles.pasteSummary}>
                {pasteResult.matched.length} matched
                {pasteResult.unmatched.length > 0
                  ? t(", {unmatchedCount} not found", {
                      unmatchedCount: pasteResult.unmatched.length,
                    })
                  : ""}
              </Text>
            )}

            {pasteResult ? (
              <PrimaryButton
                label={t("Add {matchedCount} to Watchlist", {
                  matchedCount: pasteResult.matched.length,
                })}
                onPress={handleAddMatched}
                disabled={pasteResult.matched.length === 0}
                style={styles.pasteAction}
              />
            ) : (
              <PrimaryButton
                label={matching ? t("Finding titles…") : t("Find titles")}
                onPress={handlePasteSubmit}
                disabled={!pasteText.trim() || matching}
                style={styles.pasteAction}
              />
            )}
          </View>
        </View>
      )}
      <DockHeader title={t("Search")} />
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
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm + 2,
      marginBottom: spacing.sm,
    },
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      borderRadius: shape.control,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.sm + 2,
      color: colors.textPrimary,
      ...typography.body,
    },
    // Pasting a list: a quiet grey button at the end, its words in red.
    pasteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: colors.buttonFill,
      marginHorizontal: spacing.md,
      marginTop: spacing.section,
      paddingVertical: spacing.md,
      borderRadius: shape.control,
    },
    pasteButtonText: {
      ...typography.bodyBold,
      color: colors.brand,
    },
    block: {
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
    },
    headingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm + 2,
    },
    // As Home's section headings.
    heading: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      lineHeight: 27,
      letterSpacing: -0.3,
      color: colors.textPrimary,
    },
    clear: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.brand,
    },
    // A recent search: a clock, the words, a hairline under them.
    recentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingStart: spacing.md,
    },
    rowPressed: {
      opacity: 0.7,
    },
    recentWords: {
      flex: 1,
      paddingVertical: spacing.sm + 4,
      paddingEnd: spacing.md,
    },
    rowRule: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    recentText: {
      ...typography.subtitle,
      fontFamily: fonts.regular,
      fontSize: 17,
      color: colors.textPrimary,
    },
    list: {},
    pasteOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    pasteSheet: {
      backgroundColor: colors.background,
      borderTopStartRadius: shape.sheet,
      borderTopEndRadius: shape.sheet,
      padding: spacing.md,
    },
    pasteHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    pasteTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    pasteHint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
    pasteInput: {
      ...typography.body,
      color: colors.textPrimary,
      backgroundColor: colors.card,
      padding: spacing.md,
      minHeight: 140,
      borderRadius: shape.control,
    },
    pasteSummary: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    pasteAction: {
      marginTop: spacing.md,
    },
  });

export default SearchScreen;

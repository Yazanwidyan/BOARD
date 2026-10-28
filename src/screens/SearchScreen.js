import { ClipboardPaste, Search, X } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "../components/AppText";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { EmptyState } from "../components/EmptyState";
import { MovieListRow } from "../components/MovieListRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { rememberMovies } from "../data/movies";
import { useMovieSearch } from "../hooks/useMovieSearch";
import { api } from "../services/api";
import { showToast } from "../store/toastStore";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing, TAB_BAR_CLEARANCE } from "../theme/spacing";
import { typography } from "../theme/typography";
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
  const [query, setQuery] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteResult, setPasteResult] = useState(null);
  const [matching, setMatching] = useState(false);
  const bucketList = useMovieStore((state) => state.bucketList);

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
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} floating />
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("Search movies, directors, actors...")}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            autoFocus
          />
        </View>
      </View>

      {!trimmed && (
        <Pressable
          style={styles.pasteButton}
          onPress={() => setPasteMode(true)}
        >
          <ClipboardPaste
            size={16}
            color={colors.textPrimary}
            strokeWidth={2.2}
          />
          <Text style={styles.pasteButtonText}>
            {t("Copy and Paste List of Titles")}
          </Text>
        </Pressable>
      )}

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
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <MovieListRow
                movie={item}
                inQueue={isInBucketList(bucketList, item.id)}
                onToggleQueue={() => toggleBucketListWithFeedback(item.id)}
                onPress={() =>
                  navigation.navigate("MovieDetails", { movieId: item.id })
                }
              />
            )}
          />
        )
      ) : (
        <View
          style={{ flex: 1, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
        />
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
    pasteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: colors.card,
      marginBottom: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: shape.control,
    },
    pasteButtonText: {
      ...typography.bodyBold,
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

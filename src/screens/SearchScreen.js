import { ClipboardPaste, Search, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { EmptyState } from "../components/EmptyState";
import { MovieListRow } from "../components/MovieListRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { MOVIES } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { toggleBucketListWithFeedback } from "../utils/achievementFeedback";
import { isInBucketList } from "../utils/movieFilters";

const RESULTS_LIMIT = 60;

const matchTitles = (lines) => {
  const normalizedLines = lines
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean);

  const matched = [];
  const unmatched = [];
  normalizedLines.forEach((line) => {
    const lower = line.toLowerCase();
    const exact = MOVIES.find((movie) => movie.title.toLowerCase() === lower);
    const partial =
      exact ??
      MOVIES.find((movie) => movie.title.toLowerCase().includes(lower));
    if (partial && !matched.some((movie) => movie.id === partial.id)) {
      matched.push(partial);
    } else if (!partial) {
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
  const bucketList = useMovieStore((state) => state.bucketList);

  const trimmed = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!trimmed) return [];
    return MOVIES.filter((movie) =>
      movie.title.toLowerCase().includes(trimmed),
    ).slice(0, RESULTS_LIMIT);
  }, [trimmed]);

  const handlePasteSubmit = () => {
    setPasteResult(matchTitles(pasteText));
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
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for titles..."
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
            Copy and Paste List of Titles
          </Text>
        </Pressable>
      )}

      {trimmed ? (
        results.length === 0 ? (
          <EmptyState
            art="noMatches"
            title="No matches"
            subtitle={`Nothing found for "${query}"`}
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
              <Text style={styles.pasteTitle}>Paste a List of Titles</Text>
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
              One title per line (or comma-separated).
            </Text>
            <TextInput
              value={pasteText}
              onChangeText={(text) => {
                setPasteText(text);
                setPasteResult(null);
              }}
              placeholder={"The Godfather\nPulp Fiction\nInception"}
              placeholderTextColor={colors.textMuted}
              style={styles.pasteInput}
              multiline
              textAlignVertical="top"
            />

            {pasteResult && (
              <Text style={styles.pasteSummary}>
                {pasteResult.matched.length} matched
                {pasteResult.unmatched.length > 0
                  ? `, ${pasteResult.unmatched.length} not found`
                  : ""}
              </Text>
            )}

            {pasteResult ? (
              <PrimaryButton
                label={`Add ${pasteResult.matched.length} to Watchlist`}
                onPress={handleAddMatched}
                disabled={pasteResult.matched.length === 0}
                style={styles.pasteAction}
              />
            ) : (
              <PrimaryButton
                label="Find titles"
                onPress={handlePasteSubmit}
                disabled={!pasteText.trim()}
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
      marginBottom: spacing.sm,
    },
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
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
      borderTopLeftRadius: radius.sm,
      borderTopRightRadius: radius.sm,
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

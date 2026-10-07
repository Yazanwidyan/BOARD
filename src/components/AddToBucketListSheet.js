import { Bookmark, BookmarkCheck, Clock, Search } from "lucide-react-native";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOVIES } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { useRecentSearchStore } from "../store/recentSearchStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { toggleBucketListWithFeedback } from "../utils/achievementFeedback";
import { isInBucketList } from "../utils/movieFilters";
import { BottomSheet } from "./BottomSheet";
import { MoviePoster } from "./MoviePoster";

const RESULTS_LIMIT = 40;

export const AddToBucketListSheet = ({ visible, onClose }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const bucketList = useMovieStore((state) => state.bucketList);
  const recentSearches = useRecentSearchStore((state) => state.recentSearches);
  const addSearch = useRecentSearchStore((state) => state.addSearch);
  const clearSearches = useRecentSearchStore((state) => state.clearSearches);

  const trimmed = query.trim().toLowerCase();
  const results = trimmed
    ? MOVIES.filter((movie) =>
        movie.title.toLowerCase().includes(trimmed),
      ).slice(0, RESULTS_LIMIT)
    : [];

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const handleSelectMovie = (movieId) => {
    if (trimmed) addSearch(query);
    toggleBucketListWithFeedback(movieId);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Add to Watchlist"
    >
      <View style={styles.searchBar}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => query.trim() && addSearch(query)}
          placeholder="Search the Top 250..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          autoFocus
        />
      </View>

      {trimmed ? (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {results.map((movie) => {
            const inBucketList = isInBucketList(bucketList, movie.id);
            return (
              <Pressable
                key={movie.id}
                style={styles.row}
                onPress={() => handleSelectMovie(movie.id)}
              >
                <MoviePoster
                  uri={movie.poster}
                  radius={0}
                  style={styles.rowPoster}
                />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {movie.title}
                  </Text>
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowYear}>{movie.year}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.toggleButton,
                    inBucketList && styles.toggleButtonActive,
                  ]}
                >
                  {inBucketList ? (
                    <BookmarkCheck size={18} color={colors.textPrimary} />
                  ) : (
                    <Bookmark size={18} color={colors.textSecondary} />
                  )}
                </View>
              </Pressable>
            );
          })}
          {results.length === 0 && (
            <Text style={styles.empty}>No movies found.</Text>
          )}
        </ScrollView>
      ) : (
        <View style={styles.list}>
          <View style={styles.recentHeaderRow}>
            <Text style={styles.recentTitle}>Recent Searches</Text>
            {recentSearches.length > 0 && (
              <Pressable onPress={clearSearches} hitSlop={8}>
                <Text style={styles.recentClear}>Clear</Text>
              </Pressable>
            )}
          </View>

          {recentSearches.length === 0 ? (
            <Text style={styles.empty}>
              Your recent searches will appear here.
            </Text>
          ) : (
            recentSearches.map((term) => (
              <Pressable
                key={term}
                style={styles.recentRow}
                onPress={() => setQuery(term)}
              >
                <Clock size={16} color={colors.textSecondary} />
                <Text style={styles.recentTerm}>{term}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
      ...typography.body,
    },
    list: {
      flex: 1,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: radius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    rowPoster: {
      width: 64,
      aspectRatio: 2 / 3,
    },
    rowInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    rowTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    rowMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: 2,
    },
    rowYear: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    toggleButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    toggleButtonActive: {
      backgroundColor: colors.surfaceSoft,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      paddingVertical: spacing.xl,
    },
    recentHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    recentTitle: {
      ...typography.bodyBold,
      color: colors.textSecondary,
    },
    recentClear: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    recentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    recentTerm: {
      ...typography.body,
      color: colors.textPrimary,
    },
  });

export default AddToBucketListSheet;

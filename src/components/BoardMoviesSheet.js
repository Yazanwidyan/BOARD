import { CheckCircle, Plus, Search } from "lucide-react-native";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "./AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOVIES, getMovieById } from "../data/movies";
import { useBoardStore } from "../store/boardStore";
import { useMovieStore } from "../store/movieStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { BottomSheet } from "./BottomSheet";
import { MoviePoster } from "./MoviePoster";
import { t } from "../i18n";

const RESULTS_LIMIT = 40;
const SUGGESTED_LIMIT = 20;

// From a board: search the catalog and tap to add or remove. Before you
// type, your watchlist is offered — the likeliest things to sort.
export const BoardMoviesSheet = ({ visible, onClose, boardId }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const board = useBoardStore((state) =>
    state.boards.find((item) => item.id === boardId),
  );
  const toggleBoardMovie = useBoardStore((state) => state.toggleBoardMovie);
  const bucketList = useMovieStore((state) => state.bucketList);

  const trimmed = query.trim().toLowerCase();
  const movies = trimmed
    ? MOVIES.filter((movie) =>
        movie.title.toLowerCase().includes(trimmed),
      ).slice(0, RESULTS_LIMIT)
    : [...bucketList]
        .reverse()
        .map((entry) => getMovieById(entry.movieId))
        .filter(Boolean)
        .slice(0, SUGGESTED_LIMIT);

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  if (!board) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={t("Add to {name}", { name: board.name })}
    >
      <View style={styles.searchBar}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("Search the Top 250...")}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
        />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!trimmed && movies.length > 0 && (
          <Text style={styles.groupLabel}>{t("From your watchlist")}</Text>
        )}
        {movies.map((movie) => {
          const isOn = board.movieIds.includes(movie.id);
          return (
            <Pressable
              key={movie.id}
              style={styles.row}
              onPress={() => toggleBoardMovie(board.id, movie.id)}
              accessibilityState={{ checked: isOn }}
            >
              <MoviePoster uri={movie.poster} style={styles.rowPoster} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {movie.title}
                </Text>
                <Text style={styles.rowYear}>{movie.year}</Text>
              </View>
              {isOn ? (
                <CheckCircle size={22} color={colors.success} />
              ) : (
                <Plus size={22} color={colors.textSecondary} />
              )}
            </Pressable>
          );
        })}
        {movies.length === 0 && (
          <Text style={styles.empty}>
            {trimmed
              ? t("No movies found.")
              : t("Search for a movie to add it.")}
          </Text>
        )}
      </ScrollView>
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    searchInput: {
      ...typography.body,
      flex: 1,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
    },
    list: {
      flex: 1,
    },
    groupLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.xs + 2,
    },
    rowPoster: {
      width: 48,
      height: 72,
    },
    rowInfo: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    rowYear: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      paddingVertical: spacing.xl,
    },
  });

export default BoardMoviesSheet;

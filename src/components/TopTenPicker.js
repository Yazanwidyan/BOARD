import { Search, X } from "lucide-react-native";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { getMovieById } from "../data/movies";
import { TOP_TEN_SIZE, useProfileStore } from "../store/profileStore";
import { showToast } from "../store/toastStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { BottomSheet } from "./BottomSheet";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";

const COLUMNS = 3;

// Pick your top ten by hand from everything you've watched. Tap a poster to
// add it (it takes the next rank), tap it again to take it out — the ranks
// close up behind it. Changes save as you go.
export const TopTenPicker = ({ visible, onClose, watched }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width: windowWidth } = useWindowDimensions();
  const topTen = useProfileStore((state) => state.topTen) ?? [];
  const toggleTopTen = useProfileStore((state) => state.toggleTopTen);
  const [query, setQuery] = useState("");

  const posterWidth =
    (windowWidth - spacing.md * 2 - 2 * (COLUMNS - 1)) / COLUMNS;

  // Most recently watched first.
  const normalizedQuery = query.trim().toLowerCase();
  const movies = [...watched]
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean)
    .filter(
      (movie) =>
        !normalizedQuery || movie.title.toLowerCase().includes(normalizedQuery),
    );

  const toggle = (movie) => {
    const isPicked = topTen.includes(movie.id);
    if (!isPicked && topTen.length >= TOP_TEN_SIZE) {
      showToast("Your top ten is full — take one out first");
      return;
    }
    toggleTopTen(movie.id);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Your top ten"
      subtitle={`${topTen.length} of ${TOP_TEN_SIZE} picked · tap to add or remove`}
      footer={<PrimaryButton label="Done" onPress={onClose} />}
    >
      <View style={styles.search}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your watched movies"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {!!query && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={movies}
        keyExtractor={(movie) => movie.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {watched.length === 0
              ? "Mark movies as watched to pick your top ten."
              : "No watched movie matches that."}
          </Text>
        }
        renderItem={({ item: movie }) => {
          const rank = topTen.indexOf(movie.id) + 1;
          const isPicked = rank > 0;
          return (
            <Pressable
              style={{ width: posterWidth }}
              onPress={() => toggle(movie)}
              accessibilityLabel={
                isPicked
                  ? `${movie.title}, number ${rank}. Tap to remove`
                  : `Add ${movie.title} to your top ten`
              }
            >
              <View>
                <MoviePoster
                  uri={movie.poster}
                  style={[
                    { width: posterWidth, height: posterWidth * 1.5 },
                    !isPicked &&
                      topTen.length >= TOP_TEN_SIZE &&
                      styles.posterDimmed,
                  ]}
                />
                {isPicked && (
                  <>
                    <View style={styles.pickedFrame} pointerEvents="none" />
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{rank}</Text>
                    </View>
                  </>
                )}
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {movie.title}
              </Text>
            </Pressable>
          );
        }}
      />
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      height: 44,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    searchInput: {
      ...typography.body,
      flex: 1,
      color: colors.textPrimary,
      paddingVertical: 0,
    },
    grid: {
      paddingBottom: spacing.lg,
    },
    row: {
      gap: 2,
      marginBottom: spacing.md,
    },
    posterDimmed: {
      opacity: 0.35,
    },
    pickedFrame: {
      ...StyleSheet.absoluteFill,
      borderWidth: 2,
      borderColor: colors.textPrimary,
    },
    rankBadge: {
      position: "absolute",
      top: 6,
      left: 6,
      minWidth: 26,
      height: 26,
      paddingHorizontal: 6,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.textPrimary,
    },
    rankText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.background,
    },
    title: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xl,
    },
  });

export default TopTenPicker;

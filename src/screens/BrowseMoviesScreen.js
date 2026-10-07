import { Bookmark, BookmarkCheck, Search } from "lucide-react-native";
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

import { StackHeader } from "../components/ScreenHeader";
import { MoviePoster } from "../components/MoviePoster";
import { MOVIES } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { toggleBucketListWithFeedback } from "../utils/achievementFeedback";
import { isInBucketList } from "../utils/movieFilters";

const MovieRow = ({ movie, inBucketList, onToggle, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <MoviePoster uri={movie.poster} radius={0} style={styles.rowPoster} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {movie.title}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={styles.rowYear}>{movie.year}</Text>
        </View>
      </View>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        style={[styles.toggleButton, inBucketList && styles.toggleButtonActive]}
      >
        {inBucketList ? (
          <BookmarkCheck size={18} color={colors.textPrimary} />
        ) : (
          <Bookmark size={18} color={colors.textSecondary} />
        )}
      </Pressable>
    </Pressable>
  );
};

// Also the "All ›" target for Discover's rows: given `title` + `movieIds`
// params it lists just that row (in its order); without them, the whole
// catalog.
export const BrowseMoviesScreen = ({ navigation, route }) => {
  const rowTitle = route?.params?.title;
  const rowIds = route?.params?.movieIds;
  const colors = useColors();
  const styles = createStyles(colors);
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();
  const bucketList = useMovieStore((state) => state.bucketList);

  const baseMovies = useMemo(
    () =>
      rowIds
        ? rowIds
            .map((id) => MOVIES.find((movie) => movie.id === id))
            .filter(Boolean)
        : MOVIES,
    [rowIds],
  );

  const filteredMovies = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return baseMovies;
    return baseMovies.filter((movie) =>
      movie.title.toLowerCase().includes(trimmed),
    );
  }, [query, baseMovies]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StackHeader
        title={rowTitle ?? "Browse Movies"}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchBar}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={
            rowIds
              ? `Search ${rowIds.length} movies...`
              : "Search the Top 250..."
          }
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filteredMovies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <MovieRow
            movie={item}
            inBucketList={isInBucketList(bucketList, item.id)}
            onToggle={() => toggleBucketListWithFeedback(item.id)}
            onPress={() =>
              navigation.navigate("MovieDetails", { movieId: item.id })
            }
          />
        )}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    // Row titles from Discover can be long ("Because you love …"), so it
    // takes the middle space and truncates rather than pushing the sides.
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
      ...typography.body,
    },
    listContent: {
      paddingTop: spacing.md,
    },
    // Full-width rows split by hairlines.
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowPoster: {
      width: 44,
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
  });

export default BrowseMoviesScreen;

import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bookmark,
  BookmarkCheck,
  Search,
} from "lucide-react-native";
import { useColors } from "../theme/useColors";
import { typography } from "../theme/typography";
import { radius, spacing } from "../theme/spacing";
import { MoviePoster } from "../components/MoviePoster";
import { RatingBadge } from "../components/RatingBadge";
import { BackButton } from "../components/BackButton";
import { MOVIES } from "../data/movies";
import { useMovieStore } from "../store/movieStore";

const MovieRow = ({ movie, inBucketList, onToggle, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <MoviePoster uri={movie.poster} style={styles.rowPoster} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {movie.title}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={styles.rowYear}>{movie.year}</Text>
          <RatingBadge rating={movie.rating} size="sm" />
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

export const BrowseMoviesScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();
  const bucketList = useMovieStore((state) => state.bucketList);
  const toggleBucketList = useMovieStore((state) => state.toggleBucketList);

  const filteredMovies = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return MOVIES;
    return MOVIES.filter((movie) =>
      movie.title.toLowerCase().includes(trimmed),
    );
  }, [query]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Browse Movies</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.searchBar}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search the Top 250..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filteredMovies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <MovieRow
            movie={item}
            inBucketList={bucketList.includes(item.id)}
            onToggle={() => toggleBucketList(item.id)}
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
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
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
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
      backgroundColor: colors.backgroundSecondary,
    },
    toggleButtonActive: {
      backgroundColor: colors.surfaceSoft,
    },
  });

export default BrowseMoviesScreen;

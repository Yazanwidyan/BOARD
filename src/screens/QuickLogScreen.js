import * as Haptics from "expo-haptics";
import { Bookmark, BookmarkCheck, Check, Search, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { MoviePoster } from "../components/MoviePoster";
import { StackHeader } from "../components/ScreenHeader";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { useMovieSearch } from "../hooks/useMovieSearch";
import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { useRecentSearchStore } from "../store/recentSearchStore";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { giveWatchedFeedback } from "../utils/achievementFeedback";

const RESULTS_LIMIT = 30;
const WATCHLIST_COUNT = 8;

// The ＋ tab: log a film fast. Search any film, then Log it (marks it
// watched and goes straight to tiering it) or save it to your watchlist.
// Before you type: tonight's pick and your newest watchlist saves, each
// one tap from logged — what you most likely just watched.
export const QuickLogScreen = ({ navigation }) => {
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const toggleBucketList = useMovieStore((state) => state.toggleBucketList);
  const addSearch = useRecentSearchStore((state) => state.addSearch);
  const { results, searching, failed } = useMovieSearch(query, RESULTS_LIMIT);

  const trimmed = query.trim();
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const savedIds = new Set(bucketList.map((entry) => entry.movieId));

  // Logged: watched now, then tier it — in place of this screen, so
  // finishing the tier goes back to wherever you were.
  const log = (movie) => {
    if (watchedIds.has(movie.id)) return;
    if (trimmed) addSearch(query);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { watched: watchedBefore, bucketList: bucketListBefore } = useMovieStore.getState();
    toggleWatched(movie.id);
    giveWatchedFeedback(movie.id, watchedBefore, bucketListBefore);
    navigation.replace("TierMovie", { movieId: movie.id });
  };

  const toggleSaved = (movie) => {
    Haptics.selectionAsync();
    const saved = savedIds.has(movie.id);
    toggleBucketList(movie.id);
    showToast(saved ? t("Removed from your watchlist") : t("Added to your watchlist"));
  };

  // Before you type: what you're likeliest to have just watched.
  const picked = pickedMovieId && !watchedIds.has(pickedMovieId) ? getMovieById(pickedMovieId) : null;
  const fromWatchlist = [...bucketList]
    .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
    .map((entry) => getMovieById(entry.movieId))
    .filter((movie) => movie && movie.id !== picked?.id)
    .slice(0, WATCHLIST_COUNT);

  const row = (movie, { subtitle } = {}) => {
    const isWatched = watchedIds.has(movie.id);
    const isSaved = savedIds.has(movie.id);
    return (
      <Pressable
        key={movie.id}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
        accessibilityRole="button"
        accessibilityLabel={movie.title}
      >
        <MoviePoster uri={movie.poster} style={styles.poster} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {movie.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {subtitle ?? [movie.year, movie.director].filter(Boolean).join(" · ")}
          </Text>
        </View>
        {!isWatched && (
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.rowPressed]}
            onPress={() => toggleSaved(movie)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? t("On your watchlist") : t("Add to watchlist")}
          >
            {isSaved ? (
              <BookmarkCheck size={20} color={colors.textPrimary} strokeWidth={1.9} />
            ) : (
              <Bookmark size={20} color={colors.textSecondary} strokeWidth={1.9} />
            )}
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.logButton,
            isWatched && styles.logButtonDone,
            pressed && styles.rowPressed,
          ]}
          onPress={() => log(movie)}
          disabled={isWatched}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityState={{ disabled: isWatched }}
        >
          {isWatched && <Check size={14} color={colors.success} strokeWidth={2.6} />}
          <Text style={[styles.logText, isWatched && styles.logTextDone]}>
            {isWatched ? t("Logged") : t("Log")}
          </Text>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("Log")} close onBack={() => navigation.goBack()} />

      <View style={styles.searchBar}>
        <Search size={18} color={colors.textSecondary} strokeWidth={1.9} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => trimmed && addSearch(query)}
          placeholder={t("Search a film to log or save")}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel={t("Clear")}>
            <X size={18} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {trimmed ? (
          results.length > 0 ? (
            results.map(({ movie, matchedBy }) =>
              row(movie, {
                subtitle: matchedBy
                  ? [movie.year, matchedBy.name].filter(Boolean).join(" · ")
                  : undefined,
              }),
            )
          ) : (
            <Text style={styles.empty}>
              {searching
                ? t("Searching…")
                : failed
                  ? t("Can't search right now — check your connection.")
                  : t("No movies found.")}
            </Text>
          )
        ) : picked || fromWatchlist.length > 0 ? (
          <>
            {picked && (
              <>
                <Text style={styles.label}>{t("Tonight's pick")}</Text>
                {row(picked)}
              </>
            )}
            {fromWatchlist.length > 0 && (
              <>
                <Text style={styles.label}>{t("On your watchlist")}</Text>
                {fromWatchlist.map((movie) => row(movie))}
              </>
            )}
          </>
        ) : (
          <Text style={styles.empty}>
            {t("Search any film — log what you've watched, or save what you want to see.")}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.control,
    },
    searchInput: {
      ...typography.body,
      flex: 1,
      paddingVertical: spacing.sm + 4,
      color: colors.textPrimary,
    },
    body: {
      paddingTop: spacing.md,
    },
    label: {
      ...typography.label,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    rowPressed: {
      opacity: 0.7,
    },
    poster: {
      width: 44,
      aspectRatio: 2 / 3,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      color: colors.textMuted,
    },
    iconButton: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: shape.chip,
    },
    // Log: the main thing here, filled; once logged, a quiet ✓.
    logButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      height: 38,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.selected,
      borderRadius: shape.chip,
    },
    logButtonDone: {
      paddingHorizontal: spacing.sm + 2,
      backgroundColor: colors.successSoft,
    },
    logText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.selectedText,
    },
    logTextDone: {
      color: colors.success,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      paddingHorizontal: spacing.xl,
      marginTop: spacing.xl,
    },
  });

export default QuickLogScreen;

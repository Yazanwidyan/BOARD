import { Bookmark, BookmarkCheck, ChevronRight, ClipboardPaste, Clock, Search, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import * as Clipboard from "expo-clipboard";

import { BottomSheet } from "../components/BottomSheet";
import { BrowseTiles } from "../components/BrowseTiles";
import { MoviePoster } from "../components/MoviePoster";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { TierBadge } from "../components/TierBadge";
import { getAllKnownMovies, rememberMovies } from "../data/movies";
import { useMovieSearch } from "../hooks/useMovieSearch";
import { api } from "../services/api";
import { useRecentSearchStore } from "../store/recentSearchStore";
import { showToast } from "../store/toastStore";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { toggleBucketListWithFeedback } from "../utils/achievementFeedback";
import { getSagaForPerson } from "../utils/collections";
import { byWeightedRating, formatRuntime, isInBucketList } from "../utils/movieFilters";
import { getTier } from "../utils/tiers";
import { t, useIsRTL } from "../i18n";

const RESULTS_LIMIT = 60;
const PEOPLE_SHOWN = 6;
const FACE = 56;

// One pasted title: ReelBoard's own movies first, then all of TMDB — the
// exact title, else one containing it.
const findTitle = async (line) => {
  const lower = line.toLowerCase();
  const pick = (movies) =>
    movies.find((movie) => movie.title.toLowerCase() === lower) ??
    movies.find((movie) => movie.title.toLowerCase().includes(lower));
  const term = encodeURIComponent(line);
  const pool = await api.get(`/movies?q=${term}&limit=10`);
  rememberMovies(pool.movies);
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

// The people a search found — the directors and actors its films came up
// for ("nolan", "dicaprio") — with how many of their films the app knows,
// most first: [{ name, kind, count, photo, saga, movieIds }].
const peopleIn = (results) => {
  const found = new Map();
  results.forEach(({ matchedBy }) => {
    if (matchedBy && !found.has(matchedBy.name)) found.set(matchedBy.name, matchedBy.kind);
  });
  if (found.size === 0) return [];
  const known = getAllKnownMovies();
  return [...found.entries()]
    .slice(0, PEOPLE_SHOWN)
    .map(([name, kind]) => {
      const films = known
        .filter((movie) => (kind === "director" ? movie.director === name : movie.cast?.includes(name)))
        .sort(byWeightedRating);
      const saga = getSagaForPerson(name);
      return {
        name,
        kind,
        count: films.length,
        photo: saga?.art?.photo ?? null,
        saga,
        movieIds: films.map((movie) => movie.id),
      };
    })
    .sort((a, b) => b.count - a.count);
};

// Why a film came up when it wasn't its title: "Directed by …", "With …".
const noteOf = (matchedBy) =>
  matchedBy.kind === "director"
    ? t("Directed by {name}", { name: matchedBy.name })
    : t("With {name}", { name: matchedBy.name });

const metaOf = (movie) =>
  [movie.year, movie.runtime ? formatRuntime(movie.runtime) : null, movie.genres?.[0]].filter(Boolean).join(" · ");

// A film's end of its row: your tier when you've seen it (dashed until
// you tier it), else a bookmark to save it.
const SaveOrTier = ({ movie, entry, saved, colors, styles }) =>
  entry ? (
    <TierBadge tier={getTier(entry)} size={28} />
  ) : (
    <Pressable
      onPress={() => toggleBucketListWithFeedback(movie.id)}
      hitSlop={8}
      style={({ pressed }) => [styles.save, saved && styles.saveOn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={saved ? t("Watchlisted") : t("Watchlist")}
    >
      {saved ? (
        <BookmarkCheck size={17} color={colors.brandText} strokeWidth={2.2} />
      ) : (
        <Bookmark size={17} color={colors.textPrimary} strokeWidth={2} />
      )}
    </Pressable>
  );

// Search, over whatever you were on: the field at the top (Cancel puts it
// away). Before you type — what you searched lately, the kinds of film to
// browse, pasting a list. As you type — the top result, big; the people
// it found (their collection, or all their films); then every film, each
// with why it came up and your tier or a bookmark.
export const SearchScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const [query, setQuery] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteResult, setPasteResult] = useState(null);
  const [matching, setMatching] = useState(false);
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const recentSearches = useRecentSearchStore((state) => state.recentSearches);
  const addSearch = useRecentSearchStore((state) => state.addSearch);
  const clearSearches = useRecentSearchStore((state) => state.clearSearches);

  const trimmed = query.trim();
  // Any movie — by title, director or cast, best matches first
  // (hooks/useMovieSearch).
  const search = useMovieSearch(query, RESULTS_LIMIT);
  const entryOf = (movieId) => watched.find((entry) => entry.movieId === movieId) ?? null;
  // The first film is the top result when its title is what matched.
  const top = search.results[0] && !search.results[0].matchedBy ? search.results[0] : null;
  const rest = top ? search.results.slice(1) : search.results;
  const people = peopleIn(search.results);

  const openMovie = (movie) => {
    // A search that found something: remembered.
    addSearch(query);
    navigation.navigate("MovieDetails", { movieId: movie.id });
  };
  const openPerson = (person) => {
    addSearch(query);
    if (person.saga) navigation.navigate("CollectionDetails", { collectionId: person.saga.id });
    else navigation.navigate("BrowseMovies", { title: person.name, movieIds: person.movieIds });
  };

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

  const closePaste = () => {
    setPasteMode(false);
    setPasteText("");
    setPasteResult(null);
  };
  const pasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      showToast(t("Nothing to paste — copy a list first."));
      return;
    }
    setPasteText(text);
    setPasteResult(null);
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

  const topResult = top && (
    <View style={styles.block}>
      <Text style={styles.heading}>{t("Top result")}</Text>
      <Pressable
        style={({ pressed }) => [styles.topCard, pressed && styles.pressed]}
        onPress={() => openMovie(top.movie)}
        accessibilityRole="button"
        accessibilityLabel={top.movie.title}
      >
        <MoviePoster uri={top.movie.poster} style={styles.topPoster} />
        <View style={styles.topWords}>
          <Text style={styles.topTitle} numberOfLines={2}>
            {top.movie.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {metaOf(top.movie)}
          </Text>
          {!!top.movie.director && (
            <Text style={styles.note} numberOfLines={1}>
              {t("Directed by {name}", { name: top.movie.director })}
            </Text>
          )}
        </View>
        <SaveOrTier
          movie={top.movie}
          entry={entryOf(top.movie.id)}
          saved={isInBucketList(bucketList, top.movie.id)}
          colors={colors}
          styles={styles}
        />
      </Pressable>
    </View>
  );

  const peopleRow = people.length > 0 && (
    <View style={styles.block}>
      <Text style={styles.heading}>{t("People")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.peopleRow}
      >
        {people.map((person) => (
          <Pressable
            key={person.name}
            style={({ pressed }) => [styles.person, pressed && styles.pressed]}
            onPress={() => openPerson(person)}
            accessibilityRole="button"
            accessibilityLabel={person.name}
          >
            {person.photo ? (
              <Image source={{ uri: person.photo }} style={styles.face} />
            ) : (
              <View style={[styles.face, styles.faceEmpty]}>
                <Text style={styles.initials}>
                  {person.name
                    .split(" ")
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join("")}
                </Text>
              </View>
            )}
            <View style={styles.personWords}>
              <Text style={styles.personName} numberOfLines={1}>
                {person.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {person.kind === "director" ? t("Director") : t("Actor")}
                {person.count > 1 ? ` · ${t("{count} films", { count: person.count })}` : ""}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  // Nothing (yet): too few letters, still looking, offline, or no match.
  const nothing = search.tooShort ? (
    <Text style={styles.hint}>{t("Keep typing…")}</Text>
  ) : search.searching ? (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.textSecondary} />
    </View>
  ) : (
    <EmptyState
      art="noMatches"
      title={search.failed ? t("Can't search right now — check your connection.") : t("No matches")}
      subtitle={
        search.failed ? "" : t('Nothing found for "{query}". Try a director or an actor.', { query: trimmed })
      }
    />
  );

  return (
    <View style={styles.container}>
      {/* The field, and Cancel to put Search away. */}
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.field}>
          {search.searching ? (
            <ActivityIndicator size="small" color={colors.textSecondary} style={styles.fieldIcon} />
          ) : (
            <Search size={18} color={colors.textSecondary} strokeWidth={2.2} style={styles.fieldIcon} />
          )}
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("Search movies, directors, actors...")}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, rtl && styles.inputRtl]}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => addSearch(query)}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={10}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel={t("Clear")}
            >
              <X size={13} color={colors.background} strokeWidth={3} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button">
          <Text style={styles.cancel}>{t("Cancel")}</Text>
        </Pressable>
      </View>

      {trimmed ? (
        search.results.length === 0 ? (
          nothing
        ) : (
          <FlatList
            data={rest}
            keyExtractor={(item) => item.movie.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListHeaderComponent={
              <>
                {topResult}
                {peopleRow}
                {rest.length > 0 && <Text style={styles.heading}>{t("Movies")}</Text>}
              </>
            }
            ListFooterComponent={
              search.searching ? (
                <View style={styles.more}>
                  <ActivityIndicator size="small" color={colors.textMuted} />
                  <Text style={styles.meta}>{t("Searching all films…")}</Text>
                </View>
              ) : null
            }
            renderItem={({ item: { movie, matchedBy }, index }) => (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => openMovie(movie)}
                accessibilityRole="button"
                accessibilityLabel={movie.title}
              >
                <MoviePoster uri={movie.poster} style={styles.rowPoster} />
                <View style={[styles.rowWords, index < rest.length - 1 && styles.rule]}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {movie.title}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {metaOf(movie)}
                    </Text>
                    {!!matchedBy && (
                      <Text style={styles.note} numberOfLines={1}>
                        {noteOf(matchedBy)}
                      </Text>
                    )}
                  </View>
                  <SaveOrTier
                    movie={movie}
                    entry={entryOf(movie.id)}
                    saved={isInBucketList(bucketList, movie.id)}
                    colors={colors}
                    styles={styles}
                  />
                </View>
              </Pressable>
            )}
          />
        )
      ) : (
        // Before you type: what you searched lately, the kinds of film to
        // browse, and pasting a list.
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        >
          {recentSearches.length > 0 && (
            <View style={styles.block}>
              <View style={styles.headingRow}>
                <Text style={[styles.heading, styles.headingInRow]}>{t("Recent")}</Text>
                <Pressable onPress={clearSearches} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.clear}>{t("Clear")}</Text>
                </Pressable>
              </View>
              <View style={styles.chips}>
                {recentSearches.map((term) => (
                  <Pressable
                    key={term}
                    style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                    onPress={() => setQuery(term)}
                    accessibilityRole="button"
                  >
                    <Clock size={13} color={colors.textMuted} strokeWidth={2.2} />
                    <Text style={styles.chipText} numberOfLines={1}>
                      {term}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.block}>
            <Text style={styles.heading}>{t("Browse")}</Text>
            <BrowseTiles navigation={navigation} />
          </View>

          {/* Pasting a list: a row at the end, what it does under it. */}
          <Pressable
            style={({ pressed }) => [styles.pasteCard, pressed && styles.pressed]}
            onPress={() => setPasteMode(true)}
            accessibilityRole="button"
          >
            <View style={styles.pasteIcon}>
              <ClipboardPaste size={18} color={colors.brand} strokeWidth={2.2} />
            </View>
            <View style={styles.pasteCardWords}>
              <Text style={styles.rowTitle}>{t("Paste a list of titles")}</Text>
              <Text style={styles.meta}>{t("Add a whole list to your watchlist at once.")}</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} style={rtl && styles.flipped} />
          </Pressable>
        </ScrollView>
      )}

      {/* Paste a list: the app's sheet (it rises above the keyboard) — the
          titles, then what they matched, then Add. */}
      <BottomSheet
        visible={pasteMode}
        onClose={closePaste}
        size="auto"
        title={t("Paste a List of Titles")}
        subtitle={t("One title per line (or comma-separated).")}
        footer={
          pasteResult ? (
            <PrimaryButton
              label={t("Add {matchedCount} to Watchlist", { matchedCount: pasteResult.matched.length })}
              onPress={handleAddMatched}
              disabled={pasteResult.matched.length === 0}
            />
          ) : (
            <PrimaryButton
              label={matching ? t("Finding titles…") : t("Find titles")}
              onPress={handlePasteSubmit}
              disabled={!pasteText.trim() || matching}
            />
          )
        }
      >
        {pasteResult ? (
          <View style={styles.pasteResult}>
            <Text style={styles.pasteSummary}>
              {t("{count} found", { count: pasteResult.matched.length })}
              {pasteResult.unmatched.length > 0
                ? t(", {unmatchedCount} not found", { unmatchedCount: pasteResult.unmatched.length })
                : ""}
            </Text>
            {pasteResult.matched.map((movie) => (
              <View key={movie.id} style={styles.pasteRow}>
                <MoviePoster uri={movie.poster} style={styles.pastePoster} />
                <View style={styles.pasteWords}>
                  <Text style={styles.pasteRowTitle} numberOfLines={1}>
                    {movie.title}
                  </Text>
                  {!!movie.year && <Text style={styles.pasteRowMeta}>{movie.year}</Text>}
                </View>
                {isInBucketList(bucketList, movie.id) && (
                  <Text style={styles.pasteRowMeta}>{t("Saved")}</Text>
                )}
              </View>
            ))}
            {pasteResult.unmatched.map((line) => (
              <Text key={line} style={styles.pasteMissing} numberOfLines={1}>
                {t("Not found: {title}", { title: line })}
              </Text>
            ))}
            <Pressable onPress={() => setPasteResult(null)} hitSlop={8} style={styles.pasteEdit}>
              <Text style={styles.pasteEditText}>{t("Edit the list")}</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Pressable
              onPress={pasteFromClipboard}
              style={({ pressed }) => [styles.clipboardButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <ClipboardPaste size={16} color={colors.textPrimary} strokeWidth={2.2} />
              <Text style={styles.clipboardText}>{t("Paste from clipboard")}</Text>
            </Pressable>
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
          </View>
        )}
      </BottomSheet>
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
    // The field and Cancel, at the top.
    top: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    field: {
      flex: 1,
      height: 46,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    fieldIcon: {
      width: 18,
    },
    input: {
      ...typography.subtitle,
      flex: 1,
      height: "100%",
      paddingHorizontal: spacing.sm + 2,
      color: colors.textPrimary,
    },
    inputRtl: {
      textAlign: "right",
    },
    // ✕, a small filled circle.
    clearButton: {
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.textMuted,
      borderRadius: 10,
    },
    cancel: {
      ...typography.subtitle,
      color: colors.brand,
    },
    block: {
      marginBottom: spacing.lg + spacing.sm,
    },
    // As Home's section headings.
    heading: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      lineHeight: 27,
      letterSpacing: -0.3,
      color: colors.textPrimary,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm + 2,
    },
    headingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingEnd: spacing.md,
      marginBottom: spacing.sm + 2,
    },
    headingInRow: {
      marginBottom: 0,
    },
    clear: {
      ...typography.bodyBold,
      color: colors.brand,
    },
    // Recent searches: pills that wrap.
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      maxWidth: "100%",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: shape.chip,
    },
    chipText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    // Paste a list.
    pasteCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginHorizontal: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    pasteIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
      borderRadius: 20,
    },
    pasteCardWords: {
      flex: 1,
      gap: 2,
    },
    // The top result: a card, its poster big.
    topCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginHorizontal: spacing.md,
      padding: spacing.sm + 2,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    topPoster: {
      width: 84,
      height: 126,
    },
    topWords: {
      flex: 1,
      gap: 4,
    },
    topTitle: {
      ...typography.title,
      color: colors.textPrimary,
    },
    // People: a face, a name, what they do.
    peopleRow: {
      gap: spacing.rail,
      paddingHorizontal: spacing.md,
    },
    person: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      maxWidth: 240,
      paddingVertical: spacing.sm,
      paddingStart: spacing.sm,
      paddingEnd: spacing.md,
      backgroundColor: colors.card,
      borderRadius: FACE,
    },
    face: {
      width: FACE - spacing.sm * 2,
      height: FACE - spacing.sm * 2,
      borderRadius: FACE,
    },
    faceEmpty: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
    },
    initials: {
      ...typography.bodyBold,
      color: colors.textSecondary,
    },
    personWords: {
      flexShrink: 1,
    },
    personName: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    // A film: its poster, then the words over a hairline, then your tier
    // or a bookmark.
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingStart: spacing.md,
    },
    // Room above and below each poster, so no two touch.
    rowPoster: {
      width: 44,
      height: 66,
      marginVertical: spacing.sm,
    },
    rowWords: {
      flex: 1,
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginStart: spacing.md,
      paddingEnd: spacing.md,
    },
    rule: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    note: {
      ...typography.caption,
      color: colors.textMuted,
    },
    save: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
      borderRadius: 18,
    },
    saveOn: {
      backgroundColor: colors.brand,
    },
    more: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.lg,
    },
    hint: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xl,
    },
    loading: {
      paddingTop: spacing.xl * 2,
    },
    // Paste a list.
    clipboardButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 44,
      marginBottom: spacing.sm + 2,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: shape.card,
    },
    clipboardText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    pasteInput: {
      ...typography.body,
      color: colors.textPrimary,
      backgroundColor: colors.card,
      padding: spacing.md,
      minHeight: 140,
      maxHeight: 220,
      borderRadius: shape.control,
    },
    pasteResult: {
      gap: spacing.sm,
    },
    pasteSummary: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    pasteRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    pastePoster: {
      width: 34,
      height: 51,
    },
    pasteWords: {
      flex: 1,
    },
    pasteRowTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    pasteRowMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    pasteMissing: {
      ...typography.caption,
      color: colors.textMuted,
    },
    pasteEdit: {
      alignSelf: "flex-start",
      marginTop: spacing.xs,
    },
    pasteEditText: {
      ...typography.bodyBold,
      color: colors.brand,
    },
  });

export default SearchScreen;

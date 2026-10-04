import {
  ArrowDownWideNarrow,
  Bookmark,
  CheckCircle,
  Circle,
  Dices,
  Filter,
  Layers,
  ListPlus,
  Plus,
  Star,
  X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AddToBucketListSheet } from "../components/AddToBucketListSheet";
import { AddToWatchedSheet } from "../components/AddToWatchedSheet";
import { BottomSheet } from "../components/BottomSheet";
import { CollectionContinueCard } from "../components/CollectionContinueCard";
import { EmptyState } from "../components/EmptyState";
import { MovieGrid } from "../components/MovieGrid";
import { MoviePoster } from "../components/MoviePoster";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { getMovieById } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  getCollectionProgress,
  getCollectionSections,
  getCurrentCollection,
  getUnlockedCollectionSections,
} from "../utils/collections";
import { matchesGenres } from "../utils/movieFilters";
import { shuffle } from "../utils/shuffle";

const PICK_MAX = 10;
const PICK_MIN = 2;
const NUM_COLUMNS = 3;
const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
];
// The active switch pill is a fixed white gradient regardless of theme, so
// its icon/text need a fixed dark color to stay legible on it.
const TOOLBAR_ON_LIGHT_TEXT = "#131313";

const SWITCH_OPTIONS = [
  { key: "bucketlist", label: "Watchlist", Icon: Bookmark },
  { key: "watched", label: "Watched", Icon: CheckCircle },
  { key: "collections", label: "Collections", Icon: Layers },
];

const SORT_OPTIONS = [
  { key: "recent", label: "Recently Watched" },
  { key: "rating", label: "Highest Rated" },
  { key: "watchCount", label: "Most Watched" },
];

const CollectionCollage = ({ movies, styles }) => (
  <View style={styles.collectionCollage}>
    {movies.slice(0, 3).map((movie, index) => (
      <MoviePoster
        key={movie.id}
        uri={movie.poster}
        radius={radius.xs}
        style={[
          styles.collectionCollagePoster,
          { left: index * 16, zIndex: 3 - index },
        ]}
      />
    ))}
  </View>
);

const CollectionCard = ({ collection, watchedIds, onPress, styles }) => {
  const { watchedCount, total, progress } = getCollectionProgress(
    collection,
    watchedIds,
  );

  return (
    <Pressable style={styles.collectionCard} onPress={onPress}>
      <CollectionCollage movies={collection.movies} styles={styles} />
      <View style={styles.collectionInfo}>
        <Text style={styles.collectionTitle} numberOfLines={1}>
          {collection.title}
        </Text>
        <View style={styles.collectionBarTrack}>
          <View
            style={[styles.collectionBarFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={styles.collectionProgressText}>
          {watchedCount}/{total} watched
        </Text>
      </View>
    </Pressable>
  );
};

// Rows in the "See All Collections" browser — same collage+info layout as
// CollectionCard, plus a trailing toggle. A collection with real progress
// always reads as unlocked here regardless of the manual toggle's own
// state, since visibility elsewhere is progress>0 OR manually-added; tapping
// one just manages the manual side of that OR.
const BrowseCollectionRow = ({
  collection,
  watchedIds,
  isUnlocked,
  onToggle,
  styles,
  colors,
}) => {
  const { watchedCount, total, progress } = getCollectionProgress(
    collection,
    watchedIds,
  );

  return (
    <Pressable style={styles.collectionCard} onPress={onToggle}>
      <CollectionCollage movies={collection.movies} styles={styles} />
      <View style={styles.collectionInfo}>
        <Text style={styles.collectionTitle} numberOfLines={1}>
          {collection.title}
        </Text>
        <View style={styles.collectionBarTrack}>
          <View
            style={[styles.collectionBarFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={styles.collectionProgressText}>
          {watchedCount}/{total} watched
        </Text>
      </View>
      {isUnlocked ? (
        <CheckCircle size={22} color={colors.success} />
      ) : (
        <Circle size={22} color={colors.textMuted} />
      )}
    </Pressable>
  );
};

export const LibraryScreen = ({ navigation, route }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState(route?.params?.initialTab ?? "bucketlist");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddWatchedOpen, setIsAddWatchedOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [sortBy, setSortBy] = useState("recent");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortAnchor, setSortAnchor] = useState({ top: 0, right: spacing.md });
  const sortButtonRef = useRef(null);
  const [isAllCollectionsOpen, setIsAllCollectionsOpen] = useState(false);

  // The tab screen stays mounted between visits, so a fresh `initialTab`
  // param (e.g. tapping a stat a second time) needs to actually switch the
  // view, not just seed the very first render.
  useEffect(() => {
    if (route?.params?.initialTab) {
      setTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  const bucketListEntries = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const unlockedCollectionIds = useMovieStore(
    (state) => state.unlockedCollections,
  );
  const toggleUnlockedCollection = useMovieStore(
    (state) => state.toggleUnlockedCollection,
  );
  const startSession = useSessionStore((state) => state.startSession);

  const bucketListMovies = bucketListEntries
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean)
    .reverse();
  const watchedMovies = watched
    .map((entry) => {
      const movie = getMovieById(entry.movieId);
      return movie
        ? { movie, rating: entry.rating, watchCount: entry.watchCount ?? 1 }
        : null;
    })
    .filter(Boolean);

  const visibleBucketListMovies = bucketListMovies.filter((movie) =>
    matchesGenres(movie, selectedGenres),
  );
  const visibleWatchedMovies = watchedMovies
    .filter(({ movie }) => matchesGenres(movie, selectedGenres))
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating ?? -1) - (a.rating ?? -1);
      if (sortBy === "watchCount") return b.watchCount - a.watchCount;
      return 0;
    });

  const canPick = bucketListMovies.length >= PICK_MIN;
  const hasActiveFilter = selectedGenres.length > 0;

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const currentCollection = getCurrentCollection(watchedIds);
  const unlockedSections = getUnlockedCollectionSections(
    watchedIds,
    unlockedCollectionIds,
  );
  const allCollectionSections = getCollectionSections();
  const hasUnlockedCollections = unlockedSections.length > 0;
  const openCollection = (collectionId) =>
    navigation.navigate("CollectionDetails", { collectionId });

  const toggleGenre = (genre) => {
    setSelectedGenres((current) =>
      current.includes(genre)
        ? current.filter((item) => item !== genre)
        : [...current, genre],
    );
  };

  const handlePickFromList = () => {
    const movies = shuffle(bucketListMovies).slice(0, PICK_MAX);
    startSession(movies);
    navigation.navigate("Swipe");
  };

  const openDetails = (movieId) =>
    navigation.navigate("MovieDetails", { movieId });

  const gap = spacing.md;
  const horizontalPadding = spacing.md;
  const cardWidth =
    (width - horizontalPadding * 2 - gap * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Library</Text>
      </View>

      <View style={styles.switcherWrap}>
        <View style={styles.switcher}>
          {SWITCH_OPTIONS.map(({ key, label, Icon }) => (
            <Pressable
              key={key}
              style={[
                styles.switchOption,
                tab === key && styles.switchOptionActive,
              ]}
              onPress={() => setTab(key)}
            >
              <Icon
                size={15}
                color={
                  tab === key ? TOOLBAR_ON_LIGHT_TEXT : colors.textSecondary
                }
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.switchText,
                  tab === key && styles.switchTextActive,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab !== "collections" ? (
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {tab === "bucketlist" ? "Watchlist" : "Watched"}
            </Text>
            <Text style={styles.subtitle}>
              {tab === "bucketlist"
                ? `${visibleBucketListMovies.length} movies`
                : `${visibleWatchedMovies.length} movies`}
            </Text>
          </View>
          <Pressable
            style={styles.iconButton}
            onPress={() =>
              tab === "bucketlist"
                ? setIsAddOpen(true)
                : setIsAddWatchedOpen(true)
            }
          >
            <Plus size={18} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={() => setIsFilterOpen(true)}
          >
            <Filter size={17} color={colors.textPrimary} strokeWidth={2.2} />
            {hasActiveFilter && <View style={styles.iconButtonDot} />}
          </Pressable>
          {tab === "bucketlist" ? (
            <Pressable
              style={[styles.iconButton, !canPick && styles.iconButtonDisabled]}
              onPress={handlePickFromList}
              disabled={!canPick}
            >
              <Dices size={18} color={colors.textPrimary} strokeWidth={2.2} />
            </Pressable>
          ) : (
            <Pressable
              ref={sortButtonRef}
              style={styles.iconButton}
              onPress={() => {
                sortButtonRef.current?.measureInWindow(
                  (x, y, buttonWidth, buttonHeight) => {
                    setSortAnchor({
                      top: y + buttonHeight + spacing.xs,
                      right: width - (x + buttonWidth),
                    });
                    setIsSortOpen(true);
                  },
                );
              }}
            >
              <ArrowDownWideNarrow
                size={18}
                color={colors.textPrimary}
                strokeWidth={2.2}
              />
              {sortBy !== "recent" && <View style={styles.iconButtonDot} />}
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Collections</Text>
            <Text style={styles.subtitle}>
              {unlockedSections.reduce(
                (sum, section) => sum + section.collections.length,
                0,
              )}{" "}
              unlocked
            </Text>
          </View>
          <Pressable
            style={styles.seeAllButton}
            onPress={() => setIsAllCollectionsOpen(true)}
          >
            <ListPlus size={16} color={colors.textPrimary} strokeWidth={2.2} />
            <Text style={styles.seeAllButtonText}>See All</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tab === "collections" ? (
          <>
            {currentCollection && (
              <View style={styles.continueSection}>
                <Text style={styles.sectionTitle}>Continue</Text>
                <CollectionContinueCard
                  collection={currentCollection}
                  watchedIds={watchedIds}
                  onPress={() => openCollection(currentCollection.id)}
                />
              </View>
            )}

            {!hasUnlockedCollections && (
              <EmptyState
                icon={<Layers size={40} color={colors.textMuted} />}
                title="No collections yet."
                subtitle="Watch a movie that belongs to one, or browse all collections and pick some to track."
                actionLabel="See All Collections"
                onAction={() => setIsAllCollectionsOpen(true)}
              />
            )}

            {unlockedSections.map((section) => (
              <View key={section.type} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.collections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    watchedIds={watchedIds}
                    styles={styles}
                    onPress={() => openCollection(collection.id)}
                  />
                ))}
              </View>
            ))}
          </>
        ) : tab === "bucketlist" ? (
          visibleBucketListMovies.length === 0 ? (
            <EmptyState
              icon={<Bookmark size={40} color={colors.textMuted} />}
              title={hasActiveFilter ? "No matches" : "Your board is empty."}
              subtitle={
                hasActiveFilter
                  ? "No watchlist movies match the selected genres."
                  : "That's either impressive or a problem."
              }
              actionLabel={hasActiveFilter ? undefined : "Find Something"}
              onAction={
                hasActiveFilter
                  ? undefined
                  : () => navigation.navigate("Discover")
              }
            />
          ) : (
            <MovieGrid
              movies={visibleBucketListMovies}
              onPressMovie={(movie) => openDetails(movie.id)}
            />
          )
        ) : visibleWatchedMovies.length === 0 ? (
          <EmptyState
            icon={<CheckCircle size={40} color={colors.textMuted} />}
            title={hasActiveFilter ? "No matches" : "Nothing watched yet."}
            subtitle={
              hasActiveFilter
                ? "No watched movies match the selected genres."
                : "Let's change that."
            }
          />
        ) : (
          <View
            style={[styles.grid, { paddingHorizontal: horizontalPadding, gap }]}
          >
            {visibleWatchedMovies.map(({ movie, rating, watchCount }) => (
              <Pressable
                key={movie.id}
                onPress={() => openDetails(movie.id)}
                style={({ pressed }) => [
                  { width: cardWidth },
                  pressed && styles.pressed,
                ]}
              >
                <View>
                  <MoviePoster
                    uri={movie.poster}
                    shadow
                    radius={radius.sm}
                    style={{ width: cardWidth, aspectRatio: 2 / 3 }}
                  />
                  <View style={styles.imdbBadge}>
                    <Star
                      size={10}
                      color={colors.rating}
                      fill={colors.rating}
                    />
                    <Text style={styles.imdbBadgeText}>
                      {movie.rating.toFixed(1)}
                    </Text>
                  </View>
                  {rating != null && (
                    <View style={styles.userRatingBadge}>
                      <Star
                        size={10}
                        color={colors.accentContrast}
                        fill={colors.accentContrast}
                      />
                      <Text style={styles.userRatingBadgeText}>
                        {rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                  {watchCount > 1 && (
                    <View style={styles.rewatchBadge}>
                      <Text style={styles.rewatchBadgeText}>×{watchCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.movieTitle} numberOfLines={1}>
                  {movie.title}
                </Text>
                <Text style={styles.movieYear}>{movie.year}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: insets.bottom + TAB_BAR_CLEARANCE }} />
      </ScrollView>
      <ScreenBottomFade />
      <AddToBucketListSheet
        visible={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
      <AddToWatchedSheet
        visible={isAddWatchedOpen}
        onClose={() => setIsAddWatchedOpen(false)}
      />

      <BottomSheet
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      >
        <View style={styles.headerRow}>
          <Text style={styles.sheetTitle}>Filter by Genre</Text>
          <Pressable onPress={() => setIsFilterOpen(false)} hitSlop={8}>
            <X size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.chipsWrap}>
          {GENRES.map((genre) => {
            const selected = selectedGenres.includes(genre);
            return (
              <Pressable
                key={genre}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleGenre(genre)}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {genre}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[
            styles.clearRow,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
          onPress={() => setSelectedGenres([])}
          disabled={!hasActiveFilter}
        >
          <Text
            style={[
              styles.clearText,
              !hasActiveFilter && styles.clearTextDisabled,
            ]}
          >
            Clear all
          </Text>
        </Pressable>
      </BottomSheet>

      <Modal
        visible={isSortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSortOpen(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setIsSortOpen(false)}
        >
          <View
            style={[
              styles.sortDropdown,
              { top: sortAnchor.top, right: sortAnchor.right },
            ]}
          >
            {SORT_OPTIONS.map((option) => {
              const selected = sortBy === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={styles.sortRow}
                  onPress={() => {
                    setSortBy(option.key);
                    setIsSortOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortRowText,
                      selected && styles.sortRowTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {option.label}
                  </Text>
                  {selected && (
                    <CheckCircle size={16} color={colors.accentLight} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <BottomSheet
        visible={isAllCollectionsOpen}
        onClose={() => setIsAllCollectionsOpen(false)}
      >
        <View style={styles.headerRow}>
          <Text style={styles.sheetTitle}>All Collections</Text>
          <Pressable onPress={() => setIsAllCollectionsOpen(false)} hitSlop={8}>
            <X size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
        >
          {allCollectionSections.map((section) => (
            <View key={section.type} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.collections.map((collection) => {
                const isUnlocked =
                  getCollectionProgress(collection, watchedIds).progress > 0 ||
                  unlockedCollectionIds.includes(collection.id);
                return (
                  <BrowseCollectionRow
                    key={collection.id}
                    collection={collection}
                    watchedIds={watchedIds}
                    isUnlocked={isUnlocked}
                    onToggle={() => toggleUnlockedCollection(collection.id)}
                    styles={styles}
                    colors={colors}
                  />
                );
              })}
            </View>
          ))}
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // flexGrow (not just the ScrollView's own height) so an EmptyState
    // inside this content — whose own styles rely on flex:1 to center
    // itself — actually has real remaining height to expand into and
    // center within, instead of sizing to its own content and sitting
    // stuck at the top with dead space below it.
    scrollContent: {
      flexGrow: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.card,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      fontSize: 13,
    },
    actionsRow: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.md,
      flexDirection: "row",
      gap: spacing.sm,
    },
    continueSection: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
    section: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    sectionTitle: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    collectionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    collectionCollage: {
      width: 76,
      height: 60,
    },
    collectionCollagePoster: {
      position: "absolute",
      top: 0,
      width: 44,
      aspectRatio: 2 / 3,
    },
    collectionInfo: {
      flex: 1,
      gap: 6,
    },
    collectionTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    collectionBarTrack: {
      height: 6,
      borderRadius: 2,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
    },
    collectionBarFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: colors.accentLight,
    },
    collectionProgressText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    switcherWrap: {
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    switcher: {
      flexDirection: "row",
      backgroundColor: colors.background,
      borderRadius: radius.sm,
      padding: 5,
    },
    switchOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.sm,
    },
    switchOptionActive: {
      backgroundColor: "#FFFFFF",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.14,
      shadowRadius: 10,
      elevation: 4,
    },
    switchText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    switchTextActive: {
      color: TOOLBAR_ON_LIGHT_TEXT,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    iconButtonDisabled: {
      opacity: 0.4,
    },
    iconButtonDot: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.textPrimary,
    },
    seeAllButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    seeAllButtonText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    pressed: {
      opacity: 0.7,
    },
    movieTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    movieYear: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    imdbBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: "rgba(2, 0, 2, 0.65)",
    },
    imdbBadgeText: {
      ...typography.label,
      fontSize: 10,
      color: colors.rating,
    },
    userRatingBadge: {
      position: "absolute",
      top: 6,
      left: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    userRatingBadgeText: {
      ...typography.label,
      fontSize: 10,
      color: colors.accentContrast,
    },
    rewatchBadge: {
      position: "absolute",
      bottom: 6,
      right: 6,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: "rgba(2, 0, 2, 0.65)",
    },
    rewatchBadgeText: {
      ...typography.label,
      fontSize: 10,
      color: "#FFFFFF",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    sheetTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    chip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.background,
    },
    chipSelected: {
      backgroundColor: colors.textPrimary,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    chipTextSelected: {
      color: colors.background,
    },
    clearRow: {
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    clearText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    clearTextDisabled: {
      color: colors.textMuted,
    },
    sortDropdown: {
      position: "absolute",
      minWidth: 180,
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      paddingVertical: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
      elevation: 8,
    },
    sortRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    sortRowText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    sortRowTextActive: {
      ...typography.bodyBold,
      color: colors.accentLight,
    },
  });

export default LibraryScreen;

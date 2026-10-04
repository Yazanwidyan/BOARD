import {
  ArrowDownWideNarrow,
  Bookmark,
  Check,
  CheckCircle,
  ChevronRight,
  Circle,
  Filter,
  Layers,
  ListPlus,
  Plus,
  Search,
  Shuffle,
  Star,
  X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import { AddToBucketListSheet } from "../components/AddToBucketListSheet";
import { AddToWatchedSheet } from "../components/AddToWatchedSheet";
import { BottomSheet } from "../components/BottomSheet";
import { CollectionContinueCard } from "../components/CollectionContinueCard";
import { EmptyState } from "../components/EmptyState";
import { MovieGrid } from "../components/MovieGrid";
import { Popover } from "../components/Popover";
import { PrimaryButton } from "../components/PrimaryButton";
import { MoviePoster } from "../components/MoviePoster";
import {
  HeaderBar,
  HeaderIconButton,
  LargeTitle,
  useCollapsingHeader,
  useHeaderInset,
} from "../components/ScreenHeader";
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
  getCompletedCollectionsCount,
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
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Watched "diary": entries grouped under "OCTOBER 2026" headers, newest
// month first (entries arrive already newest-first). Entries without a
// timestamp land in an "Earlier" group at the end.
const groupByMonth = (items) => {
  const groups = [];
  items.forEach((item) => {
    const date = item.timestamp ? new Date(item.timestamp) : null;
    const key = date ? `${date.getFullYear()}-${date.getMonth()}` : "earlier";
    const label = date
      ? `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
      : "Earlier";
    let group = groups.find((existing) => existing.key === key);
    if (!group) {
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  });
  const dated = groups.filter((group) => group.key !== "earlier");
  const undated = groups.filter((group) => group.key === "earlier");
  return [...dated, ...undated];
};

const matchesQuery = (movie, query) =>
  !query || movie.title.toLowerCase().includes(query.trim().toLowerCase());

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
  const { scrollY, onScroll } = useCollapsingHeader();
  const headerInset = useHeaderInset();
  const [isAllCollectionsOpen, setIsAllCollectionsOpen] = useState(false);
  const [query, setQuery] = useState("");

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
        ? {
            movie,
            rating: entry.rating,
            watchCount: entry.watchCount ?? 1,
            timestamp: entry.timestamp,
          }
        : null;
    })
    .filter(Boolean);

  const visibleBucketListMovies = bucketListMovies.filter(
    (movie) =>
      matchesGenres(movie, selectedGenres) && matchesQuery(movie, query),
  );
  const visibleWatchedMovies = watchedMovies
    .filter(
      ({ movie }) =>
        matchesGenres(movie, selectedGenres) && matchesQuery(movie, query),
    )
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating ?? -1) - (a.rating ?? -1);
      if (sortBy === "watchCount") return b.watchCount - a.watchCount;
      return (b.timestamp ?? 0) - (a.timestamp ?? 0);
    });

  // Diary stats — over everything watched, not just what the current
  // search/filter shows.
  const totalMinutes = watchedMovies.reduce(
    (sum, { movie, watchCount }) => sum + movie.runtime * watchCount,
    0,
  );
  const ratedEntries = watchedMovies.filter(({ rating }) => rating != null);
  const averageRating =
    ratedEntries.length > 0
      ? ratedEntries.reduce((sum, { rating }) => sum + rating, 0) /
        ratedEntries.length
      : null;
  const now = new Date();
  const watchedThisMonth = watchedMovies.filter(({ timestamp }) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }).length;

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
  const unlockedCount = unlockedSections.reduce(
    (sum, section) => sum + section.collections.length,
    0,
  );
  const tabOptions = [
    { key: "bucketlist", label: "Watchlist", count: bucketListMovies.length },
    { key: "watched", label: "Watched", count: watchedMovies.length },
    { key: "collections", label: "Collections", count: unlockedCount },
  ];
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
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerInset },
        ]}
      >
        <LargeTitle
          title="Library"
          subtitle={`${watched.length} watched · ${bucketListEntries.length} saved · ${getCompletedCollectionsCount(watchedIds)} collections done`}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabChipsScroll}
          contentContainerStyle={styles.tabChips}
        >
          {tabOptions.map(({ key, label, count }) => {
            const isActive = tab === key;
            return (
              <Pressable
                key={key}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setTab(key)}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    isActive && styles.tabChipTextActive,
                  ]}
                >
                  {label}
                </Text>
                <View
                  style={[
                    styles.tabChipCount,
                    isActive && styles.tabChipCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabChipCountText,
                      isActive && styles.tabChipCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {tab !== "collections" ? (
          <View style={styles.toolbar}>
            <View style={styles.searchField}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={
                  tab === "bucketlist"
                    ? "Search your watchlist"
                    : "Search what you've watched"
                }
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} hitSlop={8}>
                  <X size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
            {tab === "watched" && (
              <Pressable
                ref={sortButtonRef}
                style={styles.toolButton}
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
                  size={16}
                  color={colors.textPrimary}
                  strokeWidth={2.2}
                />
                <Text style={styles.toolButtonText}>Sort</Text>
                {sortBy !== "recent" && <View style={styles.toolButtonDot} />}
              </Pressable>
            )}
            <Pressable
              style={styles.toolButton}
              onPress={() => setIsFilterOpen(true)}
            >
              <Filter size={15} color={colors.textPrimary} strokeWidth={2.2} />
              <Text style={styles.toolButtonText}>Genre</Text>
              {hasActiveFilter && <View style={styles.toolButtonDot} />}
            </Pressable>
          </View>
        ) : (
          <View style={styles.toolbar}>
            <Text style={styles.toolbarCaption}>{unlockedCount} tracked</Text>
            <Pressable
              style={styles.toolButton}
              onPress={() => setIsAllCollectionsOpen(true)}
            >
              <ListPlus
                size={16}
                color={colors.textPrimary}
                strokeWidth={2.2}
              />
              <Text style={styles.toolButtonText}>See All</Text>
            </Pressable>
          </View>
        )}

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
          <>
            {canPick && !query && !hasActiveFilter && (
              <Pressable style={styles.pickCard} onPress={handlePickFromList}>
                <View style={styles.pickIcon}>
                  <Shuffle size={18} color={colors.accentContrast} />
                </View>
                <View style={styles.pickText}>
                  <Text style={styles.pickTitle}>Can&apos;t choose?</Text>
                  <Text style={styles.pickSubtitle}>
                    Swipe through {Math.min(bucketListMovies.length, PICK_MAX)}{" "}
                    from your watchlist
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.accentContrast} />
              </Pressable>
            )}
            {visibleBucketListMovies.length === 0 ? (
              <EmptyState
                icon={<Bookmark size={40} color={colors.textMuted} />}
                title={
                  query || hasActiveFilter
                    ? "No matches"
                    : "Your board is empty."
                }
                subtitle={
                  query || hasActiveFilter
                    ? "Nothing on your watchlist matches that."
                    : "That's either impressive or a problem."
                }
                actionLabel={
                  query || hasActiveFilter ? undefined : "Find Something"
                }
                onAction={
                  query || hasActiveFilter
                    ? undefined
                    : () => navigation.navigate("Discover")
                }
              />
            ) : (
              <MovieGrid
                movies={visibleBucketListMovies}
                onPressMovie={(movie) => openDetails(movie.id)}
              />
            )}
          </>
        ) : (
          <>
            {watchedMovies.length > 0 && (
              <View style={styles.statsStrip}>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>
                    {Math.round(totalMinutes / 60)}h
                  </Text>
                  <Text style={styles.statLabel}>watched</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>
                    {averageRating != null
                      ? `★ ${averageRating.toFixed(1)}`
                      : "—"}
                  </Text>
                  <Text style={styles.statLabel}>avg rating</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{watchedThisMonth}</Text>
                  <Text style={styles.statLabel}>this month</Text>
                </View>
              </View>
            )}
            {visibleWatchedMovies.length === 0 ? (
              <EmptyState
                icon={<CheckCircle size={40} color={colors.textMuted} />}
                title={
                  query || hasActiveFilter
                    ? "No matches"
                    : "Nothing watched yet."
                }
                subtitle={
                  query || hasActiveFilter
                    ? "Nothing you've watched matches that."
                    : "Let's change that."
                }
              />
            ) : sortBy === "recent" ? (
              groupByMonth(visibleWatchedMovies).map((group) => (
                <View key={group.key} style={styles.monthGroup}>
                  <Text style={styles.monthHeader}>
                    {group.label.toUpperCase()} · {group.items.length}
                  </Text>
                  <View
                    style={[
                      styles.grid,
                      { paddingHorizontal: horizontalPadding, gap },
                    ]}
                  >
                    {group.items.map(({ movie, rating, watchCount }) => (
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
                              <Text style={styles.rewatchBadgeText}>
                                ×{watchCount}
                              </Text>
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
                </View>
              ))
            ) : (
              <View
                style={[
                  styles.grid,
                  styles.monthGroup,
                  { paddingHorizontal: horizontalPadding, gap },
                ]}
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
                          <Text style={styles.rewatchBadgeText}>
                            ×{watchCount}
                          </Text>
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
          </>
        )}

        <View style={{ height: insets.bottom + TAB_BAR_CLEARANCE }} />
      </Animated.ScrollView>
      <ScreenBottomFade />
      <HeaderBar
        title="Library"
        scrollY={scrollY}
        right={
          tab !== "collections" && (
            <HeaderIconButton
              onPress={() =>
                tab === "bucketlist"
                  ? setIsAddOpen(true)
                  : setIsAddWatchedOpen(true)
              }
            >
              <Plus size={18} color={colors.textPrimary} strokeWidth={2.2} />
            </HeaderIconButton>
          )
        }
      />
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
        size="auto"
        title="Filter by Genre"
        subtitle="Show only movies in any of these genres"
        footer={
          <View style={styles.sheetFooter}>
            <PrimaryButton
              label="Clear"
              variant="secondary"
              disabled={!hasActiveFilter}
              onPress={() => setSelectedGenres([])}
              style={styles.sheetFooterSecondary}
              contentStyle={styles.sheetFooterButton}
            />
            <PrimaryButton
              label={
                hasActiveFilter
                  ? `Show results · ${selectedGenres.length}`
                  : "Done"
              }
              onPress={() => setIsFilterOpen(false)}
              style={styles.sheetFooterPrimary}
              contentStyle={styles.sheetFooterButton}
            />
          </View>
        }
      >
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
      </BottomSheet>

      <Popover
        visible={isSortOpen}
        anchor={sortAnchor}
        onClose={() => setIsSortOpen(false)}
      >
        {SORT_OPTIONS.map((option) => {
          const selected = sortBy === option.key;
          return (
            <Pressable
              key={option.key}
              style={({ pressed }) => [
                styles.sortRow,
                pressed && styles.sortRowPressed,
              ]}
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
              {selected && <Check size={16} color={colors.accentLight} />}
            </Pressable>
          );
        })}
      </Popover>

      <BottomSheet
        visible={isAllCollectionsOpen}
        onClose={() => setIsAllCollectionsOpen(false)}
        title="All Collections"
        subtitle="Tap one to start or stop tracking it"
      >
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
    // A horizontal ScrollView has flexGrow: 1 by default, and this screen's
    // scroll content is flexGrow: 1 too (for EmptyState centering) — so on
    // a short tab the chip row grew to soak up the spare height and the
    // chips stretched into tall pills. Pin it to its content height.
    tabChipsScroll: {
      flexGrow: 0,
    },
    tabChips: {
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: spacing.sm,
    },
    tabChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingLeft: spacing.md,
      paddingRight: 6,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
    },
    tabChipActive: {
      backgroundColor: colors.accent,
    },
    tabChipText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    tabChipTextActive: {
      color: colors.accentContrast,
    },
    tabChipCount: {
      minWidth: 24,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
      alignItems: "center",
      backgroundColor: colors.surfaceSoft,
    },
    tabChipCountActive: {
      backgroundColor: "rgba(255, 255, 255, 0.22)",
    },
    tabChipCountText: {
      ...typography.label,
      fontSize: 11,
      color: colors.textSecondary,
    },
    tabChipCountTextActive: {
      color: colors.accentContrast,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    toolbarCaption: {
      ...typography.caption,
      flex: 1,
      color: colors.textSecondary,
    },
    searchField: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      height: 40,
      paddingHorizontal: spacing.sm + 2,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    searchInput: {
      ...typography.body,
      flex: 1,
      paddingVertical: 0,
      color: colors.textPrimary,
    },
    toolButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      height: 40,
      paddingHorizontal: spacing.sm + 2,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    toolButtonText: {
      ...typography.label,
      color: colors.textPrimary,
    },
    toolButtonDot: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.accentLight,
    },
    pickCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    pickIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    pickText: {
      flex: 1,
    },
    pickTitle: {
      ...typography.subtitle,
      color: colors.accentContrast,
    },
    pickSubtitle: {
      ...typography.caption,
      color: "rgba(255, 255, 255, 0.85)",
      marginTop: 1,
    },
    statsStrip: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    statCell: {
      flex: 1,
      alignItems: "center",
    },
    statValue: {
      ...typography.title,
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      alignSelf: "stretch",
      backgroundColor: colors.border,
    },
    monthGroup: {
      marginTop: spacing.md,
    },
    monthHeader: {
      ...typography.label,
      color: colors.textSecondary,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
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
    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      paddingBottom: spacing.md,
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
    sortRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    sortRowPressed: {
      backgroundColor: colors.surfaceSoft,
    },
    sheetFooter: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    sheetFooterSecondary: {
      flex: 1,
    },
    sheetFooterPrimary: {
      flex: 2,
    },
    sheetFooterButton: {
      paddingVertical: 10,
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

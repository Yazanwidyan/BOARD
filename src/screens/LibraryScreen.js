import {
  Bookmark,
  Check,
  CheckCircle,
  ChevronDown,
  Circle,
  Disc3,
  Layers,
  Plus,
  Search,
  X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../components/AppText";
import Animated from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AddToBucketListSheet } from "../components/AddToBucketListSheet";
import { AddToWatchedSheet } from "../components/AddToWatchedSheet";
import { BottomSheet } from "../components/BottomSheet";
import { CollectionsShelf } from "../components/CollectionsShelf";
import { EmptyState } from "../components/EmptyState";
import { MoviePoster } from "../components/MoviePoster";
import { Popover } from "../components/Popover";
import { MosaicSections, PosterMosaic } from "../components/PosterMosaic";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import {
  DockHeader,
  HEADER_BAR_HEIGHT,
  HeaderIconButton,
  useDockHeader,
} from "../components/ScreenHeader";
import { getMovieById } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  getCollectionProgress,
  getCollectionSections,
  getUnlockedCollectionSections,
} from "../utils/collections";
import { matchesGenres } from "../utils/movieFilters";
import { shuffle } from "../utils/shuffle";
import { TIERS, getTierInfo, tierRank } from "../utils/tiers";
import { t } from "../i18n";
import { FirstVisitTip } from "../components/FirstVisitTip";

const PICK_MAX = 10;
const PICK_MIN = 2;
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

// "Recently watched" view: one shelf section per month, newest first
// (items arrive newest-first); undated entries last, under "Earlier".
const groupByMonth = (items) => {
  const groups = [];
  items.forEach((item) => {
    const date = item.timestamp ? new Date(item.timestamp) : null;
    const key = date ? `${date.getFullYear()}-${date.getMonth()}` : "earlier";
    let group = groups.find((existing) => existing.key === key);
    if (!group) {
      group = {
        key,
        label: date
          ? `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
          : t("Earlier"),
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
  });
  return [
    ...groups.filter((group) => group.key !== "earlier"),
    ...groups.filter((group) => group.key === "earlier"),
  ];
};

// "Best tier" view: one section per tier (S first), then the movies you
// haven't tiered yet. Items arrive already sorted by tier.
const UNTIERED_RANK = TIERS.length;
const groupByTier = (items) => {
  const groups = [];
  items.forEach((item) => {
    const key = TIERS[item.tierRank]?.key ?? "untiered";
    let group = groups.find((existing) => existing.key === key);
    if (!group) {
      const info = getTierInfo(key);
      group = {
        key,
        label: info ? `${info.key} · ${info.meaning}` : t("Not tiered yet"),
        color: info?.color,
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
  });
  return groups;
};

const matchesQuery = (movie, query) =>
  !query || movie.title.toLowerCase().includes(query.trim().toLowerCase());

const SORT_OPTIONS = [
  { key: "recent", label: "Recently Watched" },
  { key: "rating", label: "Best tier" },
  { key: "watchCount", label: "Most Watched" },
];

const CollectionCollage = ({ movies, styles }) => (
  <View style={styles.collectionCollage}>
    {movies.slice(0, 3).map((movie, index) => (
      <MoviePoster
        key={movie.id}
        uri={movie.poster}
        radius={0}
        style={[
          styles.collectionCollagePoster,
          { left: index * 16, zIndex: 3 - index },
        ]}
      />
    ))}
  </View>
);

// Rows in the "See All Collections" browser — poster collage, title and
// progress, plus a trailing toggle. A collection with real progress
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
  // Watched tab narrowed to the movies that don't have a tier yet.
  const [untieredOnly, setUntieredOnly] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortAnchor, setSortAnchor] = useState({ top: 0, right: spacing.md });
  const sortButtonRef = useRef(null);
  const header = useDockHeader();
  const [isAllCollectionsOpen, setIsAllCollectionsOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Search lives behind the header's search icon; open while there's text.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // The header title is the section switcher; this opens its menu.
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState(false);
  // Measured height of the fixed chip bar under the header (Watchlist /
  // Watched only), added to the content's top inset. Starts at a close
  // estimate for the first frame.
  const [toolBarHeight, setToolBarHeight] = useState(52);

  // The tab screen stays mounted between visits, so a fresh `initialTab`
  // param (e.g. tapping a stat a second time) needs to actually switch the
  // view, not just seed the very first render.
  useEffect(() => {
    if (route?.params?.initialTab) {
      setTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  // Profile's taste card links here to show the untiered watched movies.
  useEffect(() => {
    if (route?.params?.showUntiered) {
      setTab("watched");
      setUntieredOnly(true);
      navigation.setParams({ showUntiered: undefined });
    }
  }, [route?.params?.showUntiered, navigation]);

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
            tierRank: tierRank(entry),
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
  const untieredCount = watchedMovies.filter(
    (item) => item.tierRank === UNTIERED_RANK,
  ).length;
  const visibleWatchedMovies = watchedMovies
    .filter(
      ({ movie, tierRank: rank }) =>
        matchesGenres(movie, selectedGenres) &&
        matchesQuery(movie, query) &&
        (!untieredOnly || rank === UNTIERED_RANK),
    )
    .sort((a, b) => {
      if (sortBy === "rating") {
        return (
          a.tierRank - b.tierRank || (b.timestamp ?? 0) - (a.timestamp ?? 0)
        );
      }
      if (sortBy === "watchCount") return b.watchCount - a.watchCount;
      return (b.timestamp ?? 0) - (a.timestamp ?? 0);
    });

  const canPick = bucketListMovies.length >= PICK_MIN;
  const hasActiveFilter = selectedGenres.length > 0;

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const unlockedSections = getUnlockedCollectionSections(
    watchedIds,
    unlockedCollectionIds,
  );
  const allCollectionSections = getCollectionSections();
  const unlockedCount = unlockedSections.reduce(
    (sum, section) => sum + section.collections.length,
    0,
  );
  const tabOptions = [
    {
      key: "bucketlist",
      Icon: Bookmark,
      label: "Watchlist",
      count: bucketListMovies.length,
      subtitle: t("{count} saved", { count: bucketListMovies.length }),
    },
    {
      key: "collections",
      Icon: Layers,
      label: "Collections",
      count: unlockedCount,
      subtitle: t("{count} tracked", { count: unlockedCount }),
    },
    {
      key: "watched",
      Icon: Disc3,
      label: "Watched",
      count: watchedMovies.length,
      subtitle: `${watchedMovies.length} ${watchedMovies.length === 1 ? "movie" : "movies"}`,
    },
  ];
  const currentTab =
    tabOptions.find((option) => option.key === tab) ?? tabOptions[0];

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

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop:
              // Collections' filter row scrolls with the page, so it sits
              // flush under the header like the other tabs' fixed bar
              // (the inset's usual gap is dropped).
              tab === "collections"
                ? header.contentInset - spacing.md
                : header.contentInset + toolBarHeight,
          },
        ]}
      >
        {tab === "collections" ? (
          <CollectionsShelf
            watched={watched}
            unlockedCollectionIds={unlockedCollectionIds}
            onOpen={openCollection}
            onToggleTrack={toggleUnlockedCollection}
            onSeeAll={() => setIsAllCollectionsOpen(true)}
            onOpenMovie={openDetails}
          />
        ) : tab === "bucketlist" ? (
          <>
            {visibleBucketListMovies.length === 0 ? (
              <EmptyState
                art={query || hasActiveFilter ? "noMatches" : "emptyShelf"}
                title={
                  query || hasActiveFilter
                    ? t("No matches")
                    : t("Your watchlist is empty")
                }
                subtitle={
                  query || hasActiveFilter
                    ? t("Nothing on your watchlist matches that.")
                    : t("Save movies you want to see and they'll show up here.")
                }
                actionLabel={
                  query || hasActiveFilter ? undefined : t("Browse movies")
                }
                onAction={
                  query || hasActiveFilter
                    ? undefined
                    : () => navigation.navigate("Discover")
                }
              />
            ) : (
              <PosterMosaic
                items={visibleBucketListMovies.map((movie) => ({ movie }))}
                onPressMovie={(movie) => openDetails(movie.id)}
              />
            )}
          </>
        ) : (
          <>
            {visibleWatchedMovies.length === 0 ? (
              <EmptyState
                art={
                  untieredOnly && !query && !hasActiveFilter
                    ? "allTiered"
                    : query || hasActiveFilter
                      ? "noMatches"
                      : "noDiscs"
                }
                title={
                  untieredOnly && !query && !hasActiveFilter
                    ? t("Everything's tiered")
                    : query || hasActiveFilter
                      ? t("No matches")
                      : t("Nothing watched yet")
                }
                subtitle={
                  untieredOnly && !query && !hasActiveFilter
                    ? t("Your whole collection is ranked.")
                    : query || hasActiveFilter
                      ? t("Nothing you've watched matches that.")
                      : t("Mark a movie as watched and it shows up here.")
                }
                actionLabel={
                  untieredOnly || query || hasActiveFilter
                    ? undefined
                    : t("Find something to watch")
                }
                onAction={
                  untieredOnly || query || hasActiveFilter
                    ? undefined
                    : () => navigation.navigate("Discover")
                }
              />
            ) : (
              // Watched as a poster mosaic — sectioned by month, by tier, or
              // one run for "Most watched".
              <MosaicSections
                groups={
                  sortBy === "recent"
                    ? groupByMonth(visibleWatchedMovies)
                    : sortBy === "rating"
                      ? groupByTier(visibleWatchedMovies)
                      : [{ key: "all", items: visibleWatchedMovies }]
                }
                onPressMovie={(movie) => openDetails(movie.id)}
              />
            )}
          </>
        )}

        <View style={{ height: insets.bottom + TAB_BAR_CLEARANCE }} />
      </Animated.ScrollView>
      <ScreenBottomFade />
      <FirstVisitTip id="library" />
      {tab !== "collections" && (
        <View
          style={[styles.toolBar, { top: insets.top + HEADER_BAR_HEIGHT }]}
          onLayout={(event) =>
            setToolBarHeight(event.nativeEvent.layout.height)
          }
        >
          {(isSearchOpen || query.length > 0) && (
            <View style={styles.searchField}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={
                  tab === "bucketlist"
                    ? t("Search your watchlist")
                    : t("Search what you've watched")
                }
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                autoFocus={query.length === 0}
              />
              <Pressable
                onPress={() => {
                  setQuery("");
                  setIsSearchOpen(false);
                }}
                hitSlop={8}
                accessibilityLabel={t("Close search")}
              >
                <X size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          )}

          {/* One chip row: what's sorted / filtered, and the shortcuts. */}
          {
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.toolRow}
              contentContainerStyle={styles.toolRowContent}
              keyboardShouldPersistTaps="handled"
            >
              {tab === "watched" && (
                <Pressable
                  ref={sortButtonRef}
                  style={styles.toolChip}
                  onPress={() => {
                    sortButtonRef.current?.measureInWindow(
                      (x, y, chipWidth, chipHeight) => {
                        setSortAnchor({
                          top: y + chipHeight + spacing.xs,
                          // The menu (220 wide) opens left-aligned with
                          // the chip, kept on screen.
                          right: Math.max(spacing.md, width - x - 220),
                        });
                        setIsSortOpen(true);
                      },
                    );
                  }}
                >
                  <Text style={styles.toolChipText}>
                    {
                      SORT_OPTIONS.find((option) => option.key === sortBy)
                        ?.label
                    }
                  </Text>
                  <ChevronDown size={14} color={colors.textSecondary} />
                </Pressable>
              )}
              <Pressable
                style={[
                  styles.toolChip,
                  hasActiveFilter && styles.toolChipActive,
                ]}
                onPress={() => setIsFilterOpen(true)}
              >
                <Text
                  style={[
                    styles.toolChipText,
                    hasActiveFilter && styles.toolChipTextActive,
                  ]}
                >
                  {selectedGenres.length === 0
                    ? t("All genres")
                    : selectedGenres.length === 1
                      ? selectedGenres[0]
                      : `${selectedGenres[0]} +${selectedGenres.length - 1}`}
                </Text>
                <ChevronDown
                  size={14}
                  color={
                    hasActiveFilter ? colors.selectedText : colors.textSecondary
                  }
                />
              </Pressable>
              {tab === "bucketlist" && canPick && (
                <Pressable style={styles.toolChip} onPress={handlePickFromList}>
                  <Text style={styles.toolChipText}>{t("Pick for me")}</Text>
                </Pressable>
              )}
              {tab === "watched" && (untieredCount > 0 || untieredOnly) && (
                <Pressable
                  style={[
                    styles.toolChip,
                    untieredOnly && styles.toolChipActive,
                  ]}
                  onPress={() => setUntieredOnly((value) => !value)}
                  accessibilityState={{ selected: untieredOnly }}
                >
                  <View
                    style={[
                      styles.untieredDot,
                      untieredOnly && styles.untieredDotActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.toolChipText,
                      untieredOnly && styles.toolChipTextActive,
                    ]}
                  >
                    {untieredCount} untiered
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          }
        </View>
      )}
      <DockHeader
        {...header.props}
        title={currentTab.label}
        subtitle={currentTab.subtitle}
        onPressTitle={() => setIsSectionMenuOpen(true)}
        right={
          tab !== "collections" && (
            <>
              <HeaderIconButton
                onPress={() => {
                  if (isSearchOpen || query.length > 0) {
                    setQuery("");
                    setIsSearchOpen(false);
                  } else {
                    setIsSearchOpen(true);
                  }
                }}
              >
                <Search
                  size={22}
                  color={colors.textPrimary}
                  strokeWidth={1.75}
                />
              </HeaderIconButton>
              <HeaderIconButton
                onPress={() =>
                  tab === "bucketlist"
                    ? setIsAddOpen(true)
                    : setIsAddWatchedOpen(true)
                }
              >
                <Plus size={22} color={colors.textPrimary} strokeWidth={1.75} />
              </HeaderIconButton>
            </>
          )
        }
      />
      <Popover
        visible={isSectionMenuOpen}
        anchor={{
          top: insets.top + HEADER_BAR_HEIGHT + spacing.xs,
          right: width - spacing.md - 220,
        }}
        onClose={() => setIsSectionMenuOpen(false)}
      >
        {tabOptions.map(({ key, label, Icon, count }) => {
          const selected = tab === key;
          return (
            <Pressable
              key={key}
              style={({ pressed }) => [
                styles.sortRow,
                pressed && styles.sortRowPressed,
              ]}
              onPress={() => {
                setTab(key);
                setIsSectionMenuOpen(false);
              }}
              accessibilityState={{ selected }}
            >
              <View style={styles.sectionMenuLabel}>
                <Icon
                  size={16}
                  color={selected ? colors.textPrimary : colors.textSecondary}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.sortRowText,
                    selected && styles.sortRowTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
              <Text style={styles.sectionMenuCount}>{count}</Text>
              {selected && <Check size={16} color={colors.textPrimary} />}
            </Pressable>
          );
        })}
      </Popover>

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
        title={t("Filter by Genre")}
        subtitle={t("Show only movies in any of these genres")}
        footer={
          <View style={styles.sheetFooter}>
            <PrimaryButton
              label={t("Clear")}
              variant="secondary"
              disabled={!hasActiveFilter}
              onPress={() => setSelectedGenres([])}
              style={styles.sheetFooterSecondary}
              contentStyle={styles.sheetFooterButton}
            />
            <PrimaryButton
              label={
                hasActiveFilter
                  ? t("Show results · {selectedGenresCount}", {
                      selectedGenresCount: selectedGenres.length,
                    })
                  : t("Done")
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
              {selected && <Check size={16} color={colors.textPrimary} />}
            </Pressable>
          );
        })}
      </Popover>

      <BottomSheet
        visible={isAllCollectionsOpen}
        onClose={() => setIsAllCollectionsOpen(false)}
        title={t("All Collections")}
        subtitle={t("Tap one to start or stop tracking it")}
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
    // Fixed chip bar under the header — card background like the header,
    // one hairline under it.
    toolBar: {
      position: "absolute",
      start: 0,
      end: 0,
      zIndex: 99,
      elevation: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      gap: spacing.sm,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    sectionMenuLabel: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    sectionMenuCount: {
      ...typography.caption,
      color: colors.textMuted,
      marginEnd: spacing.xs,
    },
    toolRow: {
      flexGrow: 0,
      marginHorizontal: -spacing.md,
    },
    toolRowContent: {
      gap: 6,
      paddingHorizontal: spacing.md,
    },
    // Square filled boxes, like Settings' — the active one fills white.
    toolChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm,
      backgroundColor: colors.card,
    },
    toolChipActive: {
      backgroundColor: colors.selected,
    },
    toolChipText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    toolChipTextActive: {
      color: colors.selectedText,
    },
    untieredDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.rating,
    },
    untieredDotActive: {
      backgroundColor: colors.selectedText,
    },
    searchField: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      height: 44,
      marginHorizontal: -spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    searchInput: {
      ...typography.body,
      flex: 1,
      paddingVertical: 0,
      color: colors.textPrimary,
    },
    section: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    sectionTitle: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    collectionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.card,
      padding: spacing.sm,
      marginBottom: 2,
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
      height: 3,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
    },
    collectionBarFill: {
      height: "100%",
      backgroundColor: colors.textPrimary,
    },
    collectionProgressText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
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
      // A step lighter than the sheet, so the boxes read on it.
      backgroundColor: colors.cardElevatedLight,
    },
    chipSelected: {
      backgroundColor: colors.selected,
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
      color: colors.textPrimary,
    },
  });

export default LibraryScreen;

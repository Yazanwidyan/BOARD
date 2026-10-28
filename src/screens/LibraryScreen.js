import {
  Check,
  CheckCircle,
  ChevronDown,
  Circle,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
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
import Animated from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AddToBucketListSheet } from "../components/AddToBucketListSheet";
import { AddToWatchedSheet } from "../components/AddToWatchedSheet";
import { Text } from "../components/AppText";
import { TonightIcon } from "../components/icons/TonightIcon";
import { BoardCover } from "../components/BoardCover";
import { BoardNameSheet } from "../components/BoardNameSheet";
import { BottomSheet } from "../components/BottomSheet";
import { CollectionsShelf } from "../components/CollectionsShelf";
import { EmptyState } from "../components/EmptyState";
import { FirstVisitTip } from "../components/FirstVisitTip";
import { MoviePoster } from "../components/MoviePoster";
import { Popover } from "../components/Popover";
import { MosaicSections } from "../components/PosterMosaic";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import {
  DockHeader,
  HEADER_BAR_HEIGHT,
  HeaderIconButton,
  useDockHeader,
} from "../components/ScreenHeader";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useBoardStore } from "../store/boardStore";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { TAB_BAR_CLEARANCE, shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  giveWatchedFeedback,
  toggleBucketListWithFeedback,
} from "../utils/achievementFeedback";
import {
  getCollectionProgress,
  getCollectionSections,
  getUnlockedCollectionSections,
} from "../utils/collections";
import { formatRuntime, matchesGenres } from "../utils/movieFilters";
import { movieMatches } from "../utils/movieSearch";
import { shuffle } from "../utils/shuffle";
import { TIERS, getTierInfo, tierRank } from "../utils/tiers";

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

// One film on the watchlist: its poster, title, and year · genre ·
// runtime, with ••• for what you can do with it.
const WatchlistRow = ({ movie, onPress, onMore, styles, colors }) => (
  <Pressable
    style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={movie.title}
  >
    <MoviePoster uri={movie.poster} style={styles.listPoster} />
    <View style={styles.listInfo}>
      <Text style={styles.listTitle} numberOfLines={1}>
        {movie.title}
      </Text>
      <Text style={styles.listMeta} numberOfLines={1}>
        {[
          movie.year,
          movie.genres?.[0],
          movie.runtime ? formatRuntime(movie.runtime) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </View>
    <Pressable
      onPress={onMore}
      hitSlop={10}
      accessibilityLabel={t("More")}
      style={styles.listMore}
    >
      <MoreHorizontal size={20} color={colors.textSecondary} />
    </Pressable>
  </Pressable>
);

// Title, director or cast — see utils/movieSearch.
const matchesQuery = (movie, query) => movieMatches(movie, query ?? "");

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
          {t(collection.title)}
        </Text>
        <View style={styles.collectionBarTrack}>
          <View
            style={[styles.collectionBarFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={styles.collectionProgressText}>
          {t("{seen} of {moviesCount} watched", { seen: watchedCount, moviesCount: total })}
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

// Boards view: your own lists as a two-up grid of square covers, with a
// "New list" tile always last.
const BOARD_COLUMNS = 2;
// Room between board covers.
const BOARD_GAP = 6;

const BoardsGrid = ({ boards, width, onOpen, onCreate, styles, colors }) => {
  const size = Math.floor(
    (width - spacing.md * 2 - BOARD_GAP * (BOARD_COLUMNS - 1)) / BOARD_COLUMNS,
  );
  return (
    <View style={styles.boardGrid}>
      {boards.map((board) => {
        const movies = board.movieIds.map(getMovieById).filter(Boolean);
        return (
          <Pressable
            key={board.id}
            style={({ pressed }) => [
              { width: size },
              pressed && styles.pressed,
            ]}
            onPress={() => onOpen(board.id)}
          >
            <BoardCover movies={movies} size={size} />
            <View style={styles.boardInfo}>
              <Text style={styles.boardName} numberOfLines={1}>
                {board.name}
              </Text>
              <Text style={styles.boardCount}>
                {t("{count} movies", { count: movies.length })}
              </Text>
            </View>
          </Pressable>
        );
      })}
      <Pressable
        style={({ pressed }) => [{ width: size }, pressed && styles.pressed]}
        onPress={onCreate}
        accessibilityRole="button"
      >
        <View style={[styles.newBoardTile, { width: size, height: size }]}>
          <Plus size={32} color={colors.textSecondary} strokeWidth={1.5} />
        </View>
        <View style={styles.boardInfo}>
          <Text style={styles.boardName}>{t("New list")}</Text>
          <Text style={styles.boardCount}>
            {boards.length === 0
              ? t("Rainy day, date night…")
              : t("Another mood")}
          </Text>
        </View>
      </Pressable>
    </View>
  );
};

export const LibraryScreen = ({ navigation, route }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState(route?.params?.initialTab ?? "bucketlist");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddWatchedOpen, setIsAddWatchedOpen] = useState(false);
  const [isNewBoardOpen, setIsNewBoardOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [sortBy, setSortBy] = useState("recent");
  // Watched tab narrowed to the movies that don't have a tier yet.
  const [untieredOnly, setUntieredOnly] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortAnchor, setSortAnchor] = useState({ top: 0, right: spacing.md });
  const sortButtonRef = useRef(null);
  // The header slides away as you scroll down; the chip bar under it
  // follows, so it ends up pinned just under the status bar.
  const header = useDockHeader({ hideOnScroll: true });
  const [isAllCollectionsOpen, setIsAllCollectionsOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Search lives behind the header's search icon; open while there's text.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // The header title is the section switcher; this opens its menu.
  // Measured height of the fixed chip bar under the header (Watchlist /
  // Watched only), added to the content's top inset. Starts at a close
  // estimate for the first frame.
  const [toolBarHeight, setToolBarHeight] = useState(52);

  // The tab screen stays mounted between visits, so a fresh `initialTab`
  // param (e.g. tapping a stat a second time) needs to actually switch the
  // view, not just seed the very first render. `openedAt` (a timestamp)
  // marks a repeat of the same tab as new.
  useEffect(() => {
    if (route?.params?.initialTab) {
      setTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab, route?.params?.openedAt]);

  // A new section starts with the header showing — a short one might not
  // scroll at all, and would leave it stuck out of sight.
  useEffect(() => {
    header.offset.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const pickedMovieId = useMovieStore((state) => state.pickedMovie);
  // The watchlist film whose ••• is open.
  const [rowMenuMovie, setRowMenuMovie] = useState(null);
  const unlockedCollectionIds = useMovieStore(
    (state) => state.unlockedCollections,
  );
  const toggleUnlockedCollection = useMovieStore(
    (state) => state.toggleUnlockedCollection,
  );
  const startSession = useSessionStore((state) => state.startSession);
  const boards = useBoardStore((state) => state.boards);
  const createBoard = useBoardStore((state) => state.createBoard);

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
      label: "Watchlist",
      count: bucketListMovies.length,
    },
    {
      key: "boards",
      label: "Lists",
      count: boards.length,
    },
    {
      key: "collections",
      label: "Collections",
      count: unlockedCount,
    },
    {
      key: "watched",
      label: "Watched",
      count: watchedMovies.length,
    },
  ];
  const currentTab =
    tabOptions.find((option) => option.key === tab) ?? tabOptions[0];

  // Every section has the bar under the header (its section chips); only
  // Watchlist and Watched add the search and the count / sort / filter row.
  const hasToolBar = true;
  const hasTools = tab === "bucketlist" || tab === "watched";
  // How many, as the first chip in the filter row — what's showing out of
  // all ("8 of 48") while a filter or search narrows the list.
  const shownCount =
    tab === "watched"
      ? visibleWatchedMovies.length
      : visibleBucketListMovies.length;
  const countLabel =
    shownCount === currentTab.count
      ? t("{count} films", { count: currentTab.count })
      : t("{shown} of {count}", { shown: shownCount, count: currentTab.count });

  const openBoard = (boardId) =>
    navigation.navigate("BoardDetails", { boardId });

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
                ? header.contentInset - spacing.md + toolBarHeight
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
        ) : tab === "boards" ? (
          <BoardsGrid
            boards={boards}
            width={width}
            onOpen={openBoard}
            onCreate={() => setIsNewBoardOpen(true)}
            styles={styles}
            colors={colors}
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
              <View style={styles.list}>
                {visibleBucketListMovies.map((movie) => (
                  <WatchlistRow
                    key={movie.id}
                    movie={movie}
                    onPress={() => openDetails(movie.id)}
                    onMore={() => setRowMenuMovie(movie)}
                    styles={styles}
                    colors={colors}
                  />
                ))}
              </View>
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
      {hasToolBar && (
        <Animated.View
          style={[
            styles.toolBar,
            { top: insets.top + HEADER_BAR_HEIGHT },
            header.followStyle,
          ]}
          onLayout={(event) =>
            setToolBarHeight(event.nativeEvent.layout.height)
          }
        >
          {/* Watchlist / Lists / Collections / Watched */}
          <View style={styles.sectionTrack} accessibilityRole="tablist">
            {tabOptions.map((option) => {
              const selected = option.key === tab;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.sectionChip, selected && styles.sectionChipOn]}
                  onPress={() => setTab(option.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.sectionChipText,
                      selected && styles.sectionChipTextOn,
                    ]}
                    numberOfLines={1}
                  >
                    {t(option.label)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {hasTools && (isSearchOpen || query.length > 0) && (
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

          {/* One row: how many, what's sorted / filtered, and the
              shortcuts. */}
          {hasTools && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.toolRow}
              contentContainerStyle={styles.toolRowContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.countChip}>
                <Text style={styles.countChipText}>{countLabel}</Text>
              </View>
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
          )}
        </Animated.View>
      )}
      <DockHeader
        {...header.props}
        title={t("Library")}
        // Search on the left (Watchlist and Watched); ＋ on the right.
        left={
          hasTools && (
            <HeaderIconButton
              onPress={() => {
                if (isSearchOpen || query.length > 0) {
                  setQuery("");
                  setIsSearchOpen(false);
                } else {
                  setIsSearchOpen(true);
                }
              }}
              accessibilityLabel={t("Search")}
            >
              <Search size={22} color={colors.textPrimary} strokeWidth={1.75} />
            </HeaderIconButton>
          )
        }
        right={
          tab === "boards" ? (
            <HeaderIconButton
              onPress={() => setIsNewBoardOpen(true)}
              accessibilityLabel={t("New list")}
            >
              <Plus size={22} color={colors.textPrimary} strokeWidth={1.75} />
            </HeaderIconButton>
          ) : (
            hasTools && (
              <HeaderIconButton
                onPress={() =>
                  tab === "bucketlist"
                    ? setIsAddOpen(true)
                    : setIsAddWatchedOpen(true)
                }
                accessibilityLabel={t("Add")}
              >
                <Plus size={22} color={colors.textPrimary} strokeWidth={1.75} />
              </HeaderIconButton>
            )
          )
        }
      />
      {/* A watchlist film's •••: what you can do with it. */}
      <BottomSheet
        visible={!!rowMenuMovie}
        onClose={() => setRowMenuMovie(null)}
        title={rowMenuMovie?.title}
        size="auto"
      >
        <View style={styles.rowMenu}>
          {[
            {
              key: "watched",
              Icon: CheckCircle,
              label: t("Mark as watched"),
              run: (movie) => {
                const { watched: watchedBefore, bucketList: bucketListBefore } =
                  useMovieStore.getState();
                toggleWatched(movie.id);
                giveWatchedFeedback(movie.id, watchedBefore, bucketListBefore);
              },
            },
            {
              key: "pick",
              Icon: TonightIcon,
              label:
                rowMenuMovie && pickedMovieId === rowMenuMovie.id
                  ? t("Clear tonight's pick")
                  : t("Pick for tonight"),
              run: (movie) => togglePickedMovie(movie.id),
            },
            {
              key: "remove",
              Icon: Trash2,
              label: t("Remove from watchlist"),
              danger: true,
              run: (movie) => toggleBucketListWithFeedback(movie.id),
            },
          ].map(({ key, Icon, label, run, danger }) => (
            <Pressable
              key={key}
              style={({ pressed }) => [
                styles.rowMenuItem,
                pressed && styles.listRowPressed,
              ]}
              onPress={() => {
                const movie = rowMenuMovie;
                setRowMenuMovie(null);
                if (movie) run(movie);
              }}
            >
              <Icon
                size={20}
                color={danger ? colors.danger : colors.textPrimary}
                strokeWidth={1.9}
              />
              <Text
                style={[styles.rowMenuText, danger && { color: colors.danger }]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <AddToBucketListSheet
        visible={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
      <AddToWatchedSheet
        visible={isAddWatchedOpen}
        onClose={() => setIsAddWatchedOpen(false)}
      />
      <BoardNameSheet
        visible={isNewBoardOpen}
        onClose={() => setIsNewBoardOpen(false)}
        onSave={(name) => {
          const boardId = createBoard(name);
          setIsNewBoardOpen(false);
          openBoard(boardId);
        }}
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
    boardGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: BOARD_GAP,
      rowGap: spacing.md,
      paddingHorizontal: spacing.md,
    },
    boardInfo: {
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      gap: 2,
    },
    boardName: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    boardCount: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    pressed: {
      opacity: 0.7,
    },
    newBoardTile: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: shape.control,
    },
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
    // The four sections: a dark track, the open one a white pill.
    sectionTrack: {
      flexDirection: "row",
      gap: 2,
      padding: 3,
      backgroundColor: colors.segmentTrack,
      borderRadius: shape.chip,
    },
    sectionChip: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6,
      borderRadius: shape.chip,
    },
    sectionChipOn: {
      backgroundColor: colors.segmentOn,
    },
    sectionChipText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.segmentText,
    },
    sectionChipTextOn: {
      color: colors.segmentOnText,
    },
    // Watchlist rows.
    list: {
      paddingTop: spacing.xs,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    listRowPressed: {
      opacity: 0.7,
    },
    listPoster: {
      width: 48,
      aspectRatio: 2 / 3,
    },
    listInfo: {
      flex: 1,
      gap: 3,
    },
    listTitle: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    listMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    listMore: {
      padding: spacing.xs,
    },
    rowMenu: {
      paddingBottom: spacing.lg,
    },
    rowMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm + 6,
    },
    rowMenuText: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    // Spaced like Discover's switch: right under the header row, a little
    // room below, no line.
    toolBar: {
      position: "absolute",
      start: 0,
      end: 0,
      zIndex: 99,
      elevation: 16,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
      backgroundColor: colors.headerBackground,
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
      borderRadius: shape.tab,
    },
    toolChipActive: {
      backgroundColor: colors.selected,
    },
    // The count: plain text at the start of the row.
    countChip: {
      justifyContent: "center",
      paddingEnd: spacing.xs,
    },
    countChipText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    toolChipText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
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
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.control,
      marginHorizontal: spacing.md,
      overflow: "hidden",
    },
    searchInput: {
      ...typography.body,
      flex: 1,
      paddingVertical: 0,
      color: colors.textPrimary,
    },
    // All Collections: a kind's heading, then its rows, an even gap apart.
    section: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: 20,
    },
    sectionTitle: {
      ...typography.section,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    collectionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.card,
      paddingVertical: spacing.sm + 2,
      paddingStart: spacing.sm + 4,
      paddingEnd: spacing.md,
      borderRadius: shape.card,
    },
    // Three posters fanned, 16 apart: as tall as one poster (44 × 1.5).
    collectionCollage: {
      width: 76,
      height: 66,
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
      borderRadius: shape.chip,
    },
    collectionBarFill: {
      height: "100%",
      backgroundColor: colors.textPrimary,
      borderRadius: shape.chip,
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
      borderRadius: shape.tab,
    },
    chipSelected: {
      backgroundColor: colors.selected,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.segmentText,
    },
    chipTextSelected: {
      color: colors.selectedText,
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

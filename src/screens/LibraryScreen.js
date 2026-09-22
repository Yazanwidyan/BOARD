import { useEffect, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowDownWideNarrow, Bookmark, CheckCircle, Dices, Filter, Plus, Star, X,
} from 'lucide-react-native';
import { useColors } from '../theme/useColors';
import { typography } from '../theme/typography';
import { radius, spacing, TAB_BAR_CLEARANCE } from '../theme/spacing';
import { BottomSheet } from '../components/BottomSheet';
import { MoviePoster } from '../components/MoviePoster';
import { MovieGrid } from '../components/MovieGrid';
import { EmptyState } from '../components/EmptyState';
import { ScreenBottomFade } from '../components/ScreenBottomFade';
import { AddToBucketListSheet } from '../components/AddToBucketListSheet';
import { AddToWatchedSheet } from '../components/AddToWatchedSheet';
import { useMovieStore } from '../store/movieStore';
import { useSessionStore } from '../store/sessionStore';
import { getMovieById } from '../data/movies';
import { shuffle } from '../utils/shuffle';
import { matchesGenres } from '../utils/movieFilters';

const PICK_MAX = 10;
const PICK_MIN = 2;
const NUM_COLUMNS = 3;
const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama',
  'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller',
];
// The active switch pill is a fixed white gradient regardless of theme, so
// its icon/text need a fixed dark color to stay legible on it.
const TOOLBAR_ON_LIGHT_TEXT = '#131313';
export const LibraryScreen = ({ navigation, route }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState(route?.params?.initialTab ?? 'bucketlist');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddWatchedOpen, setIsAddWatchedOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [sortByRating, setSortByRating] = useState(false);

  // The tab screen stays mounted between visits, so a fresh `initialTab`
  // param (e.g. tapping a Home stat tile a second time) needs to actually
  // switch the view, not just seed the very first render.
  useEffect(() => {
    if (route?.params?.initialTab) {
      setTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  const bucketListIds = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const startSession = useSessionStore((state) => state.startSession);

  const bucketListMovies = bucketListIds
    .map(getMovieById)
    .filter(Boolean)
    .reverse();
  const watchedMovies = watched
    .map((entry) => {
      const movie = getMovieById(entry.movieId);
      return movie ? { movie, rating: entry.rating } : null;
    })
    .filter(Boolean);

  const visibleBucketListMovies = bucketListMovies
    .filter((movie) => matchesGenres(movie, selectedGenres));
  const visibleWatchedMovies = watchedMovies
    .filter(({ movie }) => matchesGenres(movie, selectedGenres))
    .sort((a, b) => {
      if (!sortByRating) return 0;
      return (b.rating ?? -1) - (a.rating ?? -1);
    });

  const canPick = bucketListMovies.length >= PICK_MIN;
  const hasActiveFilter = selectedGenres.length > 0;

  const toggleGenre = (genre) => {
    setSelectedGenres((current) => (
      current.includes(genre)
        ? current.filter((item) => item !== genre)
        : [...current, genre]
    ));
  };

  const handlePickFromList = () => {
    const movies = shuffle(bucketListMovies).slice(0, PICK_MAX);
    startSession(movies);
    navigation.navigate('Swipe');
  };

  const openDetails = (movieId) => navigation.navigate('MovieDetails', { movieId });

  const gap = spacing.md;
  const horizontalPadding = spacing.md;
  const cardWidth = (width - horizontalPadding * 2 - gap * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.toolbarRow, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.iconButton}
          onPress={() => (tab === 'bucketlist' ? setIsAddOpen(true) : setIsAddWatchedOpen(true))}
        >
          <Plus size={18} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.toolbarRowRight}>
          <Pressable style={styles.iconButton} onPress={() => setIsFilterOpen(true)}>
            <Filter size={17} color={colors.textPrimary} strokeWidth={2.2} />
            {hasActiveFilter && <View style={styles.iconButtonDot} />}
          </Pressable>
          {tab === 'bucketlist' ? (
            <Pressable
              style={[styles.iconButton, !canPick && styles.iconButtonDisabled]}
              onPress={handlePickFromList}
              disabled={!canPick}
            >
              <Dices size={18} color={colors.textPrimary} strokeWidth={2.2} />
            </Pressable>
          ) : (
            <Pressable
              style={styles.iconButton}
              onPress={() => setSortByRating((current) => !current)}
            >
              <ArrowDownWideNarrow size={18} color={colors.textPrimary} strokeWidth={2.2} />
              {sortByRating && <View style={styles.iconButtonDot} />}
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.switcherWrap}>
        <View style={styles.switcher}>
          <Pressable
            style={[styles.switchOption, tab === 'bucketlist' && styles.switchOptionActive]}
            onPress={() => setTab('bucketlist')}
          >
            <Bookmark
              size={16}
              color={tab === 'bucketlist' ? TOOLBAR_ON_LIGHT_TEXT : colors.textSecondary}
              strokeWidth={2.2}
            />
            <Text style={[styles.switchText, tab === 'bucketlist' && styles.switchTextActive]}>
              Watchlist ({bucketListMovies.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.switchOption, tab === 'watched' && styles.switchOptionActive]}
            onPress={() => setTab('watched')}
          >
            <CheckCircle
              size={16}
              color={tab === 'watched' ? TOOLBAR_ON_LIGHT_TEXT : colors.textSecondary}
              strokeWidth={2.2}
            />
            <Text style={[styles.switchText, tab === 'watched' && styles.switchTextActive]}>
              Watched ({watchedMovies.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {tab === 'bucketlist' ? (
        visibleBucketListMovies.length === 0 ? (
          <EmptyState
            icon={<Bookmark size={40} color={colors.textMuted} />}
            title={hasActiveFilter ? 'No matches' : 'Your watchlist is empty'}
            subtitle={hasActiveFilter
              ? 'No watchlist movies match the selected genres.'
              : 'Browse the Top 250 and add movies you want to watch someday.'}
            actionLabel={hasActiveFilter ? undefined : 'Browse Movies'}
            onAction={hasActiveFilter ? undefined : () => navigation.navigate('BrowseMovies')}
          />
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
            showsVerticalScrollIndicator={false}
          >
            <MovieGrid
              movies={visibleBucketListMovies}
              onPressMovie={(movie) => openDetails(movie.id)}
            />
          </ScrollView>
        )
      ) : visibleWatchedMovies.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={40} color={colors.textMuted} />}
          title={hasActiveFilter ? 'No matches' : 'Nothing watched yet'}
          subtitle={hasActiveFilter
            ? 'No watched movies match the selected genres.'
            : 'Mark movies as watched from their details page.'}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.grid, { paddingHorizontal: horizontalPadding, gap }]}>
            {visibleWatchedMovies.map(({ movie, rating }) => (
              <Pressable
                key={movie.id}
                onPress={() => openDetails(movie.id)}
                style={({ pressed }) => [{ width: cardWidth }, pressed && styles.pressed]}
              >
                <MoviePoster uri={movie.poster} shadow style={{ width: cardWidth, aspectRatio: 2 / 3 }} />
                <Text style={styles.movieTitle} numberOfLines={1}>{movie.title}</Text>
                <View style={styles.movieMetaRow}>
                  <Text style={styles.movieYear}>{movie.year}</Text>
                  {rating != null ? (
                    <View style={styles.ratingRow}>
                      <Star size={11} color={colors.textPrimary} fill={colors.textPrimary} />
                      <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
                    </View>
                  ) : (
                    <Text style={styles.notRated}>Not rated</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      <ScreenBottomFade />
      <AddToBucketListSheet visible={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <AddToWatchedSheet visible={isAddWatchedOpen} onClose={() => setIsAddWatchedOpen(false)} />

      <BottomSheet visible={isFilterOpen} onClose={() => setIsFilterOpen(false)}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Filter by Genre</Text>
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
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {genre}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.clearRow, { paddingBottom: insets.bottom + spacing.md }]}
          onPress={() => setSelectedGenres([])}
          disabled={!hasActiveFilter}
        >
          <Text style={[styles.clearText, !hasActiveFilter && styles.clearTextDisabled]}>
            Clear all
          </Text>
        </Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  switcherWrap: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.md,
    padding: 5,
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  toolbarRowRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  switchOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
  },
  switchOptionActive: {
    backgroundColor: '#FFFFFF',
    // Explicit here (not the shared `shadows` preset, which is disabled
    // app-wide) since this pill is meant to visually lift off the track.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  switchText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  switchTextActive: {
    color: TOOLBAR_ON_LIGHT_TEXT,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  iconButtonDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pressed: {
    opacity: 0.7,
  },
  movieTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  movieMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  movieYear: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingValue: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notRated: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
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
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  clearText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  clearTextDisabled: {
    color: colors.textMuted,
  },
});

export default LibraryScreen;

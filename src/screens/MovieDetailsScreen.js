import { LinearGradient } from "expo-linear-gradient";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  ChevronRight,
  Clapperboard,
  Play,
  RotateCw,
  Share2,
  Trophy,
} from "lucide-react-native";
import { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { TargetIcon } from "../components/icons/TabIcons";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { TierPicker } from "../components/TierPicker";
import { MOVIES, getMovieById } from "../data/movies";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  giveRatingFeedback,
  giveWatchedFeedback,
  rewatchMovieWithFeedback,
  toggleBucketListWithFeedback,
} from "../utils/achievementFeedback";
import {
  getCollectionById,
  getCollectionProgress,
  getCollectionsForMovie,
} from "../utils/collections";
import { getFamilyRating } from "../utils/familyRating";
import { getTier, getTierInfo } from "../utils/tiers";
import { formatRuntime, isInBucketList } from "../utils/movieFilters";

const POSTER_WIDTH = 168;
const HEADER_BAR_HEIGHT = 40;
const STICKY_BAR_HEIGHT = 52;
const DESCRIPTION_LINES = 4;
const SIMILAR_COUNT = 10;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const timeAgo = (timestamp) => {
  const days = Math.floor((Date.now() - timestamp) / DAY_MS);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const runtimeCategory = (minutes) =>
  minutes < 100
    ? "Short"
    : minutes < 135
      ? "Standard length"
      : minutes < 165
        ? "Long"
        : "Epic";

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

// The director's other films get their own "Also by" row, so "More like
// this" is purely the same lead genre (best-rated first) — no overlap.
const getSimilarMovies = (movie) =>
  MOVIES.filter(
    (other) =>
      other.id !== movie.id &&
      other.director !== movie.director &&
      other.genres[0] === movie.genres[0],
  )
    .sort((a, b) => b.rating - a.rating)
    .slice(0, SIMILAR_COUNT);

const getDirectorMovies = (movie) =>
  MOVIES.filter(
    (other) => other.id !== movie.id && other.director === movie.director,
  ).sort((a, b) => a.year - b.year);

// Good / mixed / poor by each site's own thresholds: Rotten Tomatoes ≥ 60
// is "fresh"; Metacritic ≥ 61 is "generally favorable", 40–60 "mixed".
const scoreColor = (source, value, colors) => {
  if (source === "rt") return value >= 60 ? colors.success : colors.danger;
  if (source === "mc")
    return value >= 61
      ? colors.success
      : value >= 40
        ? colors.rating
        : colors.danger;
  return colors.rating;
};

// One button of the action dock — icon over a short label, lit in accent
// when its state is "on" (on the watchlist, set as tonight's pick).
const DockButton = ({ icon, label, active, onPress, styles }) => (
  <Pressable
    style={[styles.dockButton, active && styles.dockButtonActive]}
    onPress={onPress}
  >
    {icon}
    <Text
      style={[styles.dockLabel, active && styles.dockLabelActive]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </Pressable>
);

// Poster stage (the real poster, large and centered on the same accent
// gradient as Collection Details — the per-movie backdrops are stock
// placeholders, so they're no longer used) → one primary "Mark as Watched"
// plus an action dock for everything else → context that only shows when
// it applies (active challenge, your rating) → overview → the collections
// it's part of → more like this.
export const MovieDetailsScreen = ({ route, navigation }) => {
  const { movieId } = route.params;
  const movie = getMovieById(movieId);
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const inBucketList = useMovieStore((state) =>
    isInBucketList(state.bucketList, movieId),
  );
  const watched = useMovieStore((state) => state.watched);
  const bucketEntry = useMovieStore((state) =>
    state.bucketList.find((entry) => entry.movieId === movieId),
  );
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const setWatchedTier = useMovieStore((state) => state.setWatchedTier);
  const isPicked = useMovieStore((state) => state.pickedMovie === movieId);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);

  // All hooks run before the `!movie` early return below, so the hook
  // order never changes between renders.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const stickyStart = 280;
  const stickyEnd = 340;
  const stickyBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [stickyStart, stickyEnd],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  if (!movie) {
    return null;
  }

  const watchedEntry = watched.find((entry) => entry.movieId === movieId);
  const isWatched = !!watchedEntry;
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const isChallengeTarget = activeChallenge?.targetMovieId === movieId;
  const collections = getCollectionsForMovie(movieId);
  const similarMovies = getSimilarMovies(movie);
  const directorMovies = getDirectorMovies(movie);
  const details = movie.details;

  const openList = (title, movies) =>
    navigation.push("BrowseMovies", {
      title,
      movieIds: movies.map((item) => item.id),
    });

  const openActor = (actor) => {
    const collection = getCollectionById(`actor-${slugify(actor)}`);
    if (collection) {
      navigation.push("CollectionDetails", { collectionId: collection.id });
    } else {
      openList(
        `Starring ${actor}`,
        MOVIES.filter((item) => item.cast?.includes(actor)),
      );
    }
  };

  const scores = [
    {
      key: "imdb",
      label: "IMDb",
      value: movie.rating.toFixed(1),
      suffix: "/10",
    },
    details?.rottenTomatoes != null && {
      key: "rt",
      label: "Rotten Tomatoes",
      value: String(details.rottenTomatoes),
      suffix: "%",
      color: scoreColor("rt", details.rottenTomatoes, colors),
    },
    details?.metacritic != null && {
      key: "mc",
      label: "Metacritic",
      value: String(details.metacritic),
      suffix: "/100",
      color: scoreColor("mc", details.metacritic, colors),
    },
    {
      key: "reelboard",
      label: "Reelboard",
      value: getTier(watchedEntry) ?? "–",
      suffix: "",
      color: getTierInfo(getTier(watchedEntry))?.color ?? colors.textMuted,
    },
  ].filter(Boolean);

  const family = getFamilyRating(movie);

  const facts = [
    { label: "Family", value: family.note },
    { label: "Director", value: movie.director },
    details?.writers && { label: "Writers", value: details.writers },
    details?.language && { label: "Language", value: details.language },
    details?.country && { label: "Country", value: details.country },
    details?.boxOffice && { label: "Box office", value: details.boxOffice },
  ].filter(Boolean);
  const decade = `${Math.floor(movie.year / 10) * 10}s`;

  const handleToggleWatched = () => {
    const wasWatched = isWatched;
    const { watched: watchedBefore, bucketList: bucketListBefore } =
      useMovieStore.getState();
    toggleWatched(movieId);
    if (!wasWatched) {
      giveWatchedFeedback(movieId, watchedBefore, bucketListBefore);
    }
  };

  const handleTier = (tier) => {
    const { watched: watchedBefore } = useMovieStore.getState();
    setWatchedTier(movieId, tier);
    giveRatingFeedback(watchedBefore);
  };

  const handleWatchTrailer = () => {
    const query = encodeURIComponent(`${movie.title} ${movie.year} trailer`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
  };

  const handleShare = () => {
    Share.share({
      message: `Check out ${movie.title} (${movie.year}) on Reelboard — rated ${movie.rating.toFixed(1)}.`,
    });
  };

  const headerTop = insets.top + spacing.sm;
  const iconColor = (active) =>
    active ? colors.accentLight : colors.textPrimary;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.stage,
            { paddingTop: headerTop + HEADER_BAR_HEIGHT + spacing.md },
          ]}
        >
          <LinearGradient
            colors={["rgba(141, 96, 226, 0.28)", colors.background]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View>
            <MoviePoster
              uri={movie.poster}
              style={styles.poster}
              radius={radius.md}
              shadow
            />
          </View>

          <Text style={styles.title}>{movie.title}</Text>
          <Text style={styles.director} numberOfLines={1}>
            {movie.director} · {movie.year}
          </Text>
          <View style={styles.metaRow}>
            {details?.rated && (
              <View style={styles.ageBadge}>
                <Text style={styles.ageText}>{details.rated}</Text>
              </View>
            )}
            <Text style={styles.meta} numberOfLines={1}>
              {formatRuntime(movie.runtime)} · {movie.genres.join(" · ")}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <PrimaryButton
            label={isWatched ? "Watched" : "Mark as Watched"}
            variant={isWatched ? "secondary" : "primary"}
            icon={
              isWatched ? (
                <CheckCircle size={18} color={colors.success} />
              ) : null
            }
            onPress={handleToggleWatched}
          />
          {!isWatched && isPicked && (
            <Text style={styles.noteText}>
              Marking as watched will clear it as tonight&apos;s pick.
            </Text>
          )}

          <View style={styles.dock}>
            {!isWatched && (
              <DockButton
                styles={styles}
                active={inBucketList}
                label={inBucketList ? "Saved" : "Watchlist"}
                onPress={() => toggleBucketListWithFeedback(movie.id)}
                icon={
                  inBucketList ? (
                    <BookmarkCheck size={20} color={iconColor(true)} />
                  ) : (
                    <Bookmark size={20} color={iconColor(false)} />
                  )
                }
              />
            )}
            {!isWatched && (
              <DockButton
                styles={styles}
                active={isPicked}
                label="Tonight"
                onPress={() => togglePickedMovie(movie.id)}
                icon={<Clapperboard size={20} color={iconColor(isPicked)} />}
              />
            )}
            <DockButton
              styles={styles}
              label="Trailer"
              onPress={handleWatchTrailer}
              icon={
                <Play
                  size={20}
                  color={colors.textPrimary}
                  fill={colors.textPrimary}
                />
              }
            />
            {isWatched && (
              <DockButton
                styles={styles}
                label="Rewatch"
                onPress={() => rewatchMovieWithFeedback(movieId)}
                icon={<RotateCw size={20} color={colors.textPrimary} />}
              />
            )}
          </View>

          {isChallengeTarget && (
            <View style={styles.challengeBanner}>
              <TargetIcon size={18} color={colors.accentContrast} />
              <View style={styles.bannerText}>
                <Text style={styles.challengeEyebrow}>
                  ACTIVE CHALLENGE ·{" "}
                  {activeChallenge.difficultyLabel.toUpperCase()}
                </Text>
                <Text style={styles.challengeDescription} numberOfLines={2}>
                  {activeChallenge.description}
                </Text>
              </View>
            </View>
          )}

          {isWatched ? (
            <View style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <Text style={styles.sectionLabelInline}>Your history</Text>
                <Text style={styles.watchCount}>
                  {watchedEntry.timestamp
                    ? `Watched ${formatDate(watchedEntry.timestamp)}`
                    : "Watched"}{" "}
                  · {watchedEntry.watchCount ?? 1}×
                </Text>
              </View>
              <Text style={styles.tierPrompt}>Your Reelboard tier</Text>
              <TierPicker tier={getTier(watchedEntry)} onChange={handleTier} />
            </View>
          ) : (
            bucketEntry && (
              <View style={styles.savedRow}>
                <Bookmark size={14} color={colors.accentLight} />
                <Text style={styles.savedText}>
                  On your watchlist
                  {bucketEntry.addedAt
                    ? ` · saved ${timeAgo(bucketEntry.addedAt)}`
                    : ""}
                </Text>
              </View>
            )
          )}

          <Text style={styles.sectionLabel}>Overview</Text>
          <Text
            style={styles.description}
            numberOfLines={expanded ? undefined : DESCRIPTION_LINES}
            onTextLayout={(event) => {
              if (
                !expanded &&
                event.nativeEvent.lines.length >= DESCRIPTION_LINES
              ) {
                setCanExpand(true);
              }
            }}
          >
            {movie.description}
          </Text>
          {canExpand && (
            <Pressable
              onPress={() => setExpanded((value) => !value)}
              hitSlop={6}
            >
              <Text style={styles.moreText}>
                {expanded ? "Show less" : "Read more"}
              </Text>
            </Pressable>
          )}

          <Text style={styles.sectionLabel}>Scores</Text>
          <View style={styles.scoresRow}>
            {scores.map((score) => (
              <View key={score.key} style={styles.scoreTile}>
                <Text
                  style={[
                    styles.scoreValue,
                    { color: score.color ?? colors.rating },
                  ]}
                >
                  {score.value}
                  <Text style={styles.scoreSuffix}>{score.suffix}</Text>
                </Text>
                <Text style={styles.scoreLabel} numberOfLines={1}>
                  {score.label}
                </Text>
              </View>
            ))}
          </View>

          {details?.awards && (
            <View style={styles.awardsRow}>
              <Trophy size={15} color={colors.rating} />
              <Text style={styles.awardsText}>{details.awards}</Text>
            </View>
          )}

          <View style={styles.factChips}>
            <View style={styles.factChip}>
              <Text style={styles.factChipText}>
                {runtimeCategory(movie.runtime)} ·{" "}
                {formatRuntime(movie.runtime)}
              </Text>
            </View>
            <Pressable
              style={styles.factChip}
              onPress={() =>
                openList(
                  `The ${decade}`,
                  MOVIES.filter(
                    (item) => `${Math.floor(item.year / 10) * 10}s` === decade,
                  ).sort((a, b) => b.rating - a.rating),
                )
              }
            >
              <Text style={styles.factChipText}>The {decade}</Text>
              <ChevronRight size={12} color={colors.textSecondary} />
            </Pressable>
            {movie.genres.map((genre) => (
              <Pressable
                key={genre}
                style={styles.factChip}
                onPress={() =>
                  openList(
                    genre,
                    MOVIES.filter((item) => item.genres.includes(genre)).sort(
                      (a, b) => b.rating - a.rating,
                    ),
                  )
                }
              >
                <Text style={styles.factChipText}>{genre}</Text>
                <ChevronRight size={12} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>

          {movie.cast?.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Cast</Text>
              <View style={styles.castList}>
                {movie.cast.map((actor) => {
                  const hasCollection = !!getCollectionById(
                    `actor-${slugify(actor)}`,
                  );
                  const filmCount = MOVIES.filter((item) =>
                    item.cast?.includes(actor),
                  ).length;
                  return (
                    <Pressable
                      key={actor}
                      style={styles.castRow}
                      onPress={() => openActor(actor)}
                    >
                      <View style={styles.castAvatar}>
                        <Text style={styles.castInitials}>
                          {initials(actor)}
                        </Text>
                      </View>
                      <View style={styles.castInfo}>
                        <Text style={styles.castName} numberOfLines={1}>
                          {actor}
                        </Text>
                        <Text style={styles.castMeta}>
                          {filmCount > 1
                            ? `${filmCount} films in Reelboard${hasCollection ? " · collection" : ""}`
                            : "1 film in Reelboard"}
                        </Text>
                      </View>
                      <ChevronRight size={16} color={colors.textMuted} />
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.sectionLabel}>Details</Text>
          <View style={styles.factsCard}>
            {facts.map((fact, index) => (
              <View
                key={fact.label}
                style={[
                  styles.factRow,
                  index === facts.length - 1 && styles.factRowLast,
                ]}
              >
                <Text style={styles.factLabel}>{fact.label}</Text>
                <Text style={styles.factValue}>{fact.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {collections.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, styles.railLabel]}>Part of</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railContent}
            >
              {collections.map((collection) => {
                const { watchedCount, total, progress } = getCollectionProgress(
                  collection,
                  watchedIds,
                );
                return (
                  <Pressable
                    key={collection.id}
                    style={styles.collectionChip}
                    onPress={() =>
                      navigation.push("CollectionDetails", {
                        collectionId: collection.id,
                      })
                    }
                  >
                    <View style={styles.collectionChipHeader}>
                      <Text
                        style={styles.collectionChipTitle}
                        numberOfLines={1}
                      >
                        {collection.title}
                      </Text>
                      <ChevronRight size={14} color={colors.textSecondary} />
                    </View>
                    <View style={styles.chipTrack}>
                      <View
                        style={[
                          styles.chipFill,
                          { width: `${progress * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.collectionChipStat}>
                      {watchedCount} / {total} watched
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {directorMovies.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, styles.railLabel]}>
              Also by {movie.director}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railContent}
            >
              {directorMovies.map((other) => (
                <Pressable
                  key={other.id}
                  style={styles.similarCard}
                  onPress={() =>
                    navigation.push("MovieDetails", { movieId: other.id })
                  }
                >
                  <MoviePoster
                    uri={other.poster}
                    style={styles.similarPoster}
                  />
                  {watchedIds.has(other.id) && (
                    <View style={styles.watchedTick}>
                      <CheckCircle size={14} color={colors.success} />
                    </View>
                  )}
                  <Text style={styles.similarTitle} numberOfLines={1}>
                    {other.title}
                  </Text>
                  <Text style={styles.similarYear}>{other.year}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {similarMovies.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, styles.railLabel]}>
              More Like This
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railContent}
            >
              {similarMovies.map((similar) => (
                <Pressable
                  key={similar.id}
                  style={styles.similarCard}
                  onPress={() =>
                    navigation.push("MovieDetails", { movieId: similar.id })
                  }
                >
                  <MoviePoster
                    uri={similar.poster}
                    radius={radius.xs}
                    style={styles.similarPoster}
                  />
                  <Text style={styles.similarTitle} numberOfLines={1}>
                    {similar.title}
                  </Text>
                  <Text style={styles.similarYear}>{similar.year}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </Animated.ScrollView>

      <View
        style={[styles.headerBar, { top: headerTop }]}
        pointerEvents="box-none"
      >
        <BackButton onPress={() => navigation.goBack()} />
        <Pressable
          style={styles.headerIconButton}
          onPress={handleShare}
          hitSlop={6}
        >
          <Share2 size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Fades in once the poster scrolls away, so there's always a title
          and a way back on screen. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.stickyBar,
          { height: insets.top + STICKY_BAR_HEIGHT, paddingTop: insets.top },
          stickyBarStyle,
        ]}
      >
        <BackButton onPress={() => navigation.goBack()} size={36} />
        <Text style={styles.stickyTitle} numberOfLines={1}>
          {movie.title}
        </Text>
      </Animated.View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs + 2,
      marginTop: 2,
      maxWidth: "100%",
    },
    ageBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.textMuted,
    },
    ageText: {
      ...typography.label,
      fontSize: 11,
      letterSpacing: 0.3,
      color: colors.textSecondary,
    },
    tierPrompt: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xs + 2,
    },
    savedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
      marginTop: spacing.md,
    },
    savedText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    scoresRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    scoreTile: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    scoreValue: {
      ...typography.hero,
      fontSize: 22,
      lineHeight: 26,
    },
    scoreSuffix: {
      ...typography.caption,
      color: colors.textMuted,
    },
    scoreLabel: {
      ...typography.micro,
      color: colors.textSecondary,
      marginTop: 2,
    },
    awardsRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      marginTop: spacing.md,
      marginHorizontal: -spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: `${colors.rating}14`,
    },
    awardsText: {
      ...typography.caption,
      flex: 1,
      color: colors.textPrimary,
    },
    factChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    factChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
    },
    factChipText: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    castList: {
      marginHorizontal: -spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    castRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    castAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
    },
    castInitials: {
      ...typography.label,
      color: colors.textPrimary,
    },
    castInfo: {
      flex: 1,
    },
    castName: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    castMeta: {
      ...typography.caption,
      color: colors.textMuted,
    },
    factsCard: {
      marginHorizontal: -spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    factRow: {
      flexDirection: "row",
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    factRowLast: {
      borderBottomWidth: 0,
    },
    factLabel: {
      ...typography.caption,
      width: 84,
      color: colors.textMuted,
    },
    factValue: {
      ...typography.caption,
      flex: 1,
      color: colors.textPrimary,
    },
    watchedTick: {
      position: "absolute",
      top: 6,
      right: 6,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerBar: {
      position: "absolute",
      left: spacing.md,
      right: spacing.md,
      height: HEADER_BAR_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerIconButton: {
      width: HEADER_BAR_HEIGHT,
      height: HEADER_BAR_HEIGHT,
      borderRadius: HEADER_BAR_HEIGHT / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stage: {
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
    },
    poster: {
      width: POSTER_WIDTH,
      aspectRatio: 2 / 3,
    },
    title: {
      ...typography.hero,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.md,
    },
    director: {
      ...typography.bodyBold,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    meta: {
      ...typography.caption,
      flexShrink: 1,
      color: colors.textMuted,
      textAlign: "center",
    },
    content: {
      paddingHorizontal: spacing.md,
    },
    noteText: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    dock: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    dockButton: {
      flex: 1,
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: "transparent",
    },
    dockButtonActive: {
      backgroundColor: "rgba(141, 96, 226, 0.16)",
      borderColor: colors.accent,
    },
    dockLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    dockLabelActive: {
      color: colors.accentLight,
    },
    challengeBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    bannerText: {
      flex: 1,
    },
    challengeEyebrow: {
      ...typography.label,
      color: colors.accentContrast,
    },
    challengeDescription: {
      ...typography.caption,
      color: "rgba(255, 255, 255, 0.85)",
      marginTop: 2,
    },
    ratingCard: {
      marginTop: spacing.md,
      marginHorizontal: -spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      gap: spacing.sm,
    },
    ratingHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionLabelInline: {
      ...typography.label,
      color: colors.textSecondary,
    },
    watchCount: {
      ...typography.caption,
      color: colors.textMuted,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    description: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    moreText: {
      ...typography.bodyBold,
      color: colors.accentLight,
      marginTop: spacing.xs,
    },
    railLabel: {
      paddingHorizontal: spacing.md,
    },
    railContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    collectionChip: {
      width: 180,
      padding: spacing.sm + 2,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    collectionChipHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    collectionChipTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      flex: 1,
    },
    chipTrack: {
      height: 4,
      borderRadius: 2,
      marginTop: spacing.sm,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
    },
    chipFill: {
      height: "100%",
      backgroundColor: colors.accentLight,
    },
    collectionChipStat: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },
    similarCard: {
      width: 100,
    },
    similarPoster: {
      width: 100,
      aspectRatio: 2 / 3,
    },
    similarTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    similarYear: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    stickyBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.background,
    },
    stickyTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
      flex: 1,
    },
  });

export default MovieDetailsScreen;

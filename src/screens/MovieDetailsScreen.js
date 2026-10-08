import { LinearGradient } from "expo-linear-gradient";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  Clapperboard,
  Play,
  RotateCw,
  Share2,
} from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "../components/AppText";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "../components/BackButton";
import { ScoreRings } from "../components/ScoreRings";
import { WatchDateSheet } from "../components/WatchDateSheet";
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
import { t } from "../i18n";

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
  if (days < 14) return t("{count} days ago", { count: days });
  if (days < 60) return t("{count} weeks ago", { count: Math.round(days / 7) });
  return t("{count} months ago", { count: Math.round(days / 30) });
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

// Cinematic hero (the poster itself, full width, fading into the page,
// with the title, facts and scores on it — the per-movie stock backdrops
// are placeholders, so they're not used) → one primary "Mark as Watched"
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
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  // Measured height of the poster stage, for the blurred backdrop behind it.
  const [stageHeight, setStageHeight] = useState(0);
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
  const setWatchedDate = useMovieStore((state) => state.setWatchedDate);
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
        t("Starring {name}", { name: actor }),
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
      fraction: movie.rating / 10,
    },
    details?.rottenTomatoes != null && {
      key: "rt",
      label: "Rotten Tomatoes",
      value: String(details.rottenTomatoes),
      suffix: "%",
      fraction: details.rottenTomatoes / 100,
      color: scoreColor("rt", details.rottenTomatoes, colors),
    },
    details?.metacritic != null && {
      key: "mc",
      label: "Metacritic",
      value: String(details.metacritic),
      suffix: "/100",
      fraction: details.metacritic / 100,
      color: scoreColor("mc", details.metacritic, colors),
    },
    {
      key: "reelboard",
      label: "ReelBoard",
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
      message: t("Check out {title} ({year}) on ReelBoard — rated {value}.", {
        title: movie.title,
        year: movie.year,
        value: movie.rating.toFixed(1),
      }),
    });
  };

  const headerTop = insets.top + spacing.sm;
  const iconColor = (active) =>
    active ? colors.textPrimary : colors.textSecondary;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Backdrop: the movie's own poster, blurred, fading into the
            page. Sized from the stage's measured height (not stretched to
            fill it), with a plain Image. */}
        {stageHeight > 0 && (
          <View
            pointerEvents="none"
            style={[styles.backdrop, { height: stageHeight }]}
          >
            <Image
              source={{ uri: movie.poster }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              blurRadius={14}
            />
            <LinearGradient
              colors={[
                `${colors.background}14`,
                `${colors.background}66`,
                colors.background,
              ]}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}
        <View
          onLayout={(event) => setStageHeight(event.nativeEvent.layout.height)}
          style={[
            styles.stage,
            { paddingTop: headerTop + HEADER_BAR_HEIGHT + spacing.md },
          ]}
        >
          <MoviePoster uri={movie.poster} style={styles.poster} shadow />
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
            label={isWatched ? t("Watched") : t("Mark as watched")}
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
              {t("Marking as watched will clear it as tonight's pick.")}
            </Text>
          )}

          <View style={styles.dock}>
            {!isWatched && (
              <DockButton
                styles={styles}
                active={inBucketList}
                label={inBucketList ? t("Saved") : t("Watchlist")}
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
                label={t("Tonight")}
                onPress={() => togglePickedMovie(movie.id)}
                icon={<Clapperboard size={20} color={iconColor(isPicked)} />}
              />
            )}
            <DockButton
              styles={styles}
              label={t("Trailer")}
              onPress={handleWatchTrailer}
              icon={<Play size={20} color={colors.textPrimary} />}
            />
            {isWatched && (
              <DockButton
                styles={styles}
                label={t("Rewatch")}
                onPress={() => rewatchMovieWithFeedback(movieId)}
                icon={<RotateCw size={20} color={colors.textPrimary} />}
              />
            )}
          </View>

          {isChallengeTarget && (
            <View style={styles.challengeBanner}>
              <View style={styles.bannerText}>
                <Text style={styles.challengeEyebrow}>
                  {t("Your dare ·")} {activeChallenge.difficultyLabel}
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
                <Text style={styles.sectionLabelInline}>
                  {t("Your history")}
                </Text>
                {/* Tap the date to change when you watched it. */}
                <Pressable
                  onPress={() => setIsDateSheetOpen(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("Change when you watched it")}
                >
                  <Text style={styles.watchCount}>
                    <Text style={styles.watchDate}>
                      {watchedEntry.timestamp
                        ? formatDate(watchedEntry.timestamp)
                        : t("Add date")}
                    </Text>{" "}
                    · {watchedEntry.watchCount ?? 1}×
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.tierPrompt}>{t("Your ReelBoard tier")}</Text>
              <TierPicker tier={getTier(watchedEntry)} onChange={handleTier} />
            </View>
          ) : (
            bucketEntry && (
              <View style={styles.savedRow}>
                <Text style={styles.savedText}>
                  {t("On your watchlist")}
                  {bucketEntry.addedAt
                    ? t(" · saved {addedAt}", {
                        addedAt: timeAgo(bucketEntry.addedAt),
                      })
                    : ""}
                </Text>
              </View>
            )
          )}

          <Text style={styles.sectionLabel}>{t("Overview")}</Text>
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
                {expanded ? t("Show less") : t("Read more")}
              </Text>
            </Pressable>
          )}

          <Text style={styles.sectionLabel}>{t("Scores")}</Text>
          <ScoreRings scores={scores} />

          {details?.awards && (
            <View style={styles.awardsRow}>
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
                  t("The {decade}", { decade }),
                  MOVIES.filter(
                    (item) => `${Math.floor(item.year / 10) * 10}s` === decade,
                  ).sort((a, b) => b.rating - a.rating),
                )
              }
            >
              <Text style={styles.factChipText}>
                {t("The")} {decade}
              </Text>
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
              </Pressable>
            ))}
          </View>

          {movie.cast?.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t("Cast")}</Text>
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
                            ? t("{filmCount} films in ReelBoard{value}", {
                                filmCount: filmCount,
                                value: hasCollection ? " · collection" : "",
                              })
                            : t("1 film in ReelBoard")}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.sectionLabel}>{t("Details")}</Text>
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
            <Text style={[styles.sectionLabel, styles.railLabel]}>
              {t("Part of")}
            </Text>
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
              {t("Also by")} {movie.director}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.posterRailContent}
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
              {t("More like this")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.posterRailContent}
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
          <Share2 size={22} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
      </View>

      <WatchDateSheet
        visible={isDateSheetOpen}
        timestamp={watchedEntry?.timestamp}
        onClose={() => setIsDateSheetOpen(false)}
        onSave={(timestamp) => {
          setWatchedDate(movieId, timestamp);
          setIsDateSheetOpen(false);
        }}
      />

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
      marginTop: 4,
      maxWidth: "100%",
    },
    ageBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
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
    awardsRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      marginTop: spacing.md,
      marginHorizontal: -spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
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
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: 7,
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
      borderBottomColor: colors.background,
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
      borderBottomColor: colors.background,
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
      end: 6,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerBar: {
      position: "absolute",
      start: spacing.md,
      end: spacing.md,
      height: HEADER_BAR_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    // Flat, like the app's other header icons (no circle).
    headerIconButton: {
      width: HEADER_BAR_HEIGHT,
      height: HEADER_BAR_HEIGHT,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    stage: {
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
    },
    backdrop: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      overflow: "hidden",
    },
    poster: {
      width: 168,
      aspectRatio: 2 / 3,
    },
    title: {
      ...typography.display,
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.6,
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
    // Clean icon + label buttons — no tile behind them.
    dockButton: {
      flex: 1,
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm,
    },
    dockButtonActive: {},
    dockLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    dockLabelActive: {
      color: colors.textPrimary,
    },
    challengeBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      marginHorizontal: -spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
    },
    bannerText: {
      flex: 1,
    },
    challengeEyebrow: {
      ...typography.caption,
      color: colors.textMuted,
    },
    challengeDescription: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
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
      ...typography.caption,
      color: colors.textMuted,
    },
    watchCount: {
      ...typography.caption,
      color: colors.textMuted,
    },
    // The date reads as a link — tap to change it.
    watchDate: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.textPrimary,
      textDecorationLine: "underline",
    },
    sectionLabel: {
      ...typography.title,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.3,
      color: colors.textPrimary,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    description: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    moreText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    railLabel: {
      paddingHorizontal: spacing.md,
    },
    railContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    // Poster rails: the same 2px hairline gap as Library's grid.
    posterRailContent: {
      paddingHorizontal: spacing.md,
      gap: 2,
    },
    collectionChip: {
      width: 180,
      padding: spacing.sm + 2,
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
      borderRadius: 0,
      marginTop: spacing.sm,
      backgroundColor: colors.cardElevatedLight,
      overflow: "hidden",
    },
    chipFill: {
      height: "100%",
      backgroundColor: colors.textPrimary,
    },
    collectionChipStat: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },
    similarCard: {
      width: 120,
    },
    similarPoster: {
      width: 120,
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
      start: 0,
      end: 0,
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

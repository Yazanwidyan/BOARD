import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  Clapperboard,
  LayoutGrid,
  Play,
  RotateCw,
  Share2,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
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

import { AddToBoardSheet } from "../components/AddToBoardSheet";
import { BackButton } from "../components/BackButton";
import { CommunityTiers } from "../components/CommunityTiers";
import { useMovieCommunity } from "../store/communityStore";
import { ScoreRings } from "../components/ScoreRings";
import { WatchDateSheet } from "../components/WatchDateSheet";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { TierPicker } from "../components/TierPicker";
import { getKnownMovies, getMovieById, useMoviesVersion } from "../data/movies";
import { api } from "../services/api";
import { useBoardStore } from "../store/boardStore";
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
  getCollectionProgress,
  getCollectionsForMovie,
  getSagaForPerson,
} from "../utils/collections";
import { getFamilyRating } from "../utils/familyRating";
import { getMovieMatch } from "../utils/tasteEngine";
import { getAverageTier, getTier } from "../utils/tiers";
import {
  useHeroFadeStyle,
  useStretchyBackdropStyle,
} from "../utils/scrollEffects";
import { formatRuntime, isInBucketList, byWeightedRating } from "../utils/movieFilters";
import { t } from "../i18n";

const HEADER_BAR_HEIGHT = 40;
const STICKY_BAR_HEIGHT = 52;
const DESCRIPTION_LINES = 4;
// The title logo fits inside this box, keeping its shape.
const LOGO_MAX_HEIGHT = 96;
const LOGO_MAX_WIDTH = 300;
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
  getKnownMovies().filter(
    (other) =>
      other.id !== movie.id &&
      other.director !== movie.director &&
      other.genres[0] === movie.genres[0],
  )
    .sort(byWeightedRating)
    .slice(0, SIMILAR_COUNT);

const getDirectorMovies = (movie) =>
  getKnownMovies().filter(
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

// Cinematic hero (the movie's backdrop — a still from the film — fading
// into the page, with the poster, title, facts and scores on it) → one
// primary "Mark as Watched"
// plus an action dock for everything else → context that only shows when
// it applies (active challenge, your rating) → overview → the collections
// it's part of → more like this.
export const MovieDetailsScreen = ({ route, navigation }) => {
  const { movieId } = route.params;
  // Any movie can be opened — one from search may not be on the phone, or
  // only as a card. Its page from the server brings the whole movie and
  // the collections it's in (remembered by services/api); this screen
  // re-renders as they arrive.
  useMoviesVersion();
  const page = useQuery({
    queryKey: ["movie", movieId],
    queryFn: () => api.get(`/movies/${movieId}`),
    staleTime: 60 * 60 * 1000,
  });
  // Everyone's tiers, for the ReelBoard score (and the community bars).
  const community = useMovieCommunity(movieId);
  const known = getMovieById(movieId);
  const movie = known && !known.partial ? known : null;
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const [logoFailed, setLogoFailed] = useState(false);
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
  const isOnABoard = useBoardStore((state) =>
    state.boards.some((board) => board.movieIds.includes(movieId)),
  );
  const [isBoardSheetOpen, setIsBoardSheetOpen] = useState(false);

  // All hooks run before the `!movie` early return below, so the hook
  // order never changes between renders.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  // The bar takes over exactly as the big title slides under it: the
  // title's bottom edge (measured in the page) minus the bar's height is
  // the scroll offset where it disappears. A close estimate until measured.
  const [titleBottom, setTitleBottom] = useState(null);
  const barBottom = insets.top + STICKY_BAR_HEIGHT;
  const stickyEnd = titleBottom != null ? titleBottom - barBottom : 340;
  const stickyStart = stickyEnd - 56;
  // The bar's background drops in from just above as it fades in…
  const stickyBarStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [stickyStart, stickyEnd],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * -10 }],
    };
  }, [stickyStart, stickyEnd]);
  // …then the poster thumbnail and the name rise into it, the name a beat
  // behind — as if the page's own poster and title had moved up into it.
  const stickyThumbStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [stickyStart + 16, stickyEnd + 8],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: progress,
      transform: [
        { translateY: (1 - progress) * 14 },
        { scale: 0.8 + progress * 0.2 },
      ],
    };
  }, [stickyStart, stickyEnd]);
  const stickyNameStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [stickyStart + 28, stickyEnd + 16],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * 12 }],
    };
  }, [stickyStart, stickyEnd]);
  // Pull down and the blurred backdrop zooms in with you; scroll up and it
  // drifts behind the page while the poster eases back under the bar.
  const backdropStyle = useStretchyBackdropStyle(scrollY, stageHeight);
  const posterStyle = useHeroFadeStyle(scrollY, stickyEnd);
  // The floating back / share fade out as the sticky bar takes over.
  const floatingBarStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(
        scrollY.value,
        [stickyStart - 40, stickyStart],
        [1, 0],
        Extrapolation.CLAMP,
      ),
    }),
    [stickyStart],
  );

  // The title logo's size: as big as fits the box, keeping its shape.
  const logo = (page.data?.movie?.details ?? movie?.details)?.logo;
  const logoSize =
    colors.isDark && logo?.url && logo.aspect > 0 && !logoFailed
      ? (() => {
          const width = Math.min(
            LOGO_MAX_WIDTH,
            windowWidth * 0.72,
            LOGO_MAX_HEIGHT * logo.aspect,
          );
          return { width, height: width / logo.aspect };
        })()
      : null;

  // How well it fits your taste (not for movies you've watched).
  const tasteMatch = useMemo(
    () => getMovieMatch(watched, movie),
    [watched, movie],
  );

  if (!movie) {
    return (
      <View style={[styles.container, styles.loading, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.loadingBar}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        {page.isError ? (
          <Text style={styles.loadingText}>
            {t("Couldn't load this movie. Check your connection and try again.")}
          </Text>
        ) : (
          <ActivityIndicator color={colors.textSecondary} style={styles.loadingSpinner} />
        )}
      </View>
    );
  }

  const watchedEntry = watched.find((entry) => entry.movieId === movieId);
  const isWatched = !!watchedEntry;
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const isChallengeTarget = activeChallenge?.targetMovieId === movieId;
  const collections = getCollectionsForMovie(movieId);
  const similarMovies = getSimilarMovies(movie);
  const directorMovies = getDirectorMovies(movie);
  const directorSaga = getSagaForPerson(movie.director);
  const details = movie.details;
  // The cast with photos and characters comes with the movie's page — read
  // from the page itself, since other copies of the movie (in lists, the
  // catalog) leave it out. Until it arrives, just the names.
  const castDetails =
    page.data?.movie?.details?.castDetails ?? details?.castDetails ?? [];
  const castPeople =
    castDetails.length > 0
      ? castDetails
      : (movie.cast ?? []).map((name) => ({ name }));

  const openList = (title, movies) =>
    navigation.push("BrowseMovies", {
      title,
      movieIds: movies.map((item) => item.id),
    });

  // An actor: their saga ("Say Hello" for Al Pacino) if they have one, or
  // else their films.
  const openActor = (actor) => {
    const saga = getSagaForPerson(actor);
    if (saga) {
      navigation.push("CollectionDetails", { collectionId: saga.id });
    } else {
      openList(
        t("Starring {name}", { name: actor }),
        getKnownMovies().filter((item) => item.cast?.includes(actor)),
      );
    }
  };

  const scores = [
    {
      key: "imdb",
      label: "TMDB",
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
    // ReelBoard: everyone's tiers averaged — not yours (yours is below).
    {
      key: "reelboard",
      label: "ReelBoard",
      value: getAverageTier(community.data?.tiers) ?? "–",
      suffix: "",
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

  // The movie's own trailer (from TMDB), or a YouTube search without one.
  const handleWatchTrailer = () => {
    if (details?.trailer) {
      Linking.openURL(`https://www.youtube.com/watch?v=${details.trailer}`);
      return;
    }
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
        {/* Backdrop: a still from the film (TMDB's, without text), fading
            into the page — or, for a movie without one, its poster blurred.
            Sized from the stage's measured height (not stretched to fill
            it), with a plain Image. */}
        {stageHeight > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.backdrop, { height: stageHeight }, backdropStyle]}
          >
            <Image
              source={{ uri: movie.backdrop ?? movie.poster }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              blurRadius={movie.backdrop ? 0 : 14}
            />
            <LinearGradient
              colors={
                movie.backdrop
                  ? [
                      // A touch darker at the top for the header buttons,
                      // clearer in the middle, solid at the bottom.
                      `${colors.background}59`,
                      `${colors.background}26`,
                      `${colors.background}99`,
                      colors.background,
                    ]
                  : [
                      `${colors.background}14`,
                      `${colors.background}66`,
                      colors.background,
                    ]
              }
              locations={movie.backdrop ? [0, 0.3, 0.7, 1] : [0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
        <View
          onLayout={(event) => setStageHeight(event.nativeEvent.layout.height)}
          style={[
            styles.stage,
            { paddingTop: headerTop + HEADER_BAR_HEIGHT + spacing.md },
          ]}
        >
          <Animated.View style={posterStyle}>
            <MoviePoster uri={movie.poster} style={styles.poster} shadow />
          </Animated.View>
          {logoSize ? (
            // The movie's own title art (from TMDB). Dark mode only — most
            // logos are white — and the plain title if it doesn't load.
            <View
              style={styles.logoWrap}
              onLayout={(event) => {
                const { y, height } = event.nativeEvent.layout;
                setTitleBottom(y + height);
              }}
              accessible
              accessibilityRole="header"
              accessibilityLabel={movie.title}
            >
              <Image
                source={{ uri: logo.url }}
                style={logoSize}
                resizeMode="contain"
                onError={() => setLogoFailed(true)}
              />
            </View>
          ) : (
            <Text
              style={styles.title}
              onLayout={(event) => {
                const { y, height } = event.nativeEvent.layout;
                setTitleBottom(y + height);
              }}
            >
              {movie.title}
            </Text>
          )}
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
          {tasteMatch && (
            <View style={styles.matchBlock}>
              <View style={styles.matchPill}>
                <Text style={styles.matchText}>
                  {t("{match}% your taste", { match: tasteMatch.match })}
                </Text>
              </View>
              <Text style={styles.matchReason} numberOfLines={2}>
                {tasteMatch.reasons[0]}
              </Text>
            </View>
          )}
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
              active={isOnABoard}
              label={t("Board")}
              onPress={() => setIsBoardSheetOpen(true)}
              icon={<LayoutGrid size={20} color={iconColor(isOnABoard)} />}
            />
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

          <CommunityTiers movieId={movieId} labelStyle={styles.sectionLabel} />

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
                  getKnownMovies().filter(
                    (item) => `${Math.floor(item.year / 10) * 10}s` === decade,
                  ).sort(byWeightedRating),
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
                    getKnownMovies().filter((item) => item.genres.includes(genre)).sort(
                      byWeightedRating,
                    ),
                  )
                }
              >
                <Text style={styles.factChipText}>{genre}</Text>
              </Pressable>
            ))}
          </View>

          {castPeople.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t("Cast")}</Text>
              <View style={styles.castList}>
                {castPeople.map(({ name: actor, character, photo }) => {
                  const saga = getSagaForPerson(actor);
                  return (
                    <Pressable
                      key={actor}
                      style={styles.castRow}
                      onPress={() => openActor(actor)}
                    >
                      <View style={styles.castAvatar}>
                        {photo ? (
                          <Image
                            source={{ uri: photo }}
                            style={styles.castPhoto}
                          />
                        ) : (
                          <Text style={styles.castInitials}>
                            {initials(actor)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.castInfo}>
                        <Text style={styles.castName} numberOfLines={1}>
                          {actor}
                        </Text>
                        {!!character && (
                          <Text style={styles.castCharacter} numberOfLines={1}>
                            {character}
                          </Text>
                        )}
                        {/* Actors with a saga name it — tapping opens it. */}
                        {saga && (
                          <Text style={styles.castSaga} numberOfLines={1}>
                            {t("Saga · {title}", { title: saga.title })}
                          </Text>
                        )}
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
            <View style={styles.railHeader}>
              <Text style={[styles.sectionLabel, styles.railHeaderLabel]} numberOfLines={1}>
                {t("Also by")} {movie.director}
              </Text>
              {directorSaga && (
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    navigation.push("CollectionDetails", { collectionId: directorSaga.id })
                  }
                >
                  <Text style={styles.railHeaderLink} numberOfLines={1}>
                    {directorSaga.title} ›
                  </Text>
                </Pressable>
              )}
            </View>
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

      <Animated.View
        style={[styles.headerBar, { top: headerTop }, floatingBarStyle]}
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
      </Animated.View>

      <AddToBoardSheet
        visible={isBoardSheetOpen}
        onClose={() => setIsBoardSheetOpen(false)}
        movieId={movieId}
      />

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
        <Animated.View style={stickyThumbStyle}>
          <MoviePoster uri={movie.poster} style={styles.stickyPoster} />
        </Animated.View>
        <Animated.View style={[styles.stickyText, stickyNameStyle]}>
          <Text style={styles.stickyTitle} numberOfLines={1}>
            {movie.title}
          </Text>
          <Text style={styles.stickyMeta} numberOfLines={1}>
            {movie.year} · {formatRuntime(movie.runtime)}
          </Text>
        </Animated.View>
        <Pressable
          style={styles.stickyIconButton}
          onPress={handleShare}
          hitSlop={6}
          accessibilityLabel={t("Share")}
        >
          <Share2 size={22} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
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
    // Your taste match, under the title: a pill, and why.
    matchBlock: {
      alignItems: "center",
      gap: spacing.xs,
      marginTop: spacing.sm + 2,
      paddingHorizontal: spacing.lg,
    },
    matchPill: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      backgroundColor: colors.successSoft,
    },
    matchText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.success,
    },
    matchReason: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
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
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
    },
    castPhoto: {
      width: 40,
      height: 40,
    },
    castCharacter: {
      ...typography.caption,
      color: colors.textSecondary,
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
    castSaga: {
      ...typography.caption,
      color: colors.rating,
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
    // While a movie the phone didn't have is fetched.
    loading: {
      paddingHorizontal: spacing.md,
    },
    loadingBar: {
      flexDirection: "row",
    },
    loadingSpinner: {
      marginTop: spacing.xl * 2,
    },
    loadingText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xl * 2,
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
    logoWrap: {
      alignItems: "center",
      marginTop: spacing.md,
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
    // A rail's title with a link at the end (the director's saga).
    railHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    railHeaderLabel: {
      flexShrink: 1,
      marginTop: 0,
      marginBottom: 0,
    },
    railHeaderLink: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.rating,
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
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    stickyPoster: {
      width: 28,
      height: 42,
    },
    stickyText: {
      flex: 1,
    },
    stickyTitle: {
      ...typography.subtitle,
      fontSize: 15,
      lineHeight: 19,
      color: colors.textPrimary,
    },
    stickyMeta: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 15,
      color: colors.textSecondary,
    },
    stickyIconButton: {
      width: 40,
      height: STICKY_BAR_HEIGHT,
      alignItems: "flex-end",
      justifyContent: "center",
    },
  });

export default MovieDetailsScreen;

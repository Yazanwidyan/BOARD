import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Crown,
  Ellipsis,
  Eye,
  Layers,
  LayoutGrid,
  ListOrdered,
  Play,
  RotateCw,
  Share2,
  Star,
  TrendingUp,
} from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
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
import { PrimaryButton } from "../components/PrimaryButton";
import { TonightIcon } from "../components/icons/TonightIcon";
import { useMovieCommunity } from "../store/communityStore";
import { ScoreRings } from "../components/ScoreRings";
import { TasteMatchSheet } from "../components/TasteMatchSheet";
import { TierHistogram } from "../components/TierHistogram";
import { UnderlineTabs } from "../components/UnderlineTabs";
import { BottomSheet } from "../components/BottomSheet";
import { WatchDateSheet } from "../components/WatchDateSheet";
import { MoviePoster } from "../components/MoviePoster";
import { getKnownMovies, getMovieById, useMoviesVersion } from "../data/movies";
import { api } from "../services/api";
import { shareLink } from "../services/shareLinks";
import { useBoardStore } from "../store/boardStore";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
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
import { describeForecast, makeRankForecast } from "../utils/ranks";
import { getMovieMatch, getTastePicks } from "../utils/tasteEngine";
import { getAverageTier, getTier, getTierInfo } from "../utils/tiers";
import { describeSagaStep, getSagaStep } from "../utils/tonightPick";
import { countFinishedDares } from "../utils/useRanks";
import {
  useHeroFadeStyle,
  useStretchyBackdropStyle,
} from "../utils/scrollEffects";
import { formatRuntime, isInBucketList, byWeightedRating } from "../utils/movieFilters";
import { t, useIsRTL } from "../i18n";

const HEADER_BAR_HEIGHT = 40;
const STICKY_BAR_HEIGHT = 52;
const DESCRIPTION_LINES = 4;
// How long the ⋯ sheet takes to slide away before what it opens comes in.
const SHEET_HANDOFF_MS = 260;
// The hero's poster, on the right of the title.
// The backdrop runs from the very top (under the status bar) down to this
// share of the screen's width, scaled to fill, then fades into the page.
const BACKDROP_HEIGHT = 1.05;
// How far the title reaches up onto the backdrop's fade.
const TITLE_OVERLAP = 132;
// The poster beside the title.
const HERO_POSTER_WIDTH = 104;
const SIMILAR_COUNT = 10;
// A "More like this" poster: about three and a half across, so the next one
// peeks in.
const SIMILAR_POSTER = 104;
// A cast card's width; its photo is a portrait under the name.
const CAST_CARD = 112;

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

// Until the server's "More like this" arrives (or without a connection):
// the same lead genre, best-rated first. The director's other films get
// their own "Also by" row, so they're left out.
const getSimilarMovies = (movie) =>
  getKnownMovies().filter(
    (other) =>
      other.id !== movie.id &&
      other.director !== movie.director &&
      other.genres[0] === movie.genres[0],
  )
    .sort(byWeightedRating)
    .slice(0, SIMILAR_COUNT);

// "More like this": the server's picks (GET /api/movies/:id/like — what
// its fans went on to like and what it's about, with feel, genres, story,
// cast and era behind them, backend lib/similar.js), nudged a little by
// your taste, films you've watched moved to the end. → [{ movie, reason,
// seen }]; `reason` one short line.
const TASTE_NUDGE = 0.5;
const getMoreLikeThis = (movie, similar, watched) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  if (!similar?.length) {
    return getSimilarMovies(movie).map((other) => ({
      movie: other,
      reason: null,
      seen: watchedIds.has(other.id),
    }));
  }
  const items = similar
    .map((item) => ({ ...item, movie: getMovieById(item.id) }))
    .filter((item) => item.movie);
  const matches = new Map(
    getTastePicks(watched, {
      from: items.map((item) => item.movie).filter((other) => !other.partial),
      count: items.length,
      random: () => 0,
    }).map((pick) => [pick.movie.id, pick.match]),
  );
  return items
    .map((item) => {
      const match = matches.get(item.movie.id);
      const nudge = match == null ? 0 : ((match - 75) / 25) * TASTE_NUDGE;
      return {
        movie: item.movie,
        reason: describeLike(item.reasons?.[0]),
        seen: watchedIds.has(item.movie.id),
        score: item.score + nudge,
      };
    })
    .sort((a, b) => a.seen - b.seen || b.score - a.score)
    .slice(0, SIMILAR_COUNT);
};

// Why a film is in "More like this", as a card's one line.
const describeLike = (reason) => {
  if (!reason) return null;
  switch (reason.key) {
    case "feel":
      return t("Same feel");
    case "story":
      return t("Similar story");
    case "topics":
      return t("About: {topics}", { topics: (reason.value ?? []).slice(0, 2).join(", ") });
    case "genres":
      return (reason.value ?? []).slice(0, 2).map((genre) => t(genre)).join(" · ");
    case "fans":
      return t("Fans of it love this");
    case "cast":
      return t("With {name}", { name: reason.value?.[0] ?? "" });
    case "era":
      return t("Same era");
    default:
      return null;
  }
};

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

// The page's tabs, under its actions.
const TABS = [
  { key: "overview", label: "Overview" },
  // Everyone's tiers and the critics' scores, together.
  { key: "tiering", label: "Tiering" },
  { key: "cast", label: "Cast & Crew" },
  { key: "similar", label: "Similar" },
];

// One of the hero's three actions under Trailer, as Apple Music's Play and
// Shuffle: a grey box with its icon and name in the signature colour —
// filled with it when it's on (saved, tonight's pick), green when done
// (watched).
const HeroButton = ({ Icon, label, a11yLabel, on = false, done = false, onPress, styles, colors }) => {
  const ink = done ? colors.success : on ? colors.brandText : colors.brand;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.heroButton,
        on && styles.heroButtonOn,
        done && styles.heroButtonDone,
        pressed && styles.actionPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ selected: on || done }}
    >
      <Icon size={18} color={ink} strokeWidth={2} />
      <Text style={[styles.heroButtonText, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
};

// Cinematic hero (the movie's backdrop — a still from the film — fading
// into the page): the title, year and director with Trailer and Tonight
// under them on the left, the poster on the right → the overview → three
// actions across (Watched, Watchlist or Tier, Board) → context that only
// shows when it applies (active challenge, your rating) → the tabs.
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
  // "More like this", from the server (see getMoreLikeThis).
  const like = useQuery({
    queryKey: ["movie", movieId, "like"],
    queryFn: () => api.get(`/movies/${movieId}/like`),
    staleTime: 60 * 60 * 1000,
  });
  // Everyone's tiers, for the ReelBoard score (and the community bars).
  const community = useMovieCommunity(movieId);
  const known = getMovieById(movieId);
  const movie = known && !known.partial ? known : null;
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const [expanded, setExpanded] = useState(false);
  // Which of the page's tabs is open.
  const [tab, setTab] = useState("overview");
  const { width: windowWidth } = useWindowDimensions();
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const inBucketList = useMovieStore((state) =>
    isInBucketList(state.bucketList, movieId),
  );
  const watched = useMovieStore((state) => state.watched);
  const bucketEntry = useMovieStore((state) =>
    state.bucketList.find((entry) => entry.movieId === movieId),
  );
  const toggleWatched = useMovieStore((state) => state.toggleWatched);
  const setWatchedDate = useMovieStore((state) => state.setWatchedDate);
  const isPicked = useMovieStore((state) => state.pickedMovie === movieId);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const activeChallenge = useChallengeStore((state) => state.activeChallenge);
  const isOnABoard = useBoardStore((state) =>
    state.boards.some((board) => board.movieIds.includes(movieId)),
  );
  const [isBoardSheetOpen, setIsBoardSheetOpen] = useState(false);
  // The ⋯ sheet: everything you can do with the film.
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  // Why it's the match it is.
  const [isMatchOpen, setIsMatchOpen] = useState(false);

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
  // The title sits in a column inside the hero's row, so its bottom in the
  // page is the row's top + the column's top + its own bottom.
  const titleParts = useRef({ row: 0, column: 0, title: null });
  const measureTitle = (part, value) => {
    titleParts.current[part] = value;
    const { row, column, title } = titleParts.current;
    if (title != null) setTitleBottom(row + column + title);
  };
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
  const backdropHeight = Math.round(windowWidth * BACKDROP_HEIGHT);
  const backdropStyle = useStretchyBackdropStyle(scrollY, backdropHeight);
  const heroFadeStyle = useHeroFadeStyle(scrollY, stickyEnd, { scale: false });
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

  // How well it fits your taste (not for movies you've watched).
  const tasteMatch = useMemo(
    () => getMovieMatch(watched, movie),
    [watched, movie],
  );
  // What watching it would do for you (not for movies you've watched): its
  // step in a collection ("Makes you Capo in Say Hello"), and for your
  // ranks — the same lines as Home's pick.
  const dareHistory = useChallengeStore((state) => state.history);
  const { sagaStep, forecast } = useMemo(() => {
    const seen = new Set(watched.map((entry) => entry.movieId));
    if (!movie || seen.has(movieId)) return { sagaStep: null, forecast: null };
    return {
      sagaStep: getSagaStep(movieId, seen),
      forecast: makeRankForecast(watched, countFinishedDares(dareHistory))(movie),
    };
  }, [watched, movie, movieId, dareHistory]);

  if (!movie) {
    return (
      <View style={[styles.container, styles.loading, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.loadingBar}>
          <BackButton onPress={() => navigation.goBack()} floating />
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
  const similarMovies = getMoreLikeThis(movie, like.data?.similar, watched);
  const directorMovies = getDirectorMovies(movie);
  const directorSaga = getSagaForPerson(movie.director);
  const sagaLine = describeSagaStep(sagaStep);
  const rankLine = forecast ? describeForecast(forecast) : null;
  const earnsRank = (forecast?.gained.length ?? 0) > 0;
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

  // The movie's own trailer (from TMDB), or a YouTube search without one.
  const handleWatchTrailer = () => {
    if (details?.trailer) {
      Linking.openURL(`https://www.youtube.com/watch?v=${details.trailer}`);
      return;
    }
    const query = encodeURIComponent(`${movie.title} ${movie.year} trailer`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
  };

  // With a link to its page, which anyone can open.
  const handleShare = () => {
    shareLink({
      type: "movie",
      id: movie.id,
      message: t("Check out {title} ({year}) on ReelBoard — rated {value}.", {
        title: movie.title,
        year: movie.year,
        value: movie.rating.toFixed(1),
      }),
    });
  };

  const headerTop = insets.top + spacing.sm;
  // The actions' icons: white on the slate; the page colour on the white
  // of an "on" one.
  // Close the ⋯ sheet, then (once it's slid away) do `action` — so a sheet
  // it opens doesn't stack on this one.
  const thenClose = (action) => () => {
    setIsActionsOpen(false);
    setTimeout(action, SHEET_HANDOFF_MS);
  };

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
            Its own frame across the top, scaled to fill. */}
        {(
          <Animated.View
            pointerEvents="none"
            style={[styles.backdrop, { height: backdropHeight }, backdropStyle]}
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
                      // A light shade at the top for the header buttons,
                      // the still itself clear, then a fade into the page.
                      `${colors.background}59`,
                      `${colors.background}00`,
                      `${colors.background}00`,
                      `${colors.background}B3`,
                      colors.background,
                    ]
                  : [
                      `${colors.background}14`,
                      `${colors.background}66`,
                      colors.background,
                    ]
              }
              locations={movie.backdrop ? [0, 0.22, 0.58, 0.85, 1] : [0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
        <View
          style={[
            styles.stage,
            {
              // The title starts on the backdrop's fade — never under the
              // header buttons.
              paddingTop: Math.max(
                headerTop + HEADER_BAR_HEIGHT + spacing.md,
                backdropHeight - TITLE_OVERLAP,
              ),
            },
          ]}
        >
          {/* Its name and facts over the backdrop's fade, its poster beside
              them on the right. */}
          <Animated.View
            style={[heroFadeStyle, styles.heroTop]}
            onLayout={(event) => measureTitle("row", event.nativeEvent.layout.y)}
          >
            <View style={styles.heroInfo}>
            <Text
              style={styles.title}
              accessibilityRole="header"
              onLayout={(event) => {
                const { y, height } = event.nativeEvent.layout;
                measureTitle("title", y + height);
              }}
            >
              {movie.title}
              {!!movie.year && <Text style={styles.titleYear}>{` (${movie.year})`}</Text>}
            </Text>
            {/* ★ rating · length · year. */}
            <View style={styles.heroFacts}>
              {movie.rating > 0 && (
                <View style={styles.heroScore}>
                  <Star size={14} color={colors.rating} fill={colors.rating} />
                  <Text style={styles.heroScoreText}>{movie.rating.toFixed(1)}</Text>
                  <Text style={styles.meta}>/ 10</Text>
                </View>
              )}
              <Text style={styles.meta} numberOfLines={1}>
                {[movie.runtime ? formatRuntime(movie.runtime) : null, movie.year]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            {/* Its age rating, boxed, then its genres. */}
            <View style={styles.heroFacts}>
              {details?.rated && (
                <View style={styles.ageBadge}>
                  <Text style={styles.ageText}>{details.rated}</Text>
                </View>
              )}
              <Text style={styles.meta} numberOfLines={1}>
                {(movie.genres ?? []).map((genre) => t(genre)).join(" · ")}
              </Text>
            </View>
            {/* The director (their collection, when they have one), and your
                taste match — tap it for why. */}
            <View style={styles.heroCredits}>
              {directorSaga ? (
                <Pressable
                  style={({ pressed }) => [styles.heroDirector, pressed && styles.actionPressed]}
                  onPress={() => navigation.push("CollectionDetails", { collectionId: directorSaga.id })}
                  accessibilityRole="link"
                  accessibilityHint={t("Opens {title}", { title: directorSaga.title })}
                  hitSlop={6}
                >
                  <Text style={styles.meta} numberOfLines={1}>
                    {t("Directed by")} <Text style={styles.director}>{movie.director}</Text>
                    <Text style={styles.directorMore}> ›</Text>
                  </Text>
                </Pressable>
              ) : (
                <Text style={[styles.meta, styles.heroDirector]} numberOfLines={1}>
                  {t("Directed by")} <Text style={styles.director}>{movie.director}</Text>
                </Text>
              )}
              {tasteMatch && (
                <Pressable
                  style={({ pressed }) => [styles.matchPill, pressed && styles.actionPressed]}
                  onPress={() => setIsMatchOpen(true)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={t("{match}% your taste", { match: tasteMatch.match })}
                  accessibilityHint={t("Why it fits you")}
                >
                  <Text style={styles.matchText} numberOfLines={1}>
                    {t("{match}% taste", { match: tasteMatch.match })}
                  </Text>
                  <ChevronRight size={14} color={colors.success} strokeWidth={2.4} style={rtl && styles.flipped} />
                </Pressable>
              )}
            </View>
            </View>
            <MoviePoster uri={movie.poster} style={styles.heroPoster} shadow />
          </Animated.View>

          {/* Trailer, the main button; then Tonight (or Rewatch), Watchlist
              (or Tier) and Watched — green once done. More (a list, the
              date) is the ⋯ at the top. */}
          <PrimaryButton
            label={t("Trailer")}
            icon={<Play size={16} color={colors.brandText} fill={colors.brandText} />}
            onPress={handleWatchTrailer}
            style={styles.trailerMain}
            contentStyle={styles.trailerMainContent}
          />
          <View style={styles.pageActions}>
            {isWatched ? (
              <HeroButton
                Icon={RotateCw}
                label={t("Rewatch")}
                onPress={() => rewatchMovieWithFeedback(movieId)}
                styles={styles}
                colors={colors}
              />
            ) : (
              <HeroButton
                Icon={TonightIcon}
                on={isPicked}
                label={t("Tonight")}
                a11yLabel={t("Pick for tonight")}
                onPress={() => togglePickedMovie(movie.id)}
                styles={styles}
                colors={colors}
              />
            )}
            {isWatched ? (
              <HeroButton
                Icon={ListOrdered}
                label={t("Tier")}
                onPress={() => navigation.navigate("TierMovie", { movieId })}
                styles={styles}
                colors={colors}
              />
            ) : (
              <HeroButton
                Icon={inBucketList ? BookmarkCheck : Bookmark}
                on={inBucketList}
                label={inBucketList ? t("Saved") : t("Watchlist")}
                onPress={() => toggleBucketListWithFeedback(movie.id)}
                styles={styles}
                colors={colors}
              />
            )}
            <HeroButton
              Icon={isWatched ? CheckCircle : Eye}
              done={isWatched}
              label={t("Watched")}
              a11yLabel={isWatched ? t("Watched") : t("Mark as watched")}
              onPress={handleToggleWatched}
              styles={styles}
              colors={colors}
            />
          </View>
          {!isWatched && isPicked && (
            <Text style={styles.noteText}>
              {t("Marking as watched will clear it as tonight's pick.")}
            </Text>
          )}
        </View>

        <View style={styles.content}>
          {/* Overview / Tiering / Cast & Crew / Similar: word tabs, the
              open one white and underlined — like the Profile's. They run
              edge to edge, so they step out of the page's margins. */}
          <UnderlineTabs
            tabs={TABS.map((item) => ({ key: item.key, label: t(item.label) }))}
            value={tab}
            onChange={setTab}
            style={styles.tabs}
          />

          {tab === "overview" && (
            <>
            {/* First: the tagline and the overview, then what's yours (a
                dare, your history). */}
            <View style={styles.overviewTop}>
            {/* What watching it does for you: a step in a collection, and
                for your ranks — each line whole, and a way in. */}
            {(sagaLine || rankLine) && (
              <View style={styles.gains}>
                {!!sagaLine && (
                  <Pressable
                    style={({ pressed }) => [styles.gain, pressed && styles.actionPressed]}
                    onPress={() => navigation.push("CollectionDetails", { collectionId: sagaStep.collection.id })}
                    accessibilityRole="button"
                  >
                    {sagaStep.type === "rank" ? (
                      <Crown size={16} color={colors.rating} strokeWidth={2} style={styles.gainIcon} />
                    ) : (
                      <Layers size={16} color={colors.collection} strokeWidth={2} style={styles.gainIcon} />
                    )}
                    <Text style={[styles.gainText, sagaStep.type === "rank" && styles.gainTextStrong]}>{sagaLine}</Text>
                    <ChevronRight size={16} color={colors.textMuted} strokeWidth={2.2} style={[styles.gainIcon, rtl && styles.flipped]} />
                  </Pressable>
                )}
                {!!rankLine && (
                  <Pressable
                    style={({ pressed }) => [styles.gain, pressed && styles.actionPressed]}
                    onPress={() => navigation.push("Ranks")}
                    accessibilityRole="button"
                  >
                    {earnsRank ? (
                      <Crown size={16} color={colors.rating} strokeWidth={2} style={styles.gainIcon} />
                    ) : (
                      <TrendingUp size={16} color={colors.rating} strokeWidth={2} style={styles.gainIcon} />
                    )}
                    <Text style={[styles.gainText, earnsRank && styles.gainTextStrong]}>{rankLine}</Text>
                    <ChevronRight size={16} color={colors.textMuted} strokeWidth={2.2} style={[styles.gainIcon, rtl && styles.flipped]} />
                  </Pressable>
                )}
              </View>
            )}
            {/* Its tagline in small caps, then the overview; the chevron for
                the rest. */}
            {!!details?.tagline && (
              <Text style={styles.tagline}>{details.tagline}</Text>
            )}
            <Text
              style={styles.description}
              numberOfLines={expanded ? undefined : DESCRIPTION_LINES}
              onTextLayout={(event) => {
                if (!expanded && event.nativeEvent.lines.length >= DESCRIPTION_LINES) {
                  setCanExpand(true);
                }
              }}
            >
              {movie.description}
            </Text>
            {canExpand && (
              <Pressable
                style={styles.expand}
                onPress={() => setExpanded((value) => !value)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={expanded ? t("Show less") : t("Read more")}
              >
                {expanded ? (
                  <ChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </Pressable>
            )}

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
                {/* Your tier: one button that opens the tiering screen (the
                    face and the slider), as everywhere else. */}
                {(() => {
                  const tierInfo = getTierInfo(getTier(watchedEntry));
                  return (
                    <Pressable
                      style={({ pressed }) => [styles.tierButton, pressed && styles.tierButtonPressed]}
                      onPress={() => navigation.navigate("TierMovie", { movieId })}
                      accessibilityRole="button"
                      accessibilityLabel={tierInfo ? t("Change your tier") : t("Tier it")}
                    >
                      <View
                        style={[
                          styles.tierTile,
                          tierInfo ? { backgroundColor: tierInfo.color } : styles.tierTileEmpty,
                        ]}
                      >
                        <Text style={[styles.tierTileLetter, !tierInfo && styles.tierTileLetterEmpty]}>
                          {tierInfo ? tierInfo.key : "?"}
                        </Text>
                      </View>
                      <View style={styles.tierButtonText}>
                        <Text style={styles.tierButtonTitle}>
                          {tierInfo ? t("{tier} tier", { tier: tierInfo.key }) : t("Tier it")}
                        </Text>
                        <Text style={styles.tierButtonHint} numberOfLines={1}>
                          {tierInfo ? t(tierInfo.meaning) : t("How was it? Slide from F to S")}
                        </Text>
                      </View>
                      <Text style={styles.tierButtonAction}>
                        {tierInfo ? t("Change") : t("Tier")} ›
                      </Text>
                    </Pressable>
                  );
                })()}
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
            </View>
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

            <Text style={styles.sectionLabel}>{t("Details")}</Text>
            <View style={styles.factsCard}>
              {facts.map((fact, index) => (
                <View
                  key={fact.label}
                  style={[
                    styles.factRow,
                  ]}
                >
                  <Text style={styles.factLabel}>{fact.label}</Text>
                  <Text style={styles.factValue}>{fact.value}</Text>
                </View>
              ))}
            </View>
            </>
          )}

          {/* Tiering: everyone's tiers (F to S, and the average), then the
              scores and awards under a line. */}
          {tab === "tiering" && (
            <>
            <TierHistogram
              movieId={movieId}
              style={styles.ratingsFirst}
              labelStyle={styles.ratingsLabel}
            />
            <Text style={styles.sectionLabel}>{t("Scores")}</Text>
            <ScoreRings scores={scores} />

            {details?.awards && (
              <View style={styles.awardsRow}>
                <Text style={styles.awardsText}>{details.awards}</Text>
              </View>
            )}

            </>
          )}

          {tab === "cast" && (
            <>
            {castPeople.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{t("Cast")}</Text>
                {/* A rail of big photo cards, edge to edge: who, who they
                    play, and their collection if they have one. */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.castRail}
                  contentContainerStyle={styles.castRailContent}
                >
                  {castPeople.map(({ name: actor, character, photo }) => {
                    const saga = getSagaForPerson(actor);
                    return (
                      <Pressable
                        key={actor}
                        style={({ pressed }) => [styles.castCard, pressed && styles.castCardPressed]}
                        onPress={() => openActor(actor)}
                        accessibilityRole="button"
                        accessibilityLabel={character ? `${actor}, ${character}` : actor}
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
                        <Text style={styles.castName} numberOfLines={2}>
                          {actor}
                        </Text>
                        {!!character && (
                          <Text style={styles.castCharacter} numberOfLines={1}>
                            {character}
                          </Text>
                        )}
                        {/* Actors with a collection name it — tapping opens it. */}
                        {saga && (
                          <Text style={styles.castSaga} numberOfLines={1}>
                            {saga.title}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
              {castPeople.length === 0 && directorMovies.length === 0 && (
                <Text style={styles.tabEmpty}>{t("No cast listed for this film.")}</Text>
              )}
            </>
          )}
        </View>

        {tab === "cast" && (
          <>
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
          </>
        )}

        {tab === "similar" && (
          <>
            {collections.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, styles.railLabel, styles.railFirst]}>
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
                          {t("{watched} of {total} watched", { watched: watchedCount, total })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
            {similarMovies.length > 0 && (
              <>
                {/* "See all" opens Decide's "More like…" for this movie: how
                    similar each is, and why. */}
                <View style={[styles.railHeader, collections.length === 0 && styles.railFirst]}>
                  <Text style={[styles.sectionLabel, styles.railHeaderLabel]} numberOfLines={1}>
                    {t("More like this")}
                  </Text>
                  <Pressable hitSlop={8} onPress={() => navigation.push("Similar", { movieId })}>
                    <Text style={styles.railHeaderLink} numberOfLines={1}>
                      {t("See why")} ›
                    </Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.posterRailContent}
                >
                  {similarMovies.map(({ movie: similar, reason, seen }) => (
                    <Pressable
                      key={similar.id}
                      style={styles.similarCard}
                      onPress={() =>
                        navigation.push("MovieDetails", { movieId: similar.id })
                      }
                    >
                      <MoviePoster
                        uri={similar.poster}
                        style={[styles.similarPoster, seen && styles.similarSeen]}
                      />
                      <Text style={styles.similarTitle} numberOfLines={1}>
                        {similar.title}
                      </Text>
                      <Text style={styles.similarYear} numberOfLines={1}>
                        {seen ? t("Watched") : similar.year}
                      </Text>
                      {!!reason && (
                        <Text style={styles.similarReason} numberOfLines={1}>
                          {reason}
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
            {collections.length === 0 && similarMovies.length === 0 && (
              <Text style={[styles.tabEmpty, styles.tabEmptyPadded]}>{t("Nothing similar yet.")}</Text>
            )}
          </>
        )}
      </Animated.ScrollView>

      <Animated.View
        style={[styles.headerBar, { top: headerTop }, floatingBarStyle]}
        pointerEvents="box-none"
      >
        <BackButton onPress={() => navigation.goBack()} floating />
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.headerRound, pressed && styles.actionPressed]}
            onPress={handleShare}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t("Share")}
          >
            <Share2 size={18} color={colors.textPrimary} strokeWidth={2} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerRound, pressed && styles.actionPressed]}
            onPress={() => setIsActionsOpen(true)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t("More")}
          >
            <Ellipsis size={20} color={colors.textPrimary} strokeWidth={2} />
          </Pressable>
        </View>
      </Animated.View>

      {/* More: the less common actions, as rows. One that opens something
          else closes this first. */}
      <BottomSheet
        visible={isActionsOpen}
        onClose={() => setIsActionsOpen(false)}
        size="auto"
        flush
        title={movie.title}
        subtitle={`${movie.year} · ${formatRuntime(movie.runtime)}`}
      >
        <View style={styles.sheetRows}>
          <Pressable
            style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
            onPress={thenClose(() => setIsBoardSheetOpen(true))}
            accessibilityRole="button"
          >
            <LayoutGrid size={20} color={colors.textSecondary} strokeWidth={1.9} />
            <Text style={styles.sheetRowText}>
              {isOnABoard ? t("On a list · change") : t("Add to a list")}
            </Text>
          </Pressable>
          {isWatched && (
            <Pressable
              style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
              onPress={thenClose(() => setIsDateSheetOpen(true))}
              accessibilityRole="button"
            >
              <CalendarDays size={20} color={colors.textSecondary} strokeWidth={1.9} />
              <Text style={styles.sheetRowText}>{t("Change when you watched it")}</Text>
            </Pressable>
          )}
        </View>
      </BottomSheet>

      <TasteMatchSheet
        visible={isMatchOpen}
        onClose={() => setIsMatchOpen(false)}
        match={tasteMatch}
        title={movie.title}
      />

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
        <BackButton onPress={() => navigation.goBack()} size={36} floating />
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
          onPress={() => setIsActionsOpen(true)}
          hitSlop={6}
          accessibilityLabel={t("More")}
        >
          <Ellipsis size={22} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Your taste match, under the title: a pill, and why.
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    matchPill: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
      backgroundColor: colors.successSoft,
      borderRadius: shape.control - 2,
    },
    matchText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.success,
    },
    ageBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderWidth: 1,
      borderColor: colors.textMuted,
      borderRadius: 4,
    },
    ageText: {
      ...typography.label,
      fontSize: 11,
      letterSpacing: 0.3,
      color: colors.textSecondary,
    },
    // Your tier, as one button: the tile in its colour, what it means,
    // and "Change" — it opens the tiering screen.
    tierButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.sm + 2,
      backgroundColor: colors.card,
      borderRadius: shape.control,
    },
    tierButtonPressed: {
      backgroundColor: colors.cardElevated,
    },
    tierTile: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: shape.control,
    },
    tierTileEmpty: {
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.textMuted,
    },
    tierTileLetter: {
      ...typography.hero,
      fontSize: 28,
      lineHeight: 34,
      color: "#0C0C0C",
    },
    tierTileLetterEmpty: {
      color: colors.textMuted,
    },
    tierButtonText: {
      flex: 1,
      gap: 2,
    },
    tierButtonTitle: {
      ...typography.bodyBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    tierButtonHint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    tierButtonAction: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 19,
      color: colors.textPrimary,
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
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    awardsText: {
      ...typography.caption,
      flex: 1,
      color: colors.textPrimary,
    },
    // First under the tabs: the same gap the other tabs' headings get.
    factChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    factChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: 7,
      backgroundColor: colors.card,
      borderRadius: shape.tab,
    },
    factChipText: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    // The cast rail cancels the page's side padding, so it reaches both
    // screen edges; each card is a tall photo with the name under it.
    castRail: {
      marginHorizontal: -spacing.md,
    },
    castRailContent: {
      gap: spacing.rail,
      paddingHorizontal: spacing.md,
    },
    castCard: {
      width: CAST_CARD,
    },
    castCardPressed: {
      opacity: 0.8,
    },
    castAvatar: {
      width: CAST_CARD,
      height: CAST_CARD * 1.3,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
      marginBottom: spacing.xs + 2,
      borderRadius: shape.control,
    },
    castPhoto: {
      width: CAST_CARD,
      height: CAST_CARD * 1.3,
    },
    castInitials: {
      ...typography.title,
      fontSize: 28,
      lineHeight: 38,
      color: colors.textPrimary,
    },
    castName: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.textPrimary,
    },
    castCharacter: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 1,
    },
    castMeta: {
      ...typography.caption,
      color: colors.textMuted,
    },
    castSaga: {
      ...typography.caption,
      color: colors.collection,
    },
    factsCard: {
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      overflow: "hidden",
    },
    factRow: {
      flexDirection: "row",
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
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
    // Share and ⋯, on the right: round, like the back button.
    headerActions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    headerRound: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
      borderRadius: 20,
    },
    stage: {
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
    // The film's name in the display serif.
    title: {
      ...typography.hero,
      fontFamily: fonts.display,
      fontSize: 31,
      lineHeight: 37,
      letterSpacing: -0.2,
      color: colors.textPrimary,
    },
    // "(2025)" after the name, lighter.
    // The name and facts on the left, the poster on the right.
    heroTop: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.md,
    },
    heroInfo: {
      flex: 1,
    },
    heroPoster: {
      width: HERO_POSTER_WIDTH,
      height: HERO_POSTER_WIDTH * 1.5,
    },
    titleYear: {
      ...typography.title,
      fontSize: 24,
      color: colors.textSecondary,
    },
    // A line of facts: the score, length and year; the age box and genres.
    heroFacts: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    heroScore: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    heroScoreText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },
    // "Directed by …" and the taste match, on one line.
    heroCredits: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      marginTop: spacing.sm + 2,
    },
    heroDirector: {
      flexShrink: 1,
    },
    director: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    directorMore: {
      color: colors.textSecondary,
    },
    // The tagline: caps, spaced, grey, over the overview.
    tagline: {
      ...typography.label,
      fontSize: 13,
      lineHeight: 20,
      letterSpacing: 1.4,
      textTransform: "uppercase",
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    // Ratings: first in the Tiering tab, the same gap other tabs' headings get.
    ratingsFirst: {
      marginTop: spacing.lg,
    },
    ratingsLabel: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    // "1h 47m", beside the trailer — small, to sit with it.
    meta: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 18,
      flexShrink: 1,
      color: colors.textSecondary,
    },
    tabs: {
      marginHorizontal: -spacing.md,
    },
    // The Overview tab's opening: the same gap the other tabs' headings get.
    overviewTop: {
      marginTop: spacing.lg,
    },
    // What watching it does for you: a card of lines above the tagline.
    gains: {
      marginBottom: spacing.lg,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      overflow: "hidden",
    },
    gain: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
    },
    gainIcon: {
      marginTop: 2,
    },
    gainText: {
      ...typography.body,
      flex: 1,
      color: colors.textSecondary,
    },
    gainTextStrong: {
      ...typography.bodyBold,
      color: colors.rating,
    },
    tabEmpty: {
      ...typography.body,
      color: colors.textMuted,
      marginTop: spacing.lg,
    },
    tabEmptyPadded: {
      paddingHorizontal: spacing.md,
    },
    expand: {
      alignSelf: "center",
      padding: spacing.xs,
      marginTop: spacing.xs,
    },
    content: {
      paddingHorizontal: spacing.md,
    },
    noteText: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.sm,
    },
    // Trailer: the main button, across the page.
    trailerMain: {
      marginTop: spacing.lg,
    },
    trailerMainContent: {
      minHeight: 48,
      borderRadius: shape.control,
    },
    // The three under it, sharing the row.
    pageActions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    heroButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minHeight: 46,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.buttonFill,
      borderRadius: shape.card,
    },
    heroButtonOn: {
      backgroundColor: colors.brand,
    },
    heroButtonDone: {
      backgroundColor: colors.successSoft,
    },
    heroButtonText: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 19,
      flexShrink: 1,
    },
    actionPressed: {
      opacity: 0.7,
    },
    // More's rows.
    sheetRows: {
      marginTop: spacing.xs,
    },
    sheetRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      // A step lighter than the sheet.
      backgroundColor: colors.surfaceSoft,
    },
    sheetRowPressed: {
      backgroundColor: colors.cardElevatedLight,
    },
    sheetRowText: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    challengeBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
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
      lineHeight: 19,
      color: colors.textPrimary,
      marginTop: 2,
    },
    ratingCard: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      gap: spacing.sm,
      borderRadius: shape.card,
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
      lineHeight: 16,
      color: colors.textPrimary,
      textDecorationLine: "underline",
    },
    // A section's name, as in Apple Music: big and bold, one even gap
    // above.
    sectionLabel: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      lineHeight: 27,
      letterSpacing: -0.3,
      color: colors.textPrimary,
      marginHorizontal: -spacing.md,
      paddingHorizontal: spacing.md,
      marginTop: 28,
      marginBottom: spacing.sm + 2,
    },
    // Straight under the hero.
    description: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    moreText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    // Outside the padded content: its own margins.
    railLabel: {
      marginHorizontal: 0,
      paddingHorizontal: spacing.md,
    },
    // The tab's first section, just under the tabs.
    railFirst: {
      marginTop: spacing.lg + 4,
    },
    railHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: 28,
      marginBottom: spacing.sm + 2,
    },
    // Inside a rail's header row, which has the gap.
    railHeaderLabel: {
      flexShrink: 1,
      marginHorizontal: 0,
      paddingHorizontal: 0,
      marginTop: 0,
      paddingTop: 0,
      marginBottom: 0,
    },
    // "See all" in the signature colour, as Apple Music's.
    railHeaderLink: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.brand,
    },
    railContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.rail,
    },
    // Poster rails: a little air between posters, a peek of the next one.
    posterRailContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.rail,
    },
    // A collection it's part of: a card — its name, how far you are.
    collectionChip: {
      width: 200,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      backgroundColor: colors.card,
      borderRadius: shape.card,
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
      borderRadius: shape.chip,
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
      width: SIMILAR_POSTER,
    },
    similarPoster: {
      width: SIMILAR_POSTER,
      aspectRatio: 2 / 3,
    },
    similarTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    similarYear: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    // Why it's here, in slate — "Same feel", "With Al Pacino".
    similarReason: {
      ...typography.caption,
      fontSize: 11,
      color: colors.rating,
      marginTop: 1,
    },
    similarSeen: {
      opacity: 0.5,
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
      backgroundColor: colors.headerBackground,
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

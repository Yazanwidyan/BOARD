import * as Haptics from "expo-haptics";
import { ChevronRight, Search } from "lucide-react-native";
import { useIsFocused } from "@react-navigation/native";
import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../components/AppText";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import { MoviePoster } from "../components/MoviePoster";
import { ReelsFeed } from "../components/ReelsFeed";
import {
  DockHeader,
  HeaderIconButton,
  ScrollHairline,
  useDockHeader,
} from "../components/ScreenHeader";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { useTrending } from "../store/communityStore";
import { useMovieStore } from "../store/movieStore";
import { useUserStore } from "../store/userStore";
import { spacing, TAB_BAR_CLEARANCE } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { RAIL_PREVIEW, buildDiscoverRails } from "../utils/discoverRails";
import { t, useIsRTL } from "../i18n";
import { FirstVisitTip } from "../components/FirstVisitTip";
import { useMoviesVersion } from "../data/movies";

// One row: title + "See all" (opens the full list in Browse), then just
// the posters — tap one for the film.
const DiscoverRail = ({ rail, first, navigation, styles, colors, posterWidth, rtl }) => {
  const openAll = () =>
    navigation.navigate("BrowseMovies", {
      title: rail.title,
      movieIds: rail.movies.map((movie) => movie.id),
    });

  return (
    <View style={[styles.rail, first && styles.railFirst]}>
      <View style={styles.railHeader}>
        <Text style={styles.railTitle} numberOfLines={1}>
          {rail.title}
        </Text>
        {rail.movies.length > RAIL_PREVIEW && (
          <Pressable style={styles.allLink} onPress={openAll} hitSlop={8}>
            <Text style={styles.allText}>{t("See all")}</Text>
            <ChevronRight size={16} color={colors.textSecondary} style={rtl && styles.flipped} />
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {rail.movies.slice(0, RAIL_PREVIEW).map((movie) => (
          <Pressable
            key={movie.id}
            style={({ pressed }) => [{ width: posterWidth }, pressed && styles.pressed]}
            onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
            accessibilityRole="button"
            accessibilityLabel={movie.title}
          >
            <MoviePoster uri={movie.poster} style={[styles.railPoster, { width: posterWidth }]} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

// Trending: everything trending on ReelBoard this week, three across.
const TrendingGrid = ({ movies, navigation, styles, posterWidth }) =>
  movies.length === 0 ? (
    <Text style={styles.empty}>{t("Nothing trending this week yet.")}</Text>
  ) : (
    <View style={styles.grid}>
      {movies.map((movie) => (
        <Pressable
          key={movie.id}
          style={({ pressed }) => [{ width: posterWidth }, pressed && styles.pressed]}
          onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel={movie.title}
        >
          <MoviePoster uri={movie.poster} style={[styles.railPoster, { width: posterWidth }]} />
        </Pressable>
      ))}
    </View>
  );

// Personal rows built from your history (see utils/discoverRails) — watched
// movies are never shown, so the page is always about something new.
export const DiscoverScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const preferences = useUserStore((state) => state.preferences);
  const { data: community, refetch: refetchCommunity } = useTrending();
  const header = useDockHeader();
  const rtl = useIsRTL();
  const { width } = useWindowDimensions();
  // A little under four posters across a rail, so the next one peeks in;
  // three across the Trending grid.
  const posterWidth = Math.round((width - spacing.md - spacing.sm * 3) / 3.7);
  const gridWidth = Math.floor((width - spacing.md * 2 - spacing.sm * 2) / 3);
  // Browse (the rails, the default), Reels (full-screen trailer clips) or
  // Trending (this week's most watched, as a grid).
  const [mode, setMode] = useState("browse");
  const isFocused = useIsFocused();

  // Memoized on what the rows actually depend on — "Recommended" is
  // shuffled, so rebuilding on every render (e.g. tapping + on a poster,
  // which changes the watchlist) would reorder it under your thumb.
  // Pull to refresh rebuilds them (bumping refreshCount) for a fresh shuffle.
  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const rails = useMemo(
    () => buildDiscoverRails({ watched, preferences, community }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watched, preferences, community, refreshCount],
  );
  const onRefresh = () => {
    setRefreshing(true);
    Haptics.selectionAsync();
    refetchCommunity();
    setRefreshCount((value) => value + 1);
    // Long enough for the spinner to read as a refresh.
    setTimeout(() => setRefreshing(false), 1100);
  };

  const modeSwitch = (
    <View style={[styles.modeBar, { paddingTop: header.barBottom }]}>
    <View style={styles.modeSwitch} accessibilityRole="tablist">
      {[
        ["browse", "Browse"],
        ["reels", "Reels"],
        ["trending", "Trending"],
      ].map(([key, label]) => {
        const active = mode === key;
        return (
          <Pressable
            key={key}
            style={[styles.modeOption, active && styles.modeOptionActive]}
            onPress={() => setMode(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.modeText, active && styles.modeTextActive]}>
              {t(label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
    <ScrollHairline scrollY={header.scrollY} />
    </View>
  );
  const searchButton = (
    <HeaderIconButton onPress={() => navigation.navigate("Search")} accessibilityLabel={t("Search")}>
      <Search size={22} color={colors.textPrimary} strokeWidth={1.75} />
    </HeaderIconButton>
  );
  const trending = rails.find((rail) => rail.key === "trending")?.movies ?? [];

  if (mode === "reels") {
    return (
      <SafeAreaView style={styles.reelsContainer} edges={[]}>
        {modeSwitch}
        <View style={styles.reelsArea}>
          <ReelsFeed
            navigation={navigation}
            active={isFocused}
            bottomInset={insets.bottom + TAB_BAR_CLEARANCE}
          />
        </View>
        <DockHeader title={t("Discover")} right={searchButton} hairline={false} />
        <FirstVisitTip id="discover" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Browse / Reels / Trending, pinned under the header. */}
      {modeSwitch}
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            // No logo in this header to spin: the system spinner.
            tintColor={colors.textSecondary}
            colors={[colors.textPrimary]}
            progressBackgroundColor={colors.card}
          />
        }
        contentContainerStyle={{
          // The usual gap under the tabs; the first rail adds none of its
          // own (styles.railFirst).
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
        showsVerticalScrollIndicator={false}
      >
        {mode === "trending" ? (
          <TrendingGrid
            movies={trending}
            navigation={navigation}
            styles={styles}
            posterWidth={gridWidth}
          />
        ) : (
          rails.map((rail, index) => (
            <DiscoverRail
              key={rail.key}
              rail={rail}
              first={index === 0}
              navigation={navigation}
              styles={styles}
              colors={colors}
              posterWidth={posterWidth}
              rtl={rtl}
            />
          ))
        )}
      </Animated.ScrollView>
      <ScreenBottomFade />
      <FirstVisitTip id="discover" />
      <DockHeader
        {...header.props}
        hairline={false}
        refreshing={refreshing}
        title={t("Discover")}
        right={searchButton}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    reelsContainer: {
      flex: 1,
      backgroundColor: "#000000",
    },
    reelsArea: {
      flex: 1,
    },
    // Browse / Reels / Trending: a dark track, the open one a slate pill.
    modeBar: {
      zIndex: 1,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: colors.headerBackground,
    },
    modeSwitch: {
      flexDirection: "row",
      gap: 2,
      padding: 2,
      backgroundColor: colors.segmentTrack,
      borderRadius: 6,
    },
    modeOption: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
      borderRadius: 7,
    },
    modeOptionActive: {
      backgroundColor: colors.segmentOn,
    },
    modeText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.segmentText,
    },
    modeTextActive: {
      color: colors.segmentOnText,
    },
    // A rail: a hairline across the page above it.
    rail: {
      marginTop: spacing.md + 4,
      paddingTop: spacing.md + 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    railFirst: {
      marginTop: 0,
      paddingTop: 0,
      borderTopWidth: 0,
    },
    railHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    // Rail names: small grey capitals, so the posters lead.
    railTitle: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: colors.textSecondary,
      flex: 1,
    },
    allLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 1,
    },
    allText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    railContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    pressed: {
      opacity: 0.75,
    },
    railPoster: {
      aspectRatio: 2 / 3,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      rowGap: spacing.md,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xxl,
      paddingHorizontal: spacing.xl,
    },
  });

export default DiscoverScreen;

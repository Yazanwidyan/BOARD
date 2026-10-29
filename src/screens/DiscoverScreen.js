import * as Haptics from "expo-haptics";
import { ChevronRight } from "lucide-react-native";
import { useIsFocused } from "@react-navigation/native";
import { useMemo, useState } from "react";
import {
  Image,
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
  useDockHeader,
} from "../components/ScreenHeader";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { useTrending } from "../store/communityStore";
import { useMovieStore } from "../store/movieStore";
import { spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { RAIL_PREVIEW, buildDiscoverRails } from "../utils/discoverRails";
import { t, useIsRTL } from "../i18n";
import { useTabBarClearance } from "../components/TonightBar";
import { useMoviesVersion } from "../data/movies";

// One row: its heading (opening the full list in Browse when there's more),
// then the posters — tap one for the film. A row built on one film or
// person ("More like…", "More from…") is Apple Music's: their poster or
// photo beside the heading, and bigger posters with a caption each.
const DiscoverRail = ({ rail, first, navigation, styles, colors, posterWidth, bigPosterWidth, rtl }) => {
  const openAll = () =>
    navigation.navigate("BrowseMovies", {
      title: rail.title,
      movieIds: rail.movies.map((movie) => movie.id),
    });

  // Its heading: its name big and bold, with a › when there's more than the
  // row shows (the whole heading opens it all).
  const hasMore = rail.movies.length > RAIL_PREVIEW;
  return (
    <View style={[styles.rail, first && styles.railFirst]}>
      <Pressable
        style={({ pressed }) => [styles.railHeader, pressed && hasMore && styles.pressed]}
        onPress={hasMore ? openAll : undefined}
        disabled={!hasMore}
        hitSlop={6}
        accessibilityRole={hasMore ? "button" : "header"}
      >
        {rail.lead ? (
          <View style={styles.moreLike}>
            {rail.thumb ? (
              rail.thumb.round ? (
                <Image source={{ uri: rail.thumb.uri }} style={styles.thumbRound} />
              ) : (
                <MoviePoster uri={rail.thumb.uri} style={styles.thumb} />
              )
            ) : null}
            <View style={styles.moreLikeWords}>
              <Text style={styles.moreLikeLead}>{t(rail.lead)}</Text>
              <View style={styles.railTitleRow}>
                <Text style={styles.railTitle} numberOfLines={1}>
                  {rail.name}
                </Text>
                {hasMore && (
                  <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.6} style={rtl && styles.flipped} />
                )}
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.railTitleRow}>
              <Text style={styles.railTitle} numberOfLines={2}>
                {rail.title}
              </Text>
              {hasMore && (
                <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.6} style={rtl && styles.flipped} />
              )}
            </View>
            {!!rail.subtitle && (
              <Text style={styles.railSubtitle} numberOfLines={2}>
                {t(rail.subtitle)}
              </Text>
            )}
          </>
        )}
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {rail.movies.slice(0, RAIL_PREVIEW).map((movie) => {
          const itemWidth = rail.lead ? bigPosterWidth : posterWidth;
          return (
            <Pressable
              key={movie.id}
              style={({ pressed }) => [{ width: itemWidth }, pressed && styles.pressed]}
              onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
              accessibilityRole="button"
              accessibilityLabel={movie.title}
            >
              <MoviePoster uri={movie.poster} style={[styles.railPoster, { width: itemWidth }]} />
              {!!rail.lead && (
                <>
                  <Text style={styles.captionTitle} numberOfLines={1}>
                    {movie.title}
                  </Text>
                  <Text style={styles.captionMeta} numberOfLines={1}>
                    {rail.key === "because" ? [movie.director, movie.year].filter(Boolean).join(" · ") : movie.year}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

// Personal rows built from your history (see utils/discoverRails) — watched
// movies are never shown, so the page is always about something new.
export const DiscoverScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarClearance();
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const { data: community, refetch: refetchCommunity } = useTrending();
  const header = useDockHeader();
  const rtl = useIsRTL();
  const { width } = useWindowDimensions();
  // A little under four posters across a rail, so the next one peeks in.
  const posterWidth = Math.round((width - spacing.md - spacing.rail * 3) / 3.7);
  // "More like…" rows: bigger, a little over two across.
  const bigPosterWidth = Math.round((width - spacing.md - spacing.rail * 2) / 2.3);
  // Browse (the rails, the default) or Reels (full-screen trailer clips).
  const [mode, setMode] = useState("browse");
  const isFocused = useIsFocused();

  // Memoized on what the rows actually depend on — "Recommended" is
  // shuffled, so rebuilding on every render (e.g. tapping + on a poster,
  // which changes the watchlist) would reorder it under your thumb.
  // Pull to refresh rebuilds them (bumping refreshCount) for a fresh shuffle.
  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const rails = useMemo(
    () => buildDiscoverRails({ watched, community }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watched, community, refreshCount],
  );
  const onRefresh = () => {
    setRefreshing(true);
    Haptics.selectionAsync();
    refetchCommunity();
    setRefreshCount((value) => value + 1);
    // Long enough for the spinner to read as a refresh.
    setTimeout(() => setRefreshing(false), 1100);
  };

  // Browse / Reels, in the header's capsule beside the title.
  const modeSwitch = (
    <View style={styles.modeSwitch} accessibilityRole="tablist">
      {[
        ["browse", "Browse"],
        ["reels", "Reels"],
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
  );

  if (mode === "reels") {
    return (
      <SafeAreaView style={styles.reelsContainer} edges={[]}>
        <View style={[styles.reelsArea, { paddingTop: header.barBottom }]}>
          <ReelsFeed
            navigation={navigation}
            active={isFocused}
            bottomInset={insets.bottom + tabBarClearance}
          />
        </View>
        <DockHeader title={t("Discover")} right={modeSwitch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            // No logo in this header to spin: the system spinner.
            progressViewOffset={header.barBottom}
            tintColor={colors.textSecondary}
            colors={[colors.textPrimary]}
            progressBackgroundColor={colors.card}
          />
        }
        contentContainerStyle={{
          // Under the header, with the usual gap; the first rail adds none
          // of its own (styles.railFirst).
          paddingTop: header.barBottom + spacing.underHeader,
          paddingBottom: insets.bottom + tabBarClearance,
        }}
        showsVerticalScrollIndicator={false}
      >
        {rails.map((rail, index) => (
          <DiscoverRail
            key={rail.key}
            rail={rail}
            first={index === 0}
            navigation={navigation}
            styles={styles}
            colors={colors}
            posterWidth={posterWidth}
            bigPosterWidth={bigPosterWidth}
            rtl={rtl}
          />
        ))}
      </Animated.ScrollView>
      <ScreenBottomFade />
      <DockHeader
        {...header.props}
        refreshing={refreshing}
        title={t("Discover")}
        right={modeSwitch}
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
    // Browse / Reels: inside the header's capsule (its track), the open
    // one a lighter pill.
    modeSwitch: {
      flexDirection: "row",
      gap: 2,
    },
    modeOption: {
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      borderRadius: 18,
    },
    modeOptionActive: {
      backgroundColor: colors.segmentOn,
    },
    modeText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.segmentText,
    },
    modeTextActive: {
      color: colors.segmentOnText,
    },
    // A rail: one even gap above it.
    // One even gap above each rail, as between Home's sections.
    rail: {
      marginTop: spacing.section,
    },
    railFirst: {
      marginTop: 0,
    },
    // A rail's heading: its name (and ›), and a line about it if it needs
    // one.
    railHeader: {
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm + 2,
    },
    railSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    railTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    // The same size as Home's section headings.
    railTitle: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      lineHeight: 27,
      letterSpacing: -0.3,
      flexShrink: 1,
      color: colors.textPrimary,
    },
    // "More like…": the thumbnail, then the grey lead over the name.
    moreLike: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    thumb: {
      width: 56,
      height: 56,
    },
    thumbRound: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.card,
    },
    moreLikeWords: {
      flex: 1,
    },
    moreLikeLead: {
      ...typography.body,
      fontFamily: fonts.medium,
      fontSize: 14,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    // Under a "More like…" poster: its name, then a grey line.
    captionTitle: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    captionMeta: {
      ...typography.body,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    railContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.rail,
    },
    pressed: {
      opacity: 0.75,
    },
    railPoster: {
      aspectRatio: 2 / 3,
    },
  });

export default DiscoverScreen;

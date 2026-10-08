import * as Haptics from "expo-haptics";
import { Check, Plus, Search } from "lucide-react-native";
import { useIsFocused } from "@react-navigation/native";
import { useMemo, useState } from "react";
import {
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
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
  HEADER_BAR_HEIGHT,
  HeaderIconButton,
  useDockHeader,
} from "../components/ScreenHeader";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { useMovieStore } from "../store/movieStore";
import { useUserStore } from "../store/userStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { toggleBucketListWithFeedback } from "../utils/achievementFeedback";
import { RAIL_PREVIEW, buildDiscoverRails } from "../utils/discoverRails";
import { isInBucketList } from "../utils/movieFilters";
import { t } from "../i18n";
import { FirstVisitTip } from "../components/FirstVisitTip";

// One row: title + "See all" (opens the full list in Browse), then posters
// with the IMDb rating and a one-tap save-to-watchlist button.
const DiscoverRail = ({ rail, bucketList, navigation, styles, colors }) => {
  const openAll = () =>
    navigation.navigate("BrowseMovies", {
      title: rail.title,
      movieIds: rail.movies.map((movie) => movie.id),
    });

  return (
    <View style={styles.rail}>
      <View style={styles.railHeader}>
        <Text style={styles.railTitle} numberOfLines={1}>
          {rail.title}
        </Text>
        {rail.movies.length > RAIL_PREVIEW && (
          <Pressable style={styles.allLink} onPress={openAll} hitSlop={8}>
            <Text style={styles.allText}>{t("See all")}</Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {rail.movies.slice(0, RAIL_PREVIEW).map((movie) => {
          const saved = isInBucketList(bucketList, movie.id);
          return (
            <Pressable
              key={movie.id}
              style={styles.railCard}
              onPress={() =>
                navigation.navigate("MovieDetails", { movieId: movie.id })
              }
            >
              <View>
                <MoviePoster uri={movie.poster} style={styles.railPoster} />
                <Pressable
                  style={[styles.saveButton, saved && styles.saveButtonSaved]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    toggleBucketListWithFeedback(movie.id);
                  }}
                  hitSlop={8}
                  accessibilityLabel={
                    saved ? t("Remove from watchlist") : t("Add to watchlist")
                  }
                >
                  {saved ? (
                    <Check
                      size={14}
                      color={colors.selectedText}
                      strokeWidth={3}
                    />
                  ) : (
                    <Plus size={15} color="#FFFFFF" strokeWidth={2.6} />
                  )}
                </Pressable>
              </View>
              <Text style={styles.railMovieTitle} numberOfLines={1}>
                {movie.title}
              </Text>
              <Text style={styles.railMovieYear}>{movie.year}</Text>
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
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const bucketList = useMovieStore((state) => state.bucketList);
  const watched = useMovieStore((state) => state.watched);
  const preferences = useUserStore((state) => state.preferences);
  const header = useDockHeader();
  // Reels (full-screen trailer clips, the default) or Browse (the rails).
  const [mode, setMode] = useState("reels");
  const isFocused = useIsFocused();

  // Memoized on what the rows actually depend on — "Recommended" is
  // shuffled, so rebuilding on every render (e.g. tapping + on a poster,
  // which changes the watchlist) would reorder it under your thumb.
  // Pull to refresh rebuilds them (bumping refreshCount) for a fresh shuffle.
  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const rails = useMemo(
    () => buildDiscoverRails({ watched, preferences }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watched, preferences, refreshCount],
  );
  const onRefresh = () => {
    setRefreshing(true);
    Haptics.selectionAsync();
    setRefreshCount((value) => value + 1);
    // Long enough for the title to fill and unfill once.
    setTimeout(() => setRefreshing(false), 1100);
  };

  const modeSwitch = (
    <View style={styles.modeSwitch}>
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
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (mode === "reels") {
    return (
      <SafeAreaView style={styles.reelsContainer} edges={[]}>
        <View
          style={[
            styles.reelsArea,
            { paddingTop: insets.top + HEADER_BAR_HEIGHT },
          ]}
        >
          <ReelsFeed
            navigation={navigation}
            active={isFocused}
            bottomInset={insets.bottom + TAB_BAR_CLEARANCE}
          />
        </View>
        <DockHeader title={t("Discover")} right={modeSwitch} />
        <FirstVisitTip id="discover" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        // Starts under the header bar so the refresh spinner shows below it.
        style={{ marginTop: header.barBottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            // iOS: no spinner — the header title fills instead.
            // Android can't report the pull, so it keeps its spinner.
            tintColor={
              Platform.OS === "ios" ? "transparent" : colors.textSecondary
            }
            colors={[colors.textPrimary]}
            progressBackgroundColor={colors.card}
          />
        }
        contentContainerStyle={{
          // Every rail brings its own top margin (styles.rail); pull back
          // the difference so the gap under the header matches other tabs.
          marginTop: spacing.md - spacing.lg,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
        showsVerticalScrollIndicator={false}
      >
        {rails.map((rail) => (
          <DiscoverRail
            key={rail.key}
            rail={rail}
            bucketList={bucketList}
            navigation={navigation}
            styles={styles}
            colors={colors}
          />
        ))}
      </Animated.ScrollView>
      <ScreenBottomFade />
      <FirstVisitTip id="discover" />
      <DockHeader
        {...header.props}
        refreshing={refreshing}
        title={t("Discover")}
        right={
          <>
            {modeSwitch}
            <HeaderIconButton onPress={() => navigation.navigate("Search")}>
              <Search size={22} color={colors.textPrimary} strokeWidth={1.75} />
            </HeaderIconButton>
          </>
        }
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
    // Browse / Reels, in the header.
    // Square filled boxes, like the Library filters — the open one white.
    modeSwitch: {
      flexDirection: "row",
      gap: 2,
    },
    modeOption: {
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: 6,
      backgroundColor: colors.card,
    },
    modeOptionActive: {
      backgroundColor: colors.selected,
    },
    modeText: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    modeTextActive: {
      color: colors.selectedText,
    },
    rail: {
      marginTop: spacing.lg,
    },
    railHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    railTitle: {
      ...typography.title,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.3,
      flex: 1,
      color: colors.textPrimary,
    },
    allLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 1,
    },
    allText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    railContent: {
      paddingHorizontal: spacing.md,
      gap: 2,
    },
    railCard: {
      width: 120,
    },
    railPoster: {
      width: 120,
      aspectRatio: 2 / 3,
    },
    railMovieTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
      marginTop: spacing.xs + 2,
    },
    railMovieYear: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    // Bottom-right of the poster: + to save, ✓ once it's on the watchlist.
    saveButton: {
      position: "absolute",
      end: 6,
      bottom: 6,
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.65)",
    },
    // Saved: a white square with a dark check.
    saveButtonSaved: {
      backgroundColor: colors.selected,
    },
  });

export default DiscoverScreen;

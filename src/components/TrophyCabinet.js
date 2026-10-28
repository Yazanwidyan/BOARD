import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useLanguageStore } from "../store/languageStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getCollectionCompletedAt, getCollectionProgress, getSagas } from "../utils/collections";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

// In a sideways row: each trophy's width.
const ROW_ITEM = 96;
// The ring around a medal, and the space between it and the posters.
const RING = 3;
const RING_GAP = 3;

// The collections fully watched in this watch history, newest first:
// [{ collection, finishedAt }].
export const getTrophies = (watched) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  return getSagas()
    .filter((collection) => {
      const progress = getCollectionProgress(collection, watchedIds);
      return progress.total > 0 && progress.progress === 1;
    })
    .map((collection) => ({ collection, finishedAt: getCollectionCompletedAt(collection, watched) }))
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
};

// A medal: the collection's first four posters in a circle, in a violet
// ring (the collections' colour).
const Medal = ({ collection, size, styles, colors }) => {
  const outer = size + (RING + RING_GAP) * 2;
  const cell = size / 2;
  return (
    <View style={{ width: outer, height: outer }}>
      <Svg width={outer} height={outer} style={StyleSheet.absoluteFill}>
        <Circle
          cx={outer / 2}
          cy={outer / 2}
          r={(outer - RING) / 2}
          stroke={colors.collection}
          strokeWidth={RING}
          fill="none"
        />
      </Svg>
      <View
        style={[
          styles.medal,
          { width: size, height: size, borderRadius: size / 2, margin: RING + RING_GAP },
        ]}
      >
        {[0, 1, 2, 3].map((index) => (
          <MoviePoster
            key={index}
            uri={getMovieById(collection.movieIds[index % collection.movieIds.length])?.poster}
            style={{ width: cell, height: cell }}
          />
        ))}
      </View>
    </View>
  );
};

// Trophies as a cabinet: a medal for each finished collection, its name and
// when you finished it under it. `finished`: [{ collection, finishedAt }]
// (getTrophies); `onOpen(collectionId)`. `columns`: how many across the
// width (they wrap); `row`: one sideways row you scroll instead, running to
// the screen's edges.
export const TrophyCabinet = ({ finished, onOpen, columns = 3, row = false }) => {
  // Re-render when the posters arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const language = useLanguageStore((state) => state.language);
  const [width, setWidth] = useState(0);
  const column = row ? ROW_ITEM : (width - spacing.md * (columns - 1)) / columns;
  const size = Math.max(0, column - (RING + RING_GAP) * 2);
  const thisYear = new Date().getFullYear();
  const dateOf = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(language === "ar" ? "ar" : "en", {
      month: "short",
      day: "numeric",
      ...(date.getFullYear() === thisYear ? {} : { year: "numeric" }),
    });
  };

  const medals = finished.map(({ collection, finishedAt }) => {
    const sub = finishedAt ? dateOf(finishedAt) : t("Completed");
    return (
      <Pressable
        key={collection.id}
        style={({ pressed }) => [styles.item, { width: column }, pressed && styles.pressed]}
        onPress={() => onOpen(collection.id)}
        accessibilityRole="button"
        accessibilityLabel={`${t(collection.title)}. ${sub}`}
      >
        <Medal collection={collection} size={size} styles={styles} colors={colors} />
        <Text style={styles.name} numberOfLines={2}>
          {t(collection.title)}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      </Pressable>
    );
  });

  if (row) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {medals}
      </ScrollView>
    );
  }
  return (
    <View style={styles.grid} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && medals}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: spacing.md,
      rowGap: spacing.lg,
    },
    row: {
      gap: spacing.md,
      paddingHorizontal: spacing.md,
    },
    item: {
      alignItems: "center",
    },
    pressed: {
      opacity: 0.7,
    },
    medal: {
      flexDirection: "row",
      flexWrap: "wrap",
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    name: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.sm,
    },
    // When it was finished: green, like the ring.
    sub: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      color: colors.success,
      textAlign: "center",
      marginTop: 2,
    },
  });

export default TrophyCabinet;

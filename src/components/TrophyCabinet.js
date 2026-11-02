import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useLanguageStore } from "../store/languageStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getCollectionCompletedAt, getCollectionProgress, getSagas } from "../utils/collections";
import { Text } from "./AppText";
import { GOLD, Laurel, PEWTER } from "./icons/Laurel";
import { MoviePoster } from "./MoviePoster";

// In a sideways row: each trophy's width.
const ROW_ITEM = 104;
// The posters' disc, as a share of the wreath round it.
const DISC = 0.6;

// Every saga's trophy — the won ones (newest first), then the rest, the
// closest to won first: [{ collection, finishedAt } | { collection,
// progress: { watchedCount, total } }].
export const getAllTrophies = (watched) => {
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const toWin = getSagas()
    .map((collection) => ({ collection, progress: getCollectionProgress(collection, watchedIds) }))
    .filter(({ progress }) => progress.total > 0 && progress.progress < 1)
    .sort((a, b) => b.progress.progress - a.progress.progress || a.progress.total - b.progress.total);
  return [...getTrophies(watched), ...toWin];
};

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

// A trophy: the collection's first four posters in a gold-rimmed disc,
// crowned with a film festival's laurels (components/icons/Laurel).
// `locked`: not won yet — pewter, the posters dimmed.
const Medal = ({ collection, size, locked, styles }) => {
  const disc = Math.round(size * DISC);
  const cell = disc / 2;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.medal,
          { width: disc, height: disc, borderRadius: disc / 2, top: (size - disc) / 2, start: (size - disc) / 2 },
          locked && styles.medalLocked,
        ]}
      >
        {[0, 1, 2, 3].map((index) => (
          <MoviePoster
            key={index}
            tile
            uri={getMovieById(collection.movieIds[index % collection.movieIds.length])?.poster}
            style={[{ width: cell, height: cell }, locked && styles.posterLocked]}
          />
        ))}
      </View>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Laurel size={size} muted={locked} />
      </View>
    </View>
  );
};

// Trophies as a cabinet: a medal for each finished collection, its name and
// when you finished it under it. `finished`: [{ collection, finishedAt }]
// (getTrophies) — or, with getAllTrophies, also the ones not won yet
// ({ collection, progress }), in pewter with how far along you are.
// `onOpen(collectionId)`. `columns`: how many across the
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
  const size = Math.max(0, column);
  const thisYear = new Date().getFullYear();
  const dateOf = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(language === "ar" ? "ar" : "en", {
      month: "short",
      day: "numeric",
      ...(date.getFullYear() === thisYear ? {} : { year: "numeric" }),
    });
  };

  const medals = finished.map(({ collection, finishedAt, progress }) => {
    const locked = !!progress;
    const sub = locked
      ? t("{watched} of {total}", { watched: progress.watchedCount, total: progress.total })
      : finishedAt
        ? dateOf(finishedAt)
        : t("Completed");
    return (
      <Pressable
        key={collection.id}
        style={({ pressed }) => [styles.item, { width: column }, pressed && styles.pressed]}
        onPress={() => onOpen(collection.id)}
        accessibilityRole="button"
        accessibilityLabel={`${t(collection.title)}. ${sub}`}
      >
        <Medal collection={collection} size={size} locked={locked} styles={styles} />
        <Text style={[styles.name, locked && styles.nameLocked]} numberOfLines={2}>
          {t(collection.title)}
        </Text>
        <Text style={[styles.sub, locked && styles.subLocked]} numberOfLines={1}>
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
      position: "absolute",
      flexDirection: "row",
      flexWrap: "wrap",
      overflow: "hidden",
      borderWidth: 2,
      borderColor: GOLD[1],
      backgroundColor: colors.card,
    },
    name: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    medalLocked: {
      borderColor: PEWTER[1],
    },
    posterLocked: {
      opacity: 0.35,
    },
    nameLocked: {
      color: colors.textSecondary,
    },
    subLocked: {
      color: colors.textMuted,
    },
    // When it was finished: in the laurels' gold.
    sub: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      color: GOLD[1],
      textAlign: "center",
      marginTop: 2,
    },
  });

export default TrophyCabinet;

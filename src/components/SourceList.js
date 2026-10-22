import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  Compass,
  Dices,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react-native";
import { Fragment, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { t, useIsRTL } from "../i18n";
import { loadCandidates } from "../services/movieData";
import { useDecideStore } from "../store/decideStore";
import { useUserStore } from "../store/userStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { SOURCES, TASTE_SOURCES } from "../utils/decidePools";
import { ALL_GENRES, DECADE_RANGES, RUNTIME_RANGES } from "../utils/movieFilters";
import { useSourceSummaries } from "../utils/useDecidePool";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";

const ICONS = {
  taste: Sparkles,
  anything: Dices,
  outside: Compass,
  watchlist: Bookmark,
  board: LayoutGrid,
  filters: SlidersHorizontal,
};
const ICON = 20;
const FAN_POSTER = 30;
// Filters reach the server's candidates a beat after you stop tapping.
const LOAD_DELAY_MS = 400;

// Three posters leaning on each other at the end of a row.
const Fan = ({ movies, styles }) => (
  <View style={styles.fan} pointerEvents="none">
    {movies.slice(0, 3).map((movie, index) => (
      <MoviePoster
        key={movie.id}
        uri={movie.poster}
        style={[styles.fanPoster, { zIndex: 3 - index, marginStart: index === 0 ? 0 : -16 }]}
      />
    ))}
  </View>
);

const Chip = ({ label, selected, onPress, styles }) => (
  <Pressable
    style={[styles.filterChip, selected && styles.filterChipOn]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    <Text style={[styles.filterChipText, selected && styles.filterChipTextOn]}>{label}</Text>
  </Pressable>
);

// Genre, decade and runtime — the Swipe setup's filters (your account's
// preferences), right in the list.
const FilterPanel = ({ styles }) => {
  const preferences = useUserStore((state) => state.preferences);
  const setPreferences = useUserStore((state) => state.setPreferences);
  const key = JSON.stringify(preferences);
  useEffect(() => {
    const timer = setTimeout(() => loadCandidates().catch(() => {}), LOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [key]);

  const toggleGenre = (genre) =>
    setPreferences({
      genres: preferences.genres.includes(genre)
        ? preferences.genres.filter((item) => item !== genre)
        : [...preferences.genres, genre],
    });

  return (
    <View style={styles.panel}>
      <Text style={styles.panelLabel}>{t("Genres")}</Text>
      <View style={styles.filterChips}>
        {ALL_GENRES.map((genre) => (
          <Chip
            key={genre}
            label={t(genre)}
            selected={preferences.genres.includes(genre)}
            onPress={() => toggleGenre(genre)}
            styles={styles}
          />
        ))}
      </View>
      <Text style={styles.panelLabel}>{t("Decade")}</Text>
      <View style={styles.filterChips}>
        {Object.keys(DECADE_RANGES).map((decade) => (
          <Chip
            key={decade}
            label={t(decade)}
            selected={preferences.decade === decade}
            onPress={() => setPreferences({ decade })}
            styles={styles}
          />
        ))}
      </View>
      <Text style={styles.panelLabel}>{t("Runtime")}</Text>
      <View style={styles.filterChips}>
        {Object.keys(RUNTIME_RANGES).map((runtime) => (
          <Chip
            key={runtime}
            label={t(runtime)}
            selected={preferences.runtime === runtime}
            onPress={() => setPreferences({ runtime })}
            styles={styles}
          />
        ))}
      </View>
    </View>
  );
};

// What a filter set reads as in its row: "Action, Drama · 1990s".
const describeFilters = (preferences) => {
  const parts = [
    preferences.genres.map((genre) => t(genre)).join(", "),
    preferences.decade !== "Any" ? t(preferences.decade) : null,
    preferences.runtime !== "Any" ? t(preferences.runtime) : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
};

// Where Swipe or Wildcard draws from, as big Settings-style rows edge to
// edge: an icon, the source and a line about it, a fan of three of its
// posters, and a chevron. Tapping one goes (`onGo(source, boardId)`);
// "A board" opens your boards under it and "Filters" the genre / decade /
// runtime chips with a go button (`goLabel(count)`). The last one you used
// is marked. `kind`: "swipe" or "wildcard"; `least`: how many films a
// source needs to be usable.
export const SourceList = ({ kind, active, least = 1, onGo, goLabel }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const rtl = useIsRTL();
  const summaries = useSourceSummaries(active);
  const last = useDecideStore((state) => state[kind]);
  const preferences = useUserStore((state) => state.preferences);
  const [open, setOpen] = useState(null);

  if (!summaries) return null;
  const { coldStart } = summaries;
  const boards = summaries.boards.filter((item) => item.count >= least);

  // Why a source can't be used right now, or null.
  const blockedBy = (key) => {
    if (TASTE_SOURCES.includes(key) && coldStart) return t("Tier a few movies first");
    if (key === "watchlist" && summaries.watchlist.count < least) return t("Save a few movies first");
    if (key === "board" && boards.length === 0) return t("No boards with films to pick yet");
    return null;
  };

  const lineFor = (key) => {
    const { count } = summaries[key];
    if (key === "watchlist") return t("{count} saved, unwatched", { count });
    if (key === "board") return t("{count} boards", { count: boards.length });
    if (key === "filters") return describeFilters(preferences) ?? t(SOURCES.find((item) => item.key === key).hint);
    return t(SOURCES.find((item) => item.key === key).hint);
  };

  const chevron = (down) =>
    down ? (
      <ChevronDown size={18} color={colors.textMuted} />
    ) : (
      <ChevronRight size={18} color={colors.textMuted} style={rtl && styles.flipped} />
    );

  return (
    <View style={styles.list}>
      {SOURCES.map((source, index) => {
        const Icon = ICONS[source.key];
        const blocked = blockedBy(source.key);
        const expands = source.key === "board" || source.key === "filters";
        const isOpen = open === source.key;
        const isLast = last.source === source.key;
        const movies =
          source.key === "board" ? summaries.board.movies : summaries[source.key].movies;
        return (
          <Fragment key={source.key}>
            {index > 0 && <View style={styles.separator} />}
            <Pressable
              style={({ pressed }) => [styles.row, pressed && !blocked && styles.rowPressed, blocked && styles.rowOff]}
              onPress={() => {
                if (blocked) return;
                if (expands) setOpen(isOpen ? null : source.key);
                else onGo(source.key, null);
              }}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!blocked, expanded: expands ? isOpen : undefined }}
            >
              <Icon size={ICON} color={colors.textSecondary} strokeWidth={1.9} />
              <View style={styles.rowText}>
                <View style={styles.labelRow}>
                  <Text style={styles.label} numberOfLines={1}>
                    {t(source.label)}
                  </Text>
                  {isLast && !blocked && (
                    <View style={styles.lastTag}>
                      <Text style={styles.lastTagText}>{t("Last used")}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.hint} numberOfLines={1}>
                  {blocked ?? lineFor(source.key)}
                </Text>
              </View>
              {!blocked && movies.length > 0 && <Fan movies={movies} styles={styles} />}
              {!blocked && chevron(expands && isOpen)}
            </Pressable>

            {/* Your boards, one row each. */}
            {source.key === "board" && isOpen &&
              boards.map(({ board, count, movies: boardMovies }) => (
                <Pressable
                  key={board.id}
                  style={({ pressed }) => [styles.subRow, pressed && styles.rowPressed]}
                  onPress={() => onGo("board", board.id)}
                  accessibilityRole="button"
                >
                  <View style={styles.rowText}>
                    <Text style={styles.subLabel} numberOfLines={1}>
                      {board.name}
                    </Text>
                    <Text style={styles.hint}>{t("{count} unwatched", { count })}</Text>
                  </View>
                  <Fan movies={boardMovies} styles={styles} />
                  {chevron(false)}
                </Pressable>
              ))}

            {/* Filters, then go. */}
            {source.key === "filters" && isOpen && (
              <View style={styles.filtersOpen}>
                <FilterPanel styles={styles} />
                <View style={styles.goWrap}>
                  <PrimaryButton
                    label={
                      summaries.filters.count >= least
                        ? goLabel(summaries.filters.count)
                        : t("No films match these filters — try fewer.")
                    }
                    disabled={summaries.filters.count < least}
                    onPress={() => onGo("filters", null)}
                  />
                </View>
              </View>
            )}
          </Fragment>
        );
      })}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    list: {
      backgroundColor: colors.card,
      borderRadius: shape.card,
      marginHorizontal: spacing.md,
      overflow: "hidden",
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginStart: spacing.md + ICON + spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 68,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    rowPressed: {
      backgroundColor: colors.cardElevated,
    },
    rowOff: {
      opacity: 0.45,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    label: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    lastTag: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      backgroundColor: `${colors.rating}29`,
      borderRadius: shape.chip,
    },
    lastTagText: {
      ...typography.bodyBold,
      fontSize: 10,
      lineHeight: 14,
      color: colors.rating,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    // Board rows sit under "A board", indented past its icon.
    subRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 60,
      paddingStart: spacing.md + ICON + spacing.md,
      paddingEnd: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    subLabel: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    fan: {
      flexDirection: "row",
    },
    fanPoster: {
      width: FAN_POSTER,
      height: FAN_POSTER * 1.5,
      borderWidth: 1,
      borderColor: colors.card,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    filtersOpen: {
      backgroundColor: colors.background,
      paddingBottom: spacing.md,
    },
    panel: {
      paddingHorizontal: spacing.md,
    },
    panelLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    filterChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    filterChip: {
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: shape.chip,
    },
    filterChipOn: {
      backgroundColor: colors.selected,
    },
    filterChipText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    filterChipTextOn: {
      color: colors.selectedText,
    },
    goWrap: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
    },
  });

export default SourceList;

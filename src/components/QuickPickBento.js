import { LinearGradient } from "expo-linear-gradient";
import { Dices, Heart, Layers, Sparkles, Users, Waves } from "lucide-react-native";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "./AppText";

import { MOVIES, getCatalogVersion } from "../data/movies";
import { spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";
import { t } from "../i18n";
import { byWeightedRating } from "../utils/movieFilters";

const GAP = 2;
const HERO_HEIGHT = 176;
const TILE_HEIGHT = 150;
// Posters across the hero, and across each small tile.
const HERO_POSTERS = 4;
const TILE_POSTERS = 2;
const INK = "#FFFFFF";

// Highest-rated titles fill the tiles — picked once per catalog load (the
// catalog comes from the server after start-up), a different handful for
// each tile.
let showcase = null;
const getShowcase = () => {
  const version = getCatalogVersion();
  if (showcase?.version !== version) {
    const posters = [...MOVIES]
      .sort(byWeightedRating)
      .slice(0, HERO_POSTERS + TILE_POSTERS * 4)
      .map((movie) => movie.poster);
    const take = (start, count) => posters.slice(start, start + count);
    showcase = {
      version,
      ai: take(0, HERO_POSTERS),
      swipe: take(HERO_POSTERS, TILE_POSTERS),
      wildcard: take(HERO_POSTERS + 2, TILE_POSTERS),
      night: take(HERO_POSTERS + 4, TILE_POSTERS),
      similar: take(HERO_POSTERS + 6, TILE_POSTERS),
    };
  }
  return showcase;
};

// One tile: posters side by side filling it, a dark fade up from the
// bottom, and its name (with an icon) in white over the fade. `overlay`:
// anything drawn on the posters (the Wildcard's "?", Movie night's heart).
const PosterTile = ({ posters, width, height, Icon, label, onPress, blur, overlay, big, styles }) => {
  const posterWidth = width / Math.max(1, posters.length);
  return (
    <Pressable
      style={({ pressed }) => [{ width, height }, styles.tile, pressed && styles.tilePressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.posters} pointerEvents="none">
        {posters.map((uri) => (
          <MoviePoster
            key={uri}
            uri={uri}
            blurRadius={blur}
            style={{ width: posterWidth, height }}
          />
        ))}
      </View>
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {overlay && (
        <View style={styles.overlay} pointerEvents="none">
          {overlay}
        </View>
      )}
      <View style={styles.label} pointerEvents="none">
        <Icon size={big ? 20 : 17} color={INK} strokeWidth={2} />
        <Text style={[styles.labelText, big && styles.labelTextBig]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

// Decide's ways to pick, as poster tiles: Ask AI across the top, then
// Swipe, Wildcard, Movie night and More like… two by two. Each is filled
// edge to edge with real posters, its name over a dark fade — no more to
// read than that. Square, 2px apart.
export const QuickPickBento = ({ onAI, onSwipe, onWildcard, onMovieNight, onSimilar }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const half = (width - GAP) / 2;
  const posters = getShowcase();

  return (
    <View style={styles.grid}>
      <PosterTile
        posters={posters.ai}
        width={width}
        height={HERO_HEIGHT}
        Icon={Sparkles}
        label={t("Ask AI")}
        onPress={onAI}
        big
        styles={styles}
      />
      <View style={styles.row}>
        <PosterTile
          posters={posters.swipe}
          width={half}
          height={TILE_HEIGHT}
          Icon={Layers}
          label={t("Swipe")}
          onPress={onSwipe}
          styles={styles}
        />
        {/* The Wildcard is a surprise: its posters blurred, a "?" on top. */}
        <PosterTile
          posters={posters.wildcard}
          width={half}
          height={TILE_HEIGHT}
          Icon={Dices}
          label={t("Wildcard")}
          onPress={onWildcard}
          blur={14}
          overlay={<Text style={styles.mystery}>?</Text>}
          styles={styles}
        />
      </View>
      {(onMovieNight || onSimilar) && (
        <View style={styles.row}>
          {onMovieNight && (
            <PosterTile
              posters={posters.night}
              width={half}
              height={TILE_HEIGHT}
              Icon={Users}
              label={t("Movie night")}
              onPress={onMovieNight}
              overlay={
                <View style={styles.heart}>
                  <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              }
              styles={styles}
            />
          )}
          {onSimilar && (
            <PosterTile
              posters={posters.similar}
              width={half}
              height={TILE_HEIGHT}
              Icon={Waves}
              label={t("More like…")}
              onPress={onSimilar}
              overlay={
                <View style={styles.likeBadge}>
                  <Text style={styles.likeBadgeText}>92%</Text>
                </View>
              }
              styles={styles}
            />
          )}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Edge to edge (cancels the section padding), 2px apart.
    grid: {
      gap: GAP,
      marginHorizontal: -spacing.md,
    },
    row: {
      flexDirection: "row",
      gap: GAP,
    },
    tile: {
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    tilePressed: {
      opacity: 0.85,
    },
    posters: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: "row",
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      position: "absolute",
      start: spacing.sm + 4,
      end: spacing.sm + 4,
      bottom: spacing.sm + 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    labelText: {
      ...typography.title,
      fontSize: 17,
      lineHeight: 22,
      color: INK,
      flexShrink: 1,
    },
    labelTextBig: {
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.4,
    },
    mystery: {
      fontFamily: fonts.extraBold,
      fontSize: 52,
      lineHeight: 60,
      color: colors.rating,
      marginBottom: 24,
    },
    heart: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.success,
      marginBottom: 24,
    },
    likeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.rating,
      marginBottom: 24,
    },
    likeBadgeText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: "#0C1014",
      fontVariant: ["tabular-nums"],
    },
  });

export default QuickPickBento;

import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import Svg, { Path } from "react-native-svg";
import { Heart } from "lucide-react-native";

import { MOVIES, getCatalogVersion } from "../data/movies";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";
import { t } from "../i18n";
import { byWeightedRating } from "../utils/movieFilters";

// The Wildcard tile's mini slot reel — a random draw: a window with three
// posters — the middle one framed — and a marker either side.
const REEL_POSTER_WIDTH = 54;
const REEL_POSTER_HEIGHT = REEL_POSTER_WIDTH * 1.5;
const REEL_WINDOW_HEIGHT = 124;
const REEL_GAP = 2;

// Highest-rated titles make the decorative posters — picked once per
// catalog load (the catalog comes from the server after start-up).
let showcase = null;
const getShowcase = () => {
  const version = getCatalogVersion();
  if (showcase?.version !== version) {
    const posters = [...MOVIES]
      .sort(byWeightedRating)
      .slice(0, 8)
      .map((movie) => movie.poster);
    showcase = {
      version,
      ai: posters.slice(0, 2),
      swipe: posters.slice(2, 5),
      reel: posters.slice(5, 8),
      night: posters.slice(0, 2),
    };
  }
  return showcase;
};

const MiniReel = ({ colors, styles }) => {
  const slotTop = (REEL_WINDOW_HEIGHT - REEL_POSTER_HEIGHT) / 2;
  return (
    <View style={styles.reel}>
      <Svg width={8} height={12}>
        <Path d="M0 0 L8 6 L0 12 Z" fill={colors.textPrimary} />
      </Svg>
      <View style={styles.reelWindow}>
        <View
          style={[
            styles.reelStrip,
            { top: slotTop - REEL_POSTER_HEIGHT - REEL_GAP },
          ]}
        >
          {getShowcase().reel.map((uri) => (
            <MoviePoster key={uri} uri={uri} style={styles.reelPoster} />
          ))}
        </View>
        {/* Neighbours fade into the tile above and below. */}
        <LinearGradient
          colors={[colors.card, `${colors.card}00`]}
          style={[styles.reelFade, { top: 0 }]}
        />
        <LinearGradient
          colors={[`${colors.card}00`, colors.card]}
          style={[styles.reelFade, { bottom: 0 }]}
        />
        <View style={[styles.reelFrame, { top: slotTop - 2 }]} />
      </View>
      <Svg width={8} height={12}>
        <Path d="M8 0 L0 6 L8 12 Z" fill={colors.textPrimary} />
      </Svg>
    </View>
  );
};

// Decide's Quick Pick as a bento: the taste pick as the full-width hero —
// a filled tile with real posters bleeding in from the right — and Swipe /
// Wildcard as tall tiles that each preview what they do (a fanned poster
// stack, a slot reel), then Movie night across the bottom — two posters
// leaning into a heart where they meet, and More like… under it. Square,
// edge to edge, 2px apart.
export const QuickPickBento = ({ onAI, onSwipe, onWildcard, onMovieNight, onSimilar }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.grid}>
      <Pressable style={styles.aiGlow} onPress={onAI}>
        <View style={styles.aiTile}>
          <View style={styles.aiPosters} pointerEvents="none">
            {getShowcase().ai.map((uri, index) => (
              <MoviePoster
                key={uri}
                uri={uri}
                style={[
                  styles.aiPoster,
                  index === 0 ? styles.aiPosterBack : styles.aiPosterFront,
                ]}
              />
            ))}
            {/* Posters fade into the card on their left edge. */}
            <LinearGradient
              colors={[colors.card, `${colors.card}00`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.7, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View style={styles.aiText}>
            <Text style={styles.aiEyebrow}>{t("Taste pick")}</Text>
            <Text style={styles.aiTitle}>{t("Let ReelBoard choose")}</Text>
            <Text style={styles.aiSubtitle}>{t("Based on your taste")}</Text>
            <Text style={styles.aiCtaText}>{t("Pick for me")}</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.halfRow}>
        <Pressable style={styles.halfTile} onPress={onSwipe}>
          <View style={styles.preview}>
            {getShowcase().swipe.map((uri, index) => (
              <MoviePoster
                key={uri}
                uri={uri}
                style={[styles.fanPoster, FAN_POSITIONS[index]]}
              />
            ))}
          </View>
          <Text style={styles.halfTitle}>{t("Swipe")}</Text>
          <Text style={styles.halfSubtitle}>{t("Ten to narrow down")}</Text>
        </Pressable>

        <Pressable style={styles.halfTile} onPress={onWildcard}>
          <View style={styles.preview}>
            <MiniReel colors={colors} styles={styles} />
          </View>
          <Text style={styles.halfTitle}>{t("Wildcard")}</Text>
          <Text style={styles.halfSubtitle}>{t("One film, dealt at random")}</Text>
        </Pressable>
      </View>

      {onMovieNight && (
        <Pressable style={styles.nightTile} onPress={onMovieNight}>
          <View style={styles.nightText}>
            <Text style={styles.aiEyebrow}>{t("For two")}</Text>
            <Text style={styles.halfTitle}>{t("Movie night")}</Text>
            <Text style={styles.halfSubtitle}>
              {t("Swipe the same stack, see your matches")}
            </Text>
          </View>
          <View style={styles.nightPreview} pointerEvents="none">
            {getShowcase().night.map((uri, index) => (
              <MoviePoster
                key={uri}
                uri={uri}
                style={[
                  styles.nightPoster,
                  index === 0 ? styles.nightPosterLeft : styles.nightPosterRight,
                ]}
              />
            ))}
            <View style={styles.nightHeart}>
              <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        </Pressable>
      )}

      {/* More like…: one poster, and how alike the next one is. */}
      {onSimilar && (
        <Pressable style={styles.nightTile} onPress={onSimilar}>
          <View style={styles.nightText}>
            <Text style={styles.aiEyebrow}>{t("Find similar")}</Text>
            <Text style={styles.halfTitle}>{t("More like…")}</Text>
            <Text style={styles.halfSubtitle}>
              {t("Pick one you loved — see how alike, and why")}
            </Text>
          </View>
          <View style={styles.nightPreview} pointerEvents="none">
            {getShowcase().swipe.slice(0, 2).map((uri, index) => (
              <MoviePoster
                key={uri}
                uri={uri}
                style={[
                  styles.nightPoster,
                  index === 0 ? styles.nightPosterLeft : styles.nightPosterRight,
                ]}
              />
            ))}
            <View style={styles.likeBadge}>
              <Text style={styles.likeBadgeText}>92%</Text>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );
};

const FAN_POSTER_WIDTH = 62;

// Left / right cards tilt out and sit lower; the middle one is raised and
// drawn last so it's on top.
const FAN_POSITIONS = [
  {
    transform: [{ translateX: -38 }, { translateY: 10 }, { rotate: "-12deg" }],
  },
  { transform: [{ translateX: 38 }, { translateY: 10 }, { rotate: "12deg" }] },
  { transform: [{ translateY: -4 }], zIndex: 1 },
];

const createStyles = (colors) =>
  StyleSheet.create({
    // Edge to edge (cancels the section padding), square, 2px apart.
    grid: {
      gap: 2,
      marginHorizontal: -spacing.md,
    },
    aiGlow: {},
    aiTile: {
      backgroundColor: colors.card,
      padding: spacing.md,
      overflow: "hidden",
      minHeight: 156,
    },
    aiPosters: {
      position: "absolute",
      top: 0,
      end: 0,
      bottom: 0,
      width: 190,
    },
    aiPoster: {
      position: "absolute",
      width: 92,
      aspectRatio: 2 / 3,
    },
    aiPosterBack: {
      top: 10,
      end: 70,
      transform: [{ rotate: "-8deg" }],
      opacity: 0.8,
    },
    aiPosterFront: {
      top: 26,
      end: -10,
      transform: [{ rotate: "7deg" }],
    },
    aiText: {
      maxWidth: "58%",
    },
    aiEyebrow: {
      ...typography.caption,
      color: colors.textMuted,
    },
    aiTitle: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    aiSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    // A plain text action — the whole tile is the button.
    aiCtaText: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    halfRow: {
      flexDirection: "row",
      gap: 2,
    },
    // Flat, solid, square tiles.
    halfTile: {
      flex: 1,
      backgroundColor: colors.card,
      padding: spacing.md,
      overflow: "hidden",
    },
    // Mini slot reel. Physical left-to-right so the markers point in.
    reel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      direction: "ltr",
    },
    reelWindow: {
      width: REEL_POSTER_WIDTH,
      height: REEL_WINDOW_HEIGHT,
      overflow: "hidden",
    },
    reelStrip: {
      position: "absolute",
      left: 0,
      gap: REEL_GAP,
    },
    reelPoster: {
      width: REEL_POSTER_WIDTH,
      height: REEL_POSTER_HEIGHT,
    },
    reelFade: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 26,
    },
    reelFrame: {
      position: "absolute",
      left: 0,
      right: 0,
      height: REEL_POSTER_HEIGHT + 4,
      borderWidth: 2,
      borderColor: colors.textPrimary,
    },
    preview: {
      height: 128,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    fanPoster: {
      position: "absolute",
      width: FAN_POSTER_WIDTH,
      aspectRatio: 2 / 3,
    },
    nightTile: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      padding: spacing.md,
      overflow: "hidden",
    },
    nightText: {
      flex: 1,
    },
    nightPreview: {
      width: 104,
      height: 84,
      alignItems: "center",
      justifyContent: "center",
    },
    nightPoster: {
      position: "absolute",
      width: 48,
      aspectRatio: 2 / 3,
    },
    nightPosterLeft: {
      transform: [{ translateX: -20 }, { rotate: "-10deg" }],
    },
    nightPosterRight: {
      transform: [{ translateX: 20 }, { rotate: "10deg" }],
    },
    likeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      backgroundColor: colors.rating,
    },
    likeBadgeText: {
      ...typography.bodyBold,
      fontSize: 11,
      color: "#0C1014",
      fontVariant: ["tabular-nums"],
    },
    nightHeart: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.success,
    },
    halfTitle: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    halfSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });

export default QuickPickBento;

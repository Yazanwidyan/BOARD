import { LinearGradient } from "expo-linear-gradient";
import { Dna, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { t } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

// How long each slide shows, and how often its bar moves on.
const SLIDE_MS = 5000;
const TICK_MS = 50;
// Taps on this share of the screen's left go back; the rest go on.
const BACK_ZONE = 0.3;

// A highlight, story-style (Instagram's): one slide at a time, full screen
// — its film's still softened behind, its poster (or, for Taste, the word)
// in the middle, what it is under it — with a bar per slide at the top.
// Tap the right to go on, the left to go back, hold to pause; past the last
// slide it moves to the next highlight, then closes. A slide with a film,
// collection or board has a button to open it.
// params: { highlights (utils/highlights), start: the highlight to open }.
export const HighlightScreen = ({ navigation, route }) => {
  const { highlights = [], start = 0 } = route.params ?? {};
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [at, setAt] = useState({ highlight: start, slide: 0 });
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const highlight = highlights[at.highlight];
  const slide = highlight?.slides[at.slide];

  const goTo = (next) => {
    setProgress(0);
    setAt(next);
  };
  const forward = () => {
    if (!highlight) return;
    if (at.slide < highlight.slides.length - 1) goTo({ ...at, slide: at.slide + 1 });
    else if (at.highlight < highlights.length - 1) goTo({ highlight: at.highlight + 1, slide: 0 });
    else navigation.goBack();
  };
  const back = () => {
    if (at.slide > 0) goTo({ ...at, slide: at.slide - 1 });
    else if (at.highlight > 0) goTo({ highlight: at.highlight - 1, slide: 0 });
    else setProgress(0);
  };

  // The bar fills; a full bar moves on.
  useEffect(() => {
    if (paused || !slide) return undefined;
    const timer = setInterval(() => {
      setProgress((value) => Math.min(1, value + TICK_MS / SLIDE_MS));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused, slide]);
  useEffect(() => {
    if (progress >= 1) forward();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  if (!slide) return null;

  const openSlide = () => {
    if (slide.movieId) navigation.push("MovieDetails", { movieId: slide.movieId });
    else if (slide.collectionId) navigation.push("CollectionDetails", { collectionId: slide.collectionId });
    else if (slide.board?.own) navigation.push("BoardDetails", { boardId: slide.board.id });
    else if (slide.board) {
      navigation.push("BrowseMovies", { title: slide.board.name, movieIds: slide.board.movieIds });
    }
  };

  return (
    <View style={styles.container}>
      {!!slide.image && (
        <Image
          key={`${highlight.key}-${slide.key}`}
          source={{ uri: slide.image }}
          blurRadius={slide.poster || slide.blur ? 24 : 0}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Tap to go on or back; hold to pause. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(event) => (event.nativeEvent.locationX < width * BACK_ZONE ? back() : forward())}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        delayLongPress={200}
        accessibilityRole="button"
        accessibilityLabel={t("Next")}
      />

      {/* The bars, and whose highlight it is. */}
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <View style={styles.bars}>
          {highlight.slides.map((item, index) => (
            <View key={item.key} style={styles.bar}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${(index < at.slide ? 1 : index === at.slide ? progress : 0) * 100}%`,
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.highlightName} numberOfLines={1}>
            {highlight.label}
          </Text>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel={t("Close")}>
            <X size={26} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {/* The poster, or for Taste the icon — then what it is. */}
      <View style={styles.middle} pointerEvents="none">
        {slide.poster ? (
          <View>
            <MoviePoster uri={slide.poster} shadow style={{ width: width * 0.58, aspectRatio: 2 / 3 }} />
            {slide.tier && (
              <View style={[styles.tierBadge, { backgroundColor: slide.tierColor }]}>
                <Text style={styles.tierBadgeText}>{slide.tier}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.iconCircle}>
            <Dna size={44} color="#FFFFFF" strokeWidth={1.6} />
          </View>
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]} pointerEvents="box-none">
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {slide.title}
        </Text>
        {!!slide.line && (
          <Text style={styles.line} numberOfLines={2}>
            {slide.line}
          </Text>
        )}
        {(slide.movieId || slide.collectionId || slide.board) && (
          <PrimaryButton
            label={
              slide.movieId ? t("View film") : slide.collectionId ? t("View collection") : t("View list")
            }
            onPress={openSlide}
            style={styles.action}
          />
        )}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000000",
    },
    top: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      paddingHorizontal: spacing.md,
      gap: spacing.sm + 2,
    },
    bars: {
      flexDirection: "row",
      gap: 4,
    },
    bar: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.3)",
      overflow: "hidden",
    },
    barFill: {
      height: 3,
      backgroundColor: "#FFFFFF",
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    highlightName: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: "#FFFFFF",
      flexShrink: 1,
    },
    middle: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 120,
    },
    tierBadge: {
      position: "absolute",
      top: -12,
      start: -12,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: "#000000",
    },
    tierBadgeText: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 26,
      color: "#0C1014",
    },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.12)",
    },
    bottom: {
      position: "absolute",
      start: 0,
      end: 0,
      bottom: 0,
      paddingHorizontal: spacing.lg,
      gap: 4,
    },
    eyebrow: {
      ...typography.label,
      fontSize: 12,
      letterSpacing: 1,
      color: "rgba(255,255,255,0.7)",
    },
    title: {
      ...typography.hero,
      fontSize: 30,
      lineHeight: 36,
      color: "#FFFFFF",
    },
    line: {
      ...typography.body,
      color: "rgba(255,255,255,0.8)",
    },
    action: {
      marginTop: spacing.md,
      borderRadius: shape.control,
    },
  });

export default HighlightScreen;

import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import { Share2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getTierInfo } from "../utils/tiers";
import { BottomSheet } from "./BottomSheet";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";
import { WatcherCard } from "./WatcherCard";

const CARD_WIDTH = 340;
const FAVORITE_POSTERS = 5;
const POSTER_GAP = 6;
const BACKDROP_POSTERS = 4;
const BACKDROP_HEIGHT = 260;

const insightText = (insight) => {
  if (!insight) return null;
  return insight.mostWatched === insight.mostLoved
    ? `${insight.mostWatched} is what I watch most — and what I tier highest.`
    : `I watch ${insight.mostWatched} most, but ${insight.mostLoved} gets my best tiers.`;
};

// The shareable taste image: the Watcher card on top (level, badges,
// numbers), then taste — the watch-most-vs-love-most line, top genres with
// their usual tier, and the first five favorites. Rendered as a real view
// so it can be captured to a PNG and shared (Instagram, WhatsApp…).
export const TasteShareSheet = ({
  visible,
  onClose,
  cardProps,
  taste,
  fallbackMessage,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const imageRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);
  const posterWidth =
    (CARD_WIDTH - spacing.md * 4 - POSTER_GAP * (FAVORITE_POSTERS - 1)) /
    FAVORITE_POSTERS;
  const insight = insightText(taste.tasteInsight);
  const favorites = taste.favorites.slice(0, FAVORITE_POSTERS);

  const shareImage = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const uri = await captureRef(imageRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "My Reelboard taste card",
          UTI: "public.png",
        });
      } else {
        await Share.share({ message: fallbackMessage });
      }
    } catch {
      // Capture can fail on some devices — the text version still goes out.
      await Share.share({ message: fallbackMessage });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      size="full"
      title="Share your taste card"
      subtitle="This is the image that gets shared"
      footer={
        <PrimaryButton
          label={isSharing ? "Preparing…" : "Share image"}
          icon={<Share2 size={16} color="#FFFFFF" />}
          disabled={isSharing}
          onPress={shareImage}
        />
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.previewWrap}
      >
        {/* collapsable={false} so Android keeps a real native view for
            react-native-view-shot to capture. */}
        <View ref={imageRef} collapsable={false} style={styles.image}>
          {/* Background: your top-ten posters, blurred, fading into the
              page colour — or, before you've picked any, a soft deep-blue
              tint. */}
          {favorites.length > 0 ? (
            <View style={styles.backdrop} pointerEvents="none">
              {favorites.slice(0, BACKDROP_POSTERS).map(({ movie }) => (
                <MoviePoster
                  key={movie.id}
                  uri={movie.poster}
                  blurRadius={18}
                  style={styles.backdropPoster}
                />
              ))}
              <LinearGradient
                colors={[`${colors.background}73`, colors.background]}
                locations={[0, 1]}
                style={StyleSheet.absoluteFill}
              />
            </View>
          ) : (
            <LinearGradient
              colors={["#1E2A42", colors.background]}
              locations={[0, 0.55]}
              style={StyleSheet.absoluteFill}
            />
          )}
          <WatcherCard mode="share" {...cardProps} />

          {(insight || taste.genreTiers.length > 0 || favorites.length > 0) && (
            <View style={styles.tastePanel}>
              <Text style={styles.sectionLabel}>TASTE</Text>
              {insight && <Text style={styles.insight}>{insight}</Text>}
              {taste.genreTiers.length > 0 && (
                <View style={styles.genreRow}>
                  {taste.genreTiers.map(({ genre, typicalTier }) => (
                    <View key={genre} style={styles.genreChip}>
                      <Text style={styles.genreText}>{genre}</Text>
                      {typicalTier && (
                        <Text
                          style={[
                            styles.genreTier,
                            { color: getTierInfo(typicalTier).color },
                          ]}
                        >
                          {typicalTier}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
              {favorites.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, styles.favoritesLabel]}>
                    FAVORITES
                  </Text>
                  <View style={styles.posterRow}>
                    {favorites.map(({ movie }) => (
                      <MoviePoster
                        key={movie.id}
                        uri={movie.poster}
                        radius={0}
                        style={{
                          width: posterWidth,
                          height: posterWidth * 1.5,
                        }}
                      />
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          <Text style={styles.brand}>on Reelboard</Text>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    previewWrap: {
      alignItems: "center",
      paddingBottom: spacing.md,
    },
    image: {
      width: CARD_WIDTH,
      padding: spacing.md,
      borderRadius: radius.lg,
      overflow: "hidden",
      backgroundColor: colors.background,
    },
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: BACKDROP_HEIGHT,
      flexDirection: "row",
      overflow: "hidden",
    },
    backdropPoster: {
      flex: 1,
      height: "100%",
      opacity: 0.6,
    },
    tastePanel: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
      letterSpacing: 1.2,
    },
    insight: {
      ...typography.body,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    genreRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs + 2,
      marginTop: spacing.sm,
    },
    genreChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSoft,
    },
    genreText: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    genreTier: {
      ...typography.bodyBold,
      fontSize: 13,
    },
    favoritesLabel: {
      marginTop: spacing.md,
    },
    posterRow: {
      flexDirection: "row",
      gap: POSTER_GAP,
      marginTop: spacing.sm,
    },
    brand: {
      ...typography.label,
      color: colors.accentLight,
      marginTop: spacing.md,
      alignSelf: "flex-end",
    },
  });

export default TasteShareSheet;

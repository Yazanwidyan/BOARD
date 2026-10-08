import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import { Share2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { ScrollView, Share, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import { captureRef } from "react-native-view-shot";

import { useProfileStore } from "../store/profileStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { BottomSheet } from "./BottomSheet";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";
import { t } from "../i18n";

const CARD_WIDTH = 340;
const COLUMNS = 3;
const MAX_POSTERS = 9;
const POSTER_GAP = 4;
const BACKDROP_HEIGHT = 220;

// A board as a shareable image: its name big over its own posters,
// blurred, then up to nine posters in a grid and "+N more" if there are
// more. Rendered as a real view so it can be captured to a PNG — the same
// way the taste card is shared.
export const BoardShareSheet = ({ visible, onClose, board, movies }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const displayName = useProfileStore((state) => state.displayName);
  const imageRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  if (!board) return null;

  const shown = movies.slice(0, MAX_POSTERS);
  const more = movies.length - shown.length;
  const posterWidth =
    (CARD_WIDTH - spacing.md * 2 - POSTER_GAP * (COLUMNS - 1)) / COLUMNS;
  const fallbackMessage = [
    `${board.name} — ${t("a board on ReelBoard")}`,
    ...movies.map((movie) => `• ${movie.title} (${movie.year})`),
  ].join("\n");

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
          dialogTitle: board.name,
          UTI: "public.png",
        });
      } else {
        await Share.share({ message: fallbackMessage });
      }
    } catch {
      // Capture can fail on some devices — the text list still goes out.
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
      title={t("Share board")}
      subtitle={t("This is the image that gets shared")}
      footer={
        <PrimaryButton
          label={isSharing ? t("Preparing…") : t("Share image")}
          icon={<Share2 size={16} color={colors.accentContrast} />}
          disabled={isSharing || movies.length === 0}
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
          <View style={styles.backdrop} pointerEvents="none">
            {shown.slice(0, 4).map((movie) => (
              <MoviePoster
                key={movie.id}
                uri={movie.poster}
                blurRadius={18}
                style={styles.backdropPoster}
              />
            ))}
            <LinearGradient
              colors={[`${colors.background}66`, colors.background]}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <Text style={styles.eyebrow}>
            {t("{name}'s board", { name: displayName })}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {board.name}
          </Text>
          <Text style={styles.count}>
            {t("{count} movies", { count: movies.length })}
          </Text>

          <View style={styles.grid}>
            {shown.map((movie, index) => (
              <View key={movie.id}>
                <MoviePoster
                  uri={movie.poster}
                  style={{ width: posterWidth, height: posterWidth * 1.5 }}
                />
                {more > 0 && index === shown.length - 1 && (
                  <View style={styles.moreOverlay}>
                    <Text style={styles.moreText}>+{more}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <Text style={styles.brand}>{t("on ReelBoard")}</Text>
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
      paddingTop: spacing.xl,
      overflow: "hidden",
      backgroundColor: colors.background,
    },
    backdrop: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      height: BACKDROP_HEIGHT,
      flexDirection: "row",
      overflow: "hidden",
    },
    backdropPoster: {
      flex: 1,
      height: "100%",
      opacity: 0.7,
    },
    eyebrow: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    title: {
      ...typography.display,
      fontSize: 32,
      lineHeight: 38,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    count: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: POSTER_GAP,
      marginTop: spacing.lg,
    },
    // On a poster, so fixed dark + white.
    moreOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    moreText: {
      ...typography.title,
      fontSize: 22,
      color: "#FFFFFF",
    },
    brand: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: spacing.md,
      alignSelf: "flex-end",
    },
  });

export default BoardShareSheet;

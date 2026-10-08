import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import { Share2, Trophy } from "lucide-react-native";
import { useRef, useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import { captureRef } from "react-native-view-shot";

import { useMovieStore } from "../store/movieStore";
import { useShareCardStore } from "../store/shareCardStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  getCollectionById,
  getCollectionCompletedAt,
} from "../utils/collections";
import { getLevel, getUserXP } from "../utils/xp";
import { BottomSheet } from "./BottomSheet";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";
import { t } from "../i18n";

const CARD_WIDTH = 320;
const GRID_COLUMNS = 5;
const MAX_POSTERS = 10;
const GRID_GAP = 4;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// "I've seen all 10 Quentin Tarantino films" — honest about the count
// (it's every one *in the catalog*, not a full filmography).
export const bragHeadline = (collection) => {
  const count = collection.movies.length;
  if (collection.type === "director") {
    return t("I've seen all {count} {title} films", {
      count,
      title: collection.title,
    });
  }
  if (collection.type === "actor") {
    return t("I've seen all {count} {title} movies", {
      count,
      title: collection.title,
    });
  }
  return t("I've seen all {count} {title} movies", {
    count,
    title: collection.title,
  });
};

// The brag card: the collection's posters in a grid, the headline, when it
// was finished, and the watcher's level — rendered as a real view so it
// can be captured to an image and shared (Instagram, WhatsApp…). Mounted
// once at the root; open it with openShareCard(collectionId).
export const CompletionShareSheet = () => {
  const colors = useColors();
  const styles = createStyles(colors);
  const collectionId = useShareCardStore((state) => state.collectionId);
  const closeShareCard = useShareCardStore((state) => state.closeShareCard);
  const watched = useMovieStore((state) => state.watched);
  const cardRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);
  // Remembered so the sheet's content doesn't vanish while it slides away.
  const [lastId, setLastId] = useState(null);
  if (collectionId && collectionId !== lastId) setLastId(collectionId);

  const collection = lastId ? getCollectionById(lastId) : null;
  const completedAt = collection
    ? getCollectionCompletedAt(collection, watched)
    : null;
  const level = getLevel(getUserXP(watched));
  const cell =
    (CARD_WIDTH - spacing.md * 2 - GRID_GAP * (GRID_COLUMNS - 1)) /
    GRID_COLUMNS;

  const shareImage = async () => {
    if (!collection || isSharing) return;
    setIsSharing(true);
    try {
      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: bragHeadline(collection),
          UTI: "public.png",
        });
      } else {
        await Share.share({ message: `${bragHeadline(collection)} 🏆` });
      }
    } catch {
      // Capture/share can fail on some devices — fall back to text so the
      // brag still goes out.
      await Share.share({
        message: t("{collection} 🏆 — on ReelBoard", {
          collection: bragHeadline(collection),
        }),
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <BottomSheet
      visible={!!collectionId}
      onClose={closeShareCard}
      size="auto"
      title={t("Share your completion")}
      subtitle={t("This is the image that gets shared")}
      footer={
        <PrimaryButton
          label={isSharing ? t("Preparing…") : t("Share image")}
          icon={<Share2 size={16} color={colors.accentContrast} />}
          disabled={isSharing}
          onPress={shareImage}
        />
      }
    >
      {collection && (
        <View style={styles.previewWrap}>
          {/* collapsable={false} so Android keeps a real native view for
              react-native-view-shot to capture. */}
          <View ref={cardRef} collapsable={false} style={styles.card}>
            <LinearGradient
              colors={[colors.cardElevatedLight, colors.background]}
              locations={[0, 0.75]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.grid}>
              {collection.movies.slice(0, MAX_POSTERS).map((movie) => (
                <MoviePoster
                  key={movie.id}
                  uri={movie.poster}
                  style={{ width: cell, height: cell * 1.5 }}
                />
              ))}
            </View>
            <View style={styles.trophyRow}>
              <Trophy size={18} color={colors.rating} />
              <Text style={styles.completed}>{t("Completed")}</Text>
            </View>
            <Text style={styles.headline}>{bragHeadline(collection)}</Text>
            <Text style={styles.meta}>
              {completedAt
                ? t("Finished {completedAt}", {
                    completedAt: formatDate(completedAt),
                  })
                : t("Every one, start to finish")}
              {"  ·  "}
              {t("Level")} {level.level} · {level.name}
            </Text>
            <Text style={styles.brand}>{t("on ReelBoard")}</Text>
          </View>
        </View>
      )}
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    previewWrap: {
      alignItems: "center",
      paddingBottom: spacing.md,
    },
    card: {
      width: CARD_WIDTH,
      padding: spacing.md,
      overflow: "hidden",
      backgroundColor: colors.background,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GRID_GAP,
    },
    trophyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.lg,
    },
    completed: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.rating,
    },
    headline: {
      ...typography.hero,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    brand: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: spacing.md,
      alignSelf: "flex-end",
    },
  });

export default CompletionShareSheet;

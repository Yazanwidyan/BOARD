import { ArrowRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getCollectionProgress } from "../utils/collections";

const EYEBROWS = {
  franchise: "FRANCHISE",
  director: "DIRECTOR",
  decade: "DECADE",
  genre: "GENRE",
};

// Same nested double-card frame and info styling as Tonight's Pick, so the
// two Home cards read as one family. Shared by the Collections tab's
// "Continue" spot and Home's "Continue a Collection" rail.
const FRAME_PADDING = 4;

export const CollectionContinueCard = ({ collection, watchedIds, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { watchedCount, total, progress } = getCollectionProgress(
    collection,
    watchedIds,
  );

  return (
    <View style={styles.frame}>
      <Pressable style={styles.card} onPress={onPress}>
        <View style={styles.info}>
          <Text style={styles.eyebrow}>
            {EYEBROWS[collection.type] ?? "COLLECTION"}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {collection.title}
          </Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {watchedCount} / {total} watched
          </Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
        <View style={styles.arrowButton}>
          <ArrowRight size={18} color={colors.textPrimary} />
        </View>
      </Pressable>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    frame: {
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: FRAME_PADDING,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.sm,
      overflow: "hidden",
      backgroundColor: colors.cardElevatedLight,
    },
    info: {
      flex: 1,
      gap: 4,
    },
    eyebrow: {
      ...typography.label,
      color: colors.accentLight,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
    },
    metaText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    barTrack: {
      height: 4,
      marginTop: 4,
      borderRadius: 2,
      overflow: "hidden",
      backgroundColor: colors.border,
    },
    barFill: {
      height: "100%",
      backgroundColor: colors.accentLight,
    },
    arrowButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default CollectionContinueCard;

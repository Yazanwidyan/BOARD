import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getCollectionProgress } from "../utils/collections";

// Curated art for the two collection types that have it — real per-movie
// backdrops are generic stock placeholders (see data/movies.js), so these
// two read as noticeably more "designed" than the rest until real art
// exists. Franchise/genre collections still fall back to a movie backdrop.
const TYPE_PLACEHOLDERS = {
  director: require("../../assets/collection-placeholder-director.png"),
  decade: require("../../assets/collection-placeholder-decade.png"),
};

// A full-bleed backdrop behind a dark gradient, title/progress overlaid at
// the bottom — shared by the Collections tab's "Continue" spot and Home's
// "Continue a Collection" section, so both read as the exact same feature
// rather than two designs.
export const CollectionContinueCard = ({ collection, watchedIds, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { watchedCount, total, progress } = getCollectionProgress(
    collection,
    watchedIds,
  );
  const backdrop = collection.movies[0]?.backdrop;
  const imageSource =
    TYPE_PLACEHOLDERS[collection.type] ?? (backdrop ? { uri: backdrop } : null);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {imageSource && (
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
      )}
      <LinearGradient
        colors={["transparent", "#252746"]}
        style={styles.detailsVignette}
        pointerEvents="none"
      />

      <View style={styles.content}>
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {collection.title}
          </Text>
          <Text style={styles.subtitle}>
            {watchedCount} / {total} watched
          </Text>
        </View>
        <View style={styles.arrowButton}>
          <ArrowRight size={18} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      height: 150,
      borderRadius: radius.sm,
      overflow: "hidden",
      backgroundColor: colors.card,
      justifyContent: "flex-end",
      borderWidth: 1,
      borderColor: colors.border,
    },
    image: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    detailsVignette: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "65%",
    },
    content: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      padding: spacing.md,
    },
    textBlock: {
      flex: 1,
      marginRight: spacing.sm,
    },
    title: {
      ...typography.subtitle,
      color: "#FFFFFF",
    },
    subtitle: {
      ...typography.caption,
      color: "rgba(255, 255, 255, 0.85)",
      marginTop: 2,
    },
    arrowButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    barTrack: {
      height: 4,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      borderRadius: 2,
      overflow: "hidden",
      backgroundColor: "rgba(255, 255, 255, 0.25)",
    },
    barFill: {
      height: "100%",
      backgroundColor: colors.accentLight,
    },
  });

export default CollectionContinueCard;

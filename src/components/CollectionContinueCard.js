import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getCollectionProgress } from "../utils/collections";

const TYPE_LABELS = {
  franchise: "Franchise",
  director: "Director",
  decade: "Decade",
  genre: "Genre",
};

// The nested double-card "frame" look — a darker outer shape with a fixed
// padding gap, the lighter card floating inside it. Shared by the
// Collections tab's "Continue" spot and Home's "Continue a Collection"
// section, so both read as the exact same feature rather than two designs.
export const CollectionContinueCard = ({ collection, watchedIds, onPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { progress } = getCollectionProgress(collection, watchedIds);

  return (
    <View style={styles.frame}>
      <Pressable style={styles.card} onPress={onPress}>
        <Text style={styles.label}>
          {TYPE_LABELS[collection.type] ?? "Collection"}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {collection.title}
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
        </View>
      </Pressable>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    frame: {
      backgroundColor: "#6E3EC8",
      borderRadius: radius.lg,
      padding: 4,
      paddingBottom: 10, // extra room for the progress bar to peek out
    },
    card: {
      backgroundColor: "#885ADE",
      borderRadius: radius.lg,
      padding: 20,
    },
    label: {
      ...typography.body,
      color: colors.textPrimary,
    },
    title: {
      ...typography.title,
      fontSize: 21,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    barTrack: {
      height: 8,
      borderRadius: 3,
      backgroundColor: colors.card,
      overflow: "hidden",
      marginTop: 18,
    },
    barFill: {
      height: "100%",
      backgroundColor: colors.accentLight,
    },
  });

export default CollectionContinueCard;

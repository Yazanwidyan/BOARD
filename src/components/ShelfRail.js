import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

// A sideways-scrolling shelf: items stand edge to edge, each on its own
// piece of ledge, so the pieces join into one continuous shelf (same
// ledge as Library's shelves). Optional caption under each item.
//
// items: [{ key, onPress, content, title?, meta?, metaColor? }]
export const ShelfRail = ({ items, itemWidth }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.rail}
      contentContainerStyle={styles.content}
    >
      {items.map(({ key, onPress, content, title, meta, metaColor }) => (
        <Pressable
          key={key}
          onPress={onPress}
          style={({ pressed }) => [
            { width: itemWidth },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.item}>{content}</View>
          <View style={styles.ledge} />
          <LinearGradient
            colors={["rgba(0, 0, 0, 0.45)", "rgba(0, 0, 0, 0)"]}
            style={styles.ledgeShadow}
            pointerEvents="none"
          />
          {(title || meta) && (
            <View style={styles.caption}>
              {!!title && (
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
              )}
              {!!meta && (
                <Text
                  style={[styles.meta, metaColor && { color: metaColor }]}
                  numberOfLines={1}
                >
                  {meta}
                </Text>
              )}
            </View>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    rail: {
      flexGrow: 0,
    },
    // Items carry their own side padding, so the rail only adds enough to
    // line the first item up with the page margin.
    content: {
      paddingHorizontal: spacing.sm,
    },
    item: {
      paddingHorizontal: spacing.sm,
      justifyContent: "flex-end",
    },
    ledge: {
      height: 7,
      backgroundColor: colors.cardElevated,
      borderTopWidth: 1,
      borderTopColor: "rgba(255, 255, 255, 0.14)",
    },
    ledgeShadow: {
      height: 10,
    },
    caption: {
      paddingHorizontal: spacing.sm,
      marginTop: -2,
    },
    title: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    pressed: {
      opacity: 0.75,
    },
  });

export default ShelfRail;

import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "./AppText";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

// A sideways-scrolling row of posters (or collages), each with an
// optional caption underneath. Plain — no shelf ledge.
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
    // Each item pads 1px a side, so posters sit 2px apart — the same
    // hairline gap as Library's poster grid.
    content: {
      paddingHorizontal: spacing.md - 1,
    },
    item: {
      paddingHorizontal: 1,
      justifyContent: "flex-end",
    },
    caption: {
      paddingHorizontal: 1,
      paddingEnd: spacing.sm,
      marginTop: spacing.sm,
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

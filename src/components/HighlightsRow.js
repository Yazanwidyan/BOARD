import { Dna, Plus } from "lucide-react-native";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";

const CIRCLE = 52;
const RING = 2;
const RING_GAP = 3;

// One highlight's cover, inside its ring: a poster, a tier letter on its
// colour, or an icon.
const Cover = ({ cover, colors, styles }) => {
  if (cover.poster) {
    return <Image source={{ uri: cover.poster }} style={styles.coverImage} resizeMode="cover" />;
  }
  if (cover.tier) {
    return (
      <View style={[styles.coverFill, { backgroundColor: cover.color }]}>
        <Text style={styles.coverTier}>{cover.tier}</Text>
      </View>
    );
  }
  if (cover.icon === "plus") {
    return (
      <View style={[styles.coverFill, styles.coverEmpty]}>
        <Plus size={22} color={colors.textSecondary} strokeWidth={1.8} />
      </View>
    );
  }
  return (
    <View style={styles.coverFill}>
      <Dna size={22} color={colors.textPrimary} strokeWidth={1.8} />
    </View>
  );
};

// Instagram-style highlights under a profile's card: a row of ringed
// circles, each named — tap one to watch it (the Highlight viewer). A
// placeholder (`empty`, e.g. "New board") gets a dashed grey ring instead.
// `highlights` from utils/highlights.
export const HighlightsRow = ({ highlights, onOpen }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  if (!highlights.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.rail}
      contentContainerStyle={styles.content}
    >
      {highlights.map((highlight, index) => (
        <Pressable
          key={highlight.key}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          onPress={() => onOpen(index)}
          accessibilityRole="button"
          accessibilityLabel={highlight.label}
        >
          <View style={[styles.ring, highlight.empty && styles.ringEmpty]}>
            <View style={styles.inner}>
              <Cover cover={highlight.cover} colors={colors} styles={styles} />
            </View>
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {highlight.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Runs to the screen's edges (the page's margin is inside it).
    rail: {
      marginHorizontal: -spacing.md,
      marginTop: spacing.lg,
    },
    content: {
      gap: spacing.md,
      paddingHorizontal: spacing.md,
    },
    item: {
      width: CIRCLE + 2 * (RING + RING_GAP),
      alignItems: "center",
      gap: 6,
    },
    pressed: {
      opacity: 0.7,
    },
    // The slate ring, a gap of the page colour, then the cover.
    ring: {
      width: CIRCLE + 2 * (RING + RING_GAP),
      height: CIRCLE + 2 * (RING + RING_GAP),
      borderRadius: (CIRCLE + 2 * (RING + RING_GAP)) / 2,
      borderWidth: RING,
      borderColor: colors.selected,
      alignItems: "center",
      justifyContent: "center",
    },
    ringEmpty: {
      borderStyle: "dashed",
      borderColor: colors.textMuted,
    },
    coverEmpty: {
      backgroundColor: colors.card,
    },
    inner: {
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    coverImage: {
      width: "100%",
      height: "100%",
    },
    coverFill: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
    },
    coverTier: {
      ...typography.title,
      fontSize: 22,
      lineHeight: 28,
      color: "#0C1014",
    },
    label: {
      ...typography.caption,
      lineHeight: 16,
      color: colors.textSecondary,
    },
  });

export default HighlightsRow;

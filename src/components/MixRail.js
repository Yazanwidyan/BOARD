import { LinearGradient } from "expo-linear-gradient";
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";

import { t } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";
import { ArtworkEdge } from "./MoviePoster";

const GAP = spacing.rail;
// A card is a little taller than wide, like Apple Music's Top Picks.
const CARD_RATIO = 1.32;

// A mix's artwork, Apple Music style: its lead film's still filling the
// card, melting into the mix's colour, with its name and a line about it
// on that colour at the bottom.
export const MixArt = ({ mix, width, height }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const lead = mix.movies[0];
  return (
    <View style={[styles.art, { width, height, backgroundColor: mix.tint }]}>
      <Image source={{ uri: lead?.backdrop ?? lead?.poster }} style={styles.still} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", mix.tint, mix.tint]}
        locations={[0.3, 0.68, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.words}>
        <Text style={styles.title} numberOfLines={2}>
          {mix.titleIsName ? mix.title : t(mix.title)}
        </Text>
        <Text style={styles.hint} numberOfLines={2}>
          {t(mix.hint)} · {t("{count} films", { count: mix.movies.length })}
        </Text>
      </View>
      <ArtworkEdge />
    </View>
  );
};

// Home's "Top picks for you": the mixes (utils/mixes) as cards in a row you
// scroll — each with its little grey label above, as in Apple Music. Tap
// one for its page.
export const MixRail = ({ mixes, onOpen }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  // A card and a good part of the next on screen.
  const cardWidth = Math.round((width - spacing.md * 2) * 0.62);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      snapToInterval={cardWidth + GAP}
      snapToAlignment="start"
      decelerationRate="fast"
    >
      {mixes.map((mix) => (
        <View key={mix.key} style={{ width: cardWidth }}>
          <Text style={styles.eyebrow} numberOfLines={1}>
            {t(mix.eyebrow)}
          </Text>
          <Pressable
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() => onOpen(mix)}
            accessibilityRole="button"
            accessibilityLabel={`${t(mix.eyebrow)}: ${mix.titleIsName ? mix.title : t(mix.title)}`}
          >
            <MixArt mix={mix} width={cardWidth} height={Math.round(cardWidth * CARD_RATIO)} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    row: {
      gap: GAP,
      paddingHorizontal: spacing.md,
    },
    eyebrow: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xs + 2,
    },
    pressed: {
      opacity: 0.85,
    },
    // A poster's corners and frame.
    art: {
      justifyContent: "flex-end",
      borderRadius: shape.poster,
      overflow: "hidden",
    },
    still: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      height: "72%",
    },
    words: {
      padding: spacing.md,
      gap: 3,
    },
    title: {
      fontFamily: fonts.display,
      fontSize: 21,
      lineHeight: 25,
      color: "#FFFFFF",
    },
    hint: {
      ...typography.caption,
      lineHeight: 16,
      color: "rgba(255, 255, 255, 0.82)",
    },
  });

export default MixRail;

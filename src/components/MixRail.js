import { LinearGradient } from "expo-linear-gradient";
import { Check, Shuffle } from "lucide-react-native";
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";

import { t } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";
import { ArtworkEdge, MoviePoster } from "./MoviePoster";

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
      {/* Why its first film leads ("Next in your Nolan collection"). */}
      {!!mix.tag && (
        <View style={styles.tag}>
          <Text style={styles.tagText} numberOfLines={1}>
            {mix.tag}
          </Text>
        </View>
      )}
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

// One film, not a mix: its poster filling the card, its name and why it
// fits you over the foot, and two buttons — Watch tonight (it becomes
// tonight's pick) and ⇄ (another). Tap the poster for its page.
// `pick`: { movie, why, picked }.
const OnePickCard = ({ pick, width, height, onOpenMovie, onPick, onSwap, styles, colors }) => (
  <View style={{ width }}>
    <Text style={styles.eyebrow} numberOfLines={1}>
      {t("One for tonight")}
    </Text>
    <Pressable
      style={({ pressed }) => pressed && styles.pressed}
      onPress={() => onOpenMovie(pick.movie.id)}
      accessibilityRole="button"
      accessibilityLabel={`${t("One for tonight")}: ${pick.movie.title}`}
    >
      <View style={[styles.art, { width, height }]}>
        <MoviePoster tile uri={pick.movie.poster} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
          locations={[0.35, 0.62, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.words}>
          <Text style={styles.title} numberOfLines={2}>
            {pick.movie.title}
          </Text>
          {!!pick.why && (
            <Text style={styles.hint} numberOfLines={2}>
              {pick.why}
            </Text>
          )}
          <View style={styles.pickActions}>
            <Pressable
              style={({ pressed }) => [styles.pickButton, pick.picked && styles.pickButtonOn, pressed && styles.pressed]}
              onPress={() => onPick(pick.movie.id)}
              disabled={pick.picked}
              accessibilityRole="button"
            >
              {pick.picked && <Check size={14} color={colors.textPrimary} strokeWidth={2.8} />}
              <Text style={[styles.pickText, pick.picked && styles.pickTextOn]} numberOfLines={1}>
                {pick.picked ? t("Tonight's pick") : t("Watch tonight")}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.swap, pressed && styles.pressed]}
              onPress={onSwap}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t("Another one")}
            >
              <Shuffle size={16} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
        <ArtworkEdge />
      </View>
    </Pressable>
  </View>
);

// Home's "Top picks for you": one film to just watch (`onePick`, with
// `onOpenMovie`, `onPick` and `onSwap`), then the mixes (utils/mixes) as
// cards in a row you scroll — each with its little grey label above, as
// in Apple Music. Tap a mix for its page.
export const MixRail = ({ mixes, onOpen, onePick, onOpenMovie, onPick, onSwap }) => {
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
      {onePick && (
        <OnePickCard
          pick={onePick}
          width={cardWidth}
          height={Math.round(cardWidth * CARD_RATIO)}
          onOpenMovie={onOpenMovie}
          onPick={onPick}
          onSwap={onSwap}
          styles={styles}
          colors={colors}
        />
      )}
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
    tag: {
      position: "absolute",
      top: spacing.sm,
      start: spacing.sm,
      end: spacing.sm,
      alignSelf: "flex-start",
      alignItems: "flex-start",
    },
    tagText: {
      ...typography.caption,
      fontFamily: fonts.bold,
      fontSize: 11,
      lineHeight: 14,
      color: "#FFFFFF",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: shape.chip,
      overflow: "hidden",
      backgroundColor: "rgba(0, 0, 0, 0.65)",
    },
    // The one film's buttons: Watch tonight (white), and ⇄.
    pickActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    pickButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      height: 36,
      borderRadius: shape.chip,
      backgroundColor: "#FFFFFF",
    },
    pickButtonOn: {
      backgroundColor: "rgba(255, 255, 255, 0.18)",
    },
    pickText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: "#000000",
    },
    pickTextOn: {
      color: "#FFFFFF",
    },
    swap: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
    },
  });

export default MixRail;

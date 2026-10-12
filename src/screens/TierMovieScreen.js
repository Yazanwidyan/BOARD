import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { HeaderIconButton } from "../components/ScreenHeader";
import { MoviePoster } from "../components/MoviePoster";
import { getMovieById } from "../data/movies";
import { t, useIsRTL } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { giveRatingFeedback } from "../utils/achievementFeedback";
import { useTasteStore } from "../store/tasteStore";
import { aspectsForTier } from "../utils/aspects";
import { TIERS, getTier } from "../utils/tiers";

const POSTER_WIDTH = 104;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const EASE = { duration: 200, easing: Easing.out(Easing.cubic) };
const FLY = { duration: 300, easing: Easing.inOut(Easing.cubic) };

// Row geometry (shared by the styles and the move animation, which puts
// the poster exactly in the row's thumbnail slot).
const GUTTER = spacing.md;
// The tier list's side margin — the same gutter as the rest of the page.
const ROW_INSET = GUTTER;
const LETTER_WIDTH = 56;
const ROW_BODY_PADDING = spacing.sm + 4;
const THUMB_HEIGHT = 44;
const THUMB_WIDTH = THUMB_HEIGHT / 1.5;
const THUMB_SCALE = THUMB_HEIGHT / POSTER_HEIGHT;
const THUMB_CENTER_FROM_EDGE =
  ROW_INSET + LETTER_WIDTH + ROW_BODY_PADDING + THUMB_WIDTH / 2;

// Tier one movie like a tier list, by tapping.
//
// There's one poster. An untiered movie's poster starts big at the top; a
// tiered one's sits small in its tier's row. Tap a row and the poster
// glides into that row's slot; tap another to move it again.
//
// Nothing is saved by tapping — "Save" at the bottom confirms the tier.
// Once it's in a tier, a row of one-tap reasons asks why ("the twist",
// "too slow"…), saved with it as a taste signal (see utils/aspects). Their
// space is always reserved, so the rows never move under the poster.
//
// The poster is laid out at the top and moved with transforms: either home
// (0, 0, full size) or a row's slot. Every position is a plain onLayout
// value inside one container (`body`), so they share one coordinate space.

const TierRow = ({ tier, index, chosen, onChoose, onLayout, styles }) => {
  const { key, meaning, color } = tier;
  const isChosen = chosen === key;

  return (
    <Animated.View
      entering={FadeInDown.duration(260)
        .easing(Easing.out(Easing.cubic))
        .delay(60 + index * 45)}
      onLayout={(event) => onLayout(index, event.nativeEvent.layout)}
      style={styles.rowWrap}
    >
      <Pressable
        onPress={() => onChoose(index)}
        style={styles.row}
        accessibilityRole="radio"
        accessibilityState={{ selected: isChosen }}
        accessibilityLabel={`${key} · ${t(meaning)}`}
      >
        {({ pressed }) => (
          <>
            <View style={[styles.letterTile, { backgroundColor: color }]}>
              <Text style={styles.letter}>{key}</Text>
            </View>
            <View style={styles.rowBody}>
              {/* The slot the poster settles into — always reserved, so
                  the rows never shift when a poster lands. */}
              <View style={styles.thumbSlot} />
              <Text style={styles.meaning} numberOfLines={1}>
                {meaning}
              </Text>
            </View>
            {/* Lit while pressed, outlined while chosen. */}
            {(pressed || isChosen) && (
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  styles.outline,
                  { borderColor: color },
                  pressed && { backgroundColor: `${color}2E` },
                ]}
              />
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

export const TierMovieScreen = ({ navigation, route }) => {
  const { movieId } = route.params;
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const isRTL = useIsRTL();
  const movie = getMovieById(movieId);
  const entry = useMovieStore((state) =>
    state.watched.find((item) => item.movieId === movieId),
  );
  const current = getTier(entry);
  // The tier the poster sits in right now — not saved until "Save".
  const [chosen, setChosen] = useState(current);
  // Why — the aspects saved for this movie, editable before saving.
  const savedAspects = useTasteStore((state) => state.aspects[movieId]);
  const [aspects, setAspects] = useState(savedAspects ?? []);
  const aspectOptions = chosen ? aspectsForTier(chosen) : [];
  // Only the ones that fit the current tier (loved vs. didn't work).
  const keptAspects = aspects.filter((key) =>
    aspectOptions.some((option) => option.key === key),
  );
  const aspectsChanged =
    [...keptAspects].sort().join() !== [...(savedAspects ?? [])].sort().join();
  const toggleAspect = (key) => {
    Haptics.selectionAsync();
    setAspects((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };
  // Once saved the screen is on its way out: no more changes.
  const [locked, setLocked] = useState(false);

  // Where the poster is: its offset from home and its scale.
  const posX = useSharedValue(0);
  const posY = useSharedValue(0);
  const scale = useSharedValue(1);
  // A tiered movie's poster stays hidden until it's been put in its row.
  const posterOpacity = useSharedValue(current ? 0 : 1);

  // Geometry, relative to `body`.
  const geo = useRef({
    bodyWidth: 0,
    posterAreaY: 0,
    posterWrapY: 0,
    tiersY: 0,
    rows: TIERS.map(() => null),
  });
  // Until the first tap, a tiered movie's poster is (re)placed in its row
  // on every layout update, so a late measurement can't leave it off.
  const touched = useRef(false);
  const shownInitially = useRef(false);

  // The offset that puts the poster in row `index`'s slot.
  const slotFor = (index) => {
    const g = geo.current;
    const frame = g.rows[index];
    if (!frame || !g.bodyWidth) return null;
    const homeY = g.posterAreaY + g.posterWrapY + POSTER_HEIGHT / 2;
    const thumbX = isRTL
      ? g.bodyWidth - THUMB_CENTER_FROM_EDGE
      : THUMB_CENTER_FROM_EDGE;
    return {
      x: thumbX - g.bodyWidth / 2,
      y: g.tiersY + frame.y + frame.height / 2 - homeY,
    };
  };

  // A tiered movie: once everything's measured, put its poster in its row
  // (no animation) and fade it in there.
  const placeInitially = () => {
    if (touched.current || !current) return;
    const slot = slotFor(TIERS.findIndex((tier) => tier.key === current));
    if (!slot) return;
    posX.value = slot.x;
    posY.value = slot.y;
    scale.value = THUMB_SCALE;
    if (!shownInitially.current) {
      shownInitially.current = true;
      posterOpacity.value = withTiming(1, EASE);
    }
  };

  const setGeo = (key, value) => {
    geo.current[key] = value;
    placeInitially();
  };
  const storeRowFrame = (index, { y, height }) => {
    geo.current.rows[index] = { y, height };
    placeInitially();
  };

  // Rows can settle a moment after the first layout (their entrance), so
  // try the initial placement again shortly after.
  useEffect(() => {
    const timer = setTimeout(placeInitially, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tap a row: the poster glides into its slot.
  const choose = (index) => {
    if (!entry || locked) return;
    const slot = slotFor(index);
    if (!slot) return;
    touched.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    posX.value = withTiming(slot.x, FLY);
    posY.value = withTiming(slot.y, FLY);
    scale.value = withTiming(THUMB_SCALE, FLY);
    posterOpacity.value = withTiming(1, EASE);
    setChosen(TIERS[index].key);
  };

  const tierChanged = !!chosen && chosen !== current;
  const canSave = !!entry && !!chosen && (tierChanged || aspectsChanged) && !locked;
  const handleSave = () => {
    if (!canSave) return;
    setLocked(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    useTasteStore.getState().setAspects(movieId, keptAspects);
    if (tierChanged) {
      const watchedBefore = useMovieStore.getState().watched;
      useMovieStore.getState().setWatchedTier(movieId, chosen);
      giveRatingFeedback(watchedBefore);
    }
    navigation.goBack();
  };

  const posterStyle = useAnimatedStyle(() => ({
    opacity: posterOpacity.value,
    transform: [
      { translateX: posX.value },
      { translateY: posY.value },
      { scale: scale.value },
    ],
  }));

  if (!movie) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <View style={styles.backdrop} pointerEvents="none">
        <Image
          source={{ uri: movie.poster }}
          blurRadius={30}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[`${colors.background}99`, colors.background]}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <HeaderIconButton
          onPress={() => navigation.goBack()}
          accessibilityLabel={t("Close")}
        >
          <X size={22} color={colors.textPrimary} strokeWidth={1.75} />
        </HeaderIconButton>
        <Text style={styles.title} numberOfLines={1}>
          {movie.title}
        </Text>
        <View style={styles.topBarSide} />
      </View>

      <View
        style={styles.body}
        onLayout={(event) => setGeo("bodyWidth", event.nativeEvent.layout.width)}
      >
        {/* Above the rows (zIndex / elevation), so the poster is drawn
            over them wherever it is. It doesn't take touches — the rows
            under it do. */}
        <View
          style={styles.posterArea}
          pointerEvents="box-none"
          onLayout={(event) => setGeo("posterAreaY", event.nativeEvent.layout.y)}
        >
          <View
            style={styles.posterHome}
            pointerEvents="none"
            onLayout={(event) => setGeo("posterWrapY", event.nativeEvent.layout.y)}
          >
            {/* Where an untiered poster starts — a faint outline once the
                poster has moved down into the list. */}
            {!!chosen && <View style={styles.homeOutline} />}
            <Animated.View style={[styles.posterWrap, posterStyle]}>
              <MoviePoster uri={movie.poster} shadow style={styles.poster} />
            </Animated.View>
          </View>
          <Text style={styles.prompt}>
            {chosen ? t("Tap another tier to change it.") : t("Tap a tier.")}
          </Text>
        </View>

        <View
          style={styles.tiers}
          onLayout={(event) => setGeo("tiersY", event.nativeEvent.layout.y)}
        >
          {TIERS.map((tier, index) => (
            <TierRow
              key={tier.key}
              tier={tier}
              index={index}
              chosen={chosen}
              onChoose={choose}
              onLayout={storeRowFrame}
              styles={styles}
            />
          ))}
        </View>
      </View>

      {/* Why — always this tall, so nothing above it ever moves. */}
      <View style={styles.why}>
        {chosen ? (
          <>
            <Text style={styles.whyLabel}>
              {aspectOptions === aspectsForTier("S")
                ? t("What did you love? (optional)")
                : t("What didn't work? (optional)")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.whyChips}
            >
              {aspectOptions.map((option) => {
                const selected = keptAspects.includes(option.key);
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => toggleAspect(option.key)}
                    style={[styles.whyChip, selected && styles.whyChipOn]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text
                      style={[
                        styles.whyChipText,
                        selected && styles.whyChipTextOn,
                      ]}
                    >
                      {t(option.label)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : (
          <Text style={styles.whyHint}>
            {t("Then tell us why — it sharpens your picks.")}
          </Text>
        )}
      </View>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <PrimaryButton
          label={
            tierChanged
              ? t("Save as {tier} tier", { tier: chosen })
              : t("Save")
          }
          disabled={!canSave}
          onPress={handleSave}
        />
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backdrop: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      height: 340,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    topBarSide: {
      width: 40,
    },
    title: {
      ...typography.title,
      flex: 1,
      fontSize: 17,
      color: colors.textPrimary,
      textAlign: "center",
    },
    body: {
      flex: 1,
    },
    posterArea: {
      alignItems: "center",
      paddingTop: spacing.sm,
      zIndex: 10,
      elevation: 10,
    },
    posterHome: {
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
    },
    homeOutline: {
      ...StyleSheet.absoluteFillObject,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.border,
    },
    posterWrap: {
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
    },
    poster: {
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
    },
    prompt: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.sm + 2,
    },

    // Tier list: the rows split the rest of the screen evenly.
    tiers: {
      flex: 1,
      gap: 2,
      paddingHorizontal: ROW_INSET,
      paddingTop: spacing.md,
    },
    rowWrap: {
      flex: 1,
      maxHeight: 76,
      minHeight: 48,
    },
    row: {
      flex: 1,
      flexDirection: "row",
      alignItems: "stretch",
      // Darker than the page — slots on the tier list, not cards.
      backgroundColor: colors.isDark ? "#05070A" : colors.cardElevatedLight,
    },
    // Tier colours are light, so the letter is dark on every theme.
    letterTile: {
      width: LETTER_WIDTH,
      alignItems: "center",
      justifyContent: "center",
    },
    letter: {
      ...typography.display,
      fontSize: 24,
      lineHeight: 30,
      color: "#0C1014",
    },
    rowBody: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingHorizontal: ROW_BODY_PADDING,
    },
    thumbSlot: {
      width: THUMB_WIDTH,
      height: THUMB_HEIGHT,
    },
    meaning: {
      ...typography.bodyBold,
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
    },
    outline: {
      borderWidth: 2,
    },
    why: {
      height: 72,
      justifyContent: "center",
      paddingTop: spacing.md,
    },
    whyLabel: {
      ...typography.caption,
      color: colors.textMuted,
      paddingHorizontal: GUTTER,
      marginBottom: spacing.sm,
    },
    whyChips: {
      gap: spacing.sm,
      paddingHorizontal: GUTTER,
    },
    whyChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.card,
    },
    whyChipOn: {
      backgroundColor: colors.selected,
    },
    whyChipText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    whyChipTextOn: {
      color: colors.selectedText,
    },
    whyHint: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      paddingHorizontal: GUTTER,
    },
    footer: {
      paddingHorizontal: GUTTER,
      paddingTop: spacing.md,
    },
  });

export default TierMovieScreen;

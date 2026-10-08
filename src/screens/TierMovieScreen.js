import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeInDown,
  runOnJS,
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
import { TIERS, getTier } from "../utils/tiers";

const POSTER_WIDTH = 104;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const EASE = { duration: 200, easing: Easing.out(Easing.cubic) };
const FLY = { duration: 280, easing: Easing.inOut(Easing.cubic) };
// Held: a touch bigger. Over a row: smaller, so it reads as "fits here".
const SCALE_HELD = 1.06;
const SCALE_OVER_ROW = 0.78;

// Row geometry (shared by the styles and the drop animation, which puts
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

// Tier one movie like a tier list, by dragging only.
//
// There's one poster, and it's always the thing you drag. An untiered
// movie's poster starts big at the top; a tiered one's sits small in its
// tier's row. Pick it up from wherever it is and drop it on a row: the row
// under the poster's centre lights up as you go (a haptic tick per row),
// and on release the poster settles into that row's slot. Let go anywhere
// else and it goes back to where it was.
//
// Nothing is saved by dropping — "Save" at the bottom confirms the tier.
//
// The poster is laid out at the top and moved with transforms: its resting
// place (`base…`) is either home (0, 0, full size) or a row's slot.
// Every position is a plain onLayout value inside one container (`body`),
// so the drag and the drop zones share one coordinate space.

// Rows only take a dropped poster — no tapping. A screen reader can't
// drag, so for it each row still offers "activate" to choose that tier.
const TierRow = ({
  tier,
  index,
  hovered,
  chosen,
  onAccessibilityChoose,
  onLayout,
  styles,
}) => {
  const { key, meaning, color } = tier;
  const isChosen = chosen === key;

  const hoverStyle = useAnimatedStyle(() => ({
    opacity: withTiming(hovered.value === index ? 1 : 0, { duration: 120 }),
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(260)
        .easing(Easing.out(Easing.cubic))
        .delay(60 + index * 45)}
      onLayout={(event) => onLayout(index, event.nativeEvent.layout)}
      style={styles.rowWrap}
    >
      <View
        style={styles.row}
        accessible
        accessibilityRole="radio"
        accessibilityState={{ selected: isChosen }}
        accessibilityLabel={`${key} · ${t(meaning)}`}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={() => onAccessibilityChoose(index)}
      >
        <View style={[styles.letterTile, { backgroundColor: color }]}>
          <Text style={styles.letter}>{key}</Text>
        </View>
        <View style={styles.rowBody}>
          {/* The slot the poster settles into — always reserved, so the
              rows never shift when a poster lands. */}
          <View style={styles.thumbSlot} />
          <Text style={styles.meaning} numberOfLines={1}>
            {meaning}
          </Text>
        </View>
        {/* Lit while the poster is over this row. */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.outline,
            { borderColor: color, backgroundColor: `${color}2E` },
            hoverStyle,
          ]}
        />
        {isChosen && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.outline,
              { borderColor: color },
            ]}
          />
        )}
      </View>
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
  // Once saved the screen is on its way out: no more drags.
  const [locked, setLocked] = useState(false);

  // Where the poster is (offset from home, scale) and where it rests.
  const posX = useSharedValue(0);
  const posY = useSharedValue(0);
  const scale = useSharedValue(1);
  const baseX = useSharedValue(0);
  const baseY = useSharedValue(0);
  const baseScale = useSharedValue(1);
  const lift = useSharedValue(0); // 0 resting … 1 held (shadow, tilt)
  // A tiered movie's poster stays hidden until it's been put in its row.
  const posterOpacity = useSharedValue(current ? 0 : 1);
  const hovered = useSharedValue(-1); // index into TIERS, -1 = none

  // Geometry, relative to `body`. Each value lives in a JS ref (always
  // current — what the JS side reads) and a shared value (what the drag
  // reads). Row frames are collected in the ref and published whole:
  // copying the shared array lost updates when the rows laid out at once.
  const geo = useRef({
    bodyWidth: 0,
    posterAreaY: 0,
    posterWrapY: 0,
    tiersY: 0,
    rows: TIERS.map(() => null),
  });
  const bodyWidth = useSharedValue(0);
  const posterAreaY = useSharedValue(0);
  const posterWrapY = useSharedValue(0);
  const tiersY = useSharedValue(0);
  const rowFrames = useSharedValue(TIERS.map(() => null));
  // Until you first touch it, a tiered movie's poster is (re)placed in its
  // row on every layout update, so a late measurement can't leave it off.
  const touched = useRef(false);
  const shownInitially = useRef(false);

  // The offset + scale that puts the poster in row `index`'s slot.
  const slotFor = (index, g) => {
    "worklet";
    const frame = g.rows[index];
    const homeY = g.posterAreaY + g.posterWrapY + POSTER_HEIGHT / 2;
    const thumbX = g.isRTL
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
    const g = geo.current;
    const index = TIERS.findIndex((tier) => tier.key === current);
    if (index === -1 || !g.rows[index] || !g.bodyWidth) return;
    const slot = slotFor(index, { ...g, isRTL });
    baseX.value = slot.x;
    baseY.value = slot.y;
    baseScale.value = THUMB_SCALE;
    posX.value = slot.x;
    posY.value = slot.y;
    scale.value = THUMB_SCALE;
    if (!shownInitially.current) {
      shownInitially.current = true;
      posterOpacity.value = withTiming(1, EASE);
    }
  };
  const markTouched = () => {
    touched.current = true;
  };

  const setGeo = (key, value, shared) => {
    geo.current[key] = value;
    shared.value = value;
    placeInitially();
  };
  const storeRowFrame = (index, { y, height }) => {
    geo.current.rows[index] = { y, height };
    rowFrames.value = [...geo.current.rows];
    placeInitially();
  };

  // Rows can settle a moment after the first layout (their entrance), so
  // try the initial placement again shortly after.
  useEffect(() => {
    const timer = setTimeout(placeInitially, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSave = !!entry && !!chosen && chosen !== current && !locked;
  const handleSave = () => {
    if (!canSave) return;
    setLocked(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const watchedBefore = useMovieStore.getState().watched;
    useMovieStore.getState().setWatchedTier(movieId, chosen);
    giveRatingFeedback(watchedBefore);
    navigation.goBack();
  };

  const handleDrop = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(TIERS[index].key);
  };
  const handleAccessibilityChoose = (index) => {
    if (locked) return;
    markTouched();
    const slot = slotFor(index, { ...geo.current, isRTL });
    baseX.value = slot.x;
    baseY.value = slot.y;
    baseScale.value = THUMB_SCALE;
    posX.value = withTiming(slot.x, FLY);
    posY.value = withTiming(slot.y, FLY);
    scale.value = withTiming(THUMB_SCALE, FLY);
    posterOpacity.value = withTiming(1, EASE);
    setChosen(TIERS[index].key);
  };
  const tick = () => Haptics.selectionAsync();

  const pan = Gesture.Pan()
    .enabled(!!entry && !locked)
    .onStart(() => {
      runOnJS(markTouched)();
      lift.value = withTiming(1, EASE);
      scale.value = withTiming(SCALE_HELD, EASE);
    })
    .onUpdate((event) => {
      posX.value = baseX.value + event.translationX;
      posY.value = baseY.value + event.translationY;

      // Which row is under the poster's centre?
      const centerY =
        posterAreaY.value +
        posterWrapY.value +
        POSTER_HEIGHT / 2 +
        posY.value;
      const frames = rowFrames.value;
      let over = -1;
      for (let i = 0; i < frames.length; i += 1) {
        const frame = frames[i];
        if (!frame) continue;
        const top = tiersY.value + frame.y;
        if (centerY >= top && centerY <= top + frame.height) {
          over = i;
          break;
        }
      }
      if (over !== hovered.value) {
        hovered.value = over;
        scale.value = withTiming(
          over === -1 ? SCALE_HELD : SCALE_OVER_ROW,
          EASE,
        );
        if (over !== -1) runOnJS(tick)();
      }
    })
    .onEnd(() => {
      const target = hovered.value;
      hovered.value = -1;
      lift.value = withTiming(0, EASE);
      if (target === -1) {
        // Missed — back to where it was resting.
        posX.value = withTiming(baseX.value, EASE);
        posY.value = withTiming(baseY.value, EASE);
        scale.value = withTiming(baseScale.value, EASE);
        return;
      }
      // Landed — settle into that row's slot, which is now its rest.
      const slot = slotFor(target, {
        bodyWidth: bodyWidth.value,
        posterAreaY: posterAreaY.value,
        posterWrapY: posterWrapY.value,
        tiersY: tiersY.value,
        rows: rowFrames.value,
        isRTL,
      });
      baseX.value = slot.x;
      baseY.value = slot.y;
      baseScale.value = THUMB_SCALE;
      posX.value = withTiming(slot.x, FLY);
      posY.value = withTiming(slot.y, FLY);
      scale.value = withTiming(THUMB_SCALE, FLY);
      runOnJS(handleDrop)(target);
    });

  const posterStyle = useAnimatedStyle(() => ({
    opacity: posterOpacity.value,
    transform: [
      { translateX: posX.value },
      { translateY: posY.value },
      { scale: scale.value },
      // Tilts with sideways drag while held, settling as it's let go.
      {
        rotate: `${Math.max(-8, Math.min(8, (posX.value - baseX.value) / 30)) * lift.value}deg`,
      },
    ],
  }));
  const shadowStyle = useAnimatedStyle(() => ({ opacity: lift.value }));

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
        onLayout={(event) =>
          setGeo("bodyWidth", event.nativeEvent.layout.width, bodyWidth)
        }
      >
        {/* Above the rows (zIndex / elevation), so the poster is drawn
            over them wherever it is. */}
        <View
          style={styles.posterArea}
          onLayout={(event) =>
            setGeo("posterAreaY", event.nativeEvent.layout.y, posterAreaY)
          }
        >
          <View
            style={styles.posterHome}
            onLayout={(event) =>
              setGeo("posterWrapY", event.nativeEvent.layout.y, posterWrapY)
            }
          >
            {/* Where an untiered poster starts — a faint outline once the
                poster has moved down into the list. */}
            {!!chosen && <View style={styles.homeOutline} />}
            <GestureDetector gesture={pan}>
              <Animated.View style={[styles.posterWrap, posterStyle]}>
                <Animated.View
                  pointerEvents="none"
                  style={[styles.dragShadow, shadowStyle]}
                />
                <MoviePoster uri={movie.poster} shadow style={styles.poster} />
              </Animated.View>
            </GestureDetector>
          </View>
          <Text style={styles.prompt}>
            {chosen
              ? t("Drag the poster to another tier to change it.")
              : t("Drag the poster onto a tier.")}
          </Text>
        </View>

        <View
          style={styles.tiers}
          onLayout={(event) =>
            setGeo("tiersY", event.nativeEvent.layout.y, tiersY)
          }
        >
          {TIERS.map((tier, index) => (
            <TierRow
              key={tier.key}
              tier={tier}
              index={index}
              hovered={hovered}
              chosen={chosen}
              onAccessibilityChoose={handleAccessibilityChoose}
              onLayout={storeRowFrame}
              styles={styles}
            />
          ))}
        </View>
      </View>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <PrimaryButton
          label={
            chosen && chosen !== current
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
    // A soft dark halo under the poster while it's held up.
    dragShadow: {
      position: "absolute",
      top: 8,
      start: 4,
      end: 4,
      bottom: -8,
      backgroundColor: "rgba(0, 0, 0, 0.35)",
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
      backgroundColor: colors.isDark ? "#0D0E10" : colors.cardElevatedLight,
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
      color: "#161719",
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
    footer: {
      paddingHorizontal: GUTTER,
      paddingTop: spacing.md,
    },
  });

export default TierMovieScreen;

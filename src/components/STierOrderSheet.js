import * as Haptics from "expo-haptics";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { orderSTier } from "../utils/tiers";
import { Text } from "./AppText";
import { BottomSheet } from "./BottomSheet";
import { MoviePoster } from "./MoviePoster";
import { PrimaryButton } from "./PrimaryButton";

const POSTER_WIDTH = 40;
const ROW_HEIGHT = POSTER_WIDTH * 1.5 + spacing.sm * 2;
// One row and the 2px gap under it: where each place starts.
const SLOT = ROW_HEIGHT + 2;
const LIFT_DELAY = 220;
const SETTLE = { duration: 180 };

// Positions are { [movie id]: place }. Moving a film from one place to
// another shifts the ones in between by one.
const moveTo = (positions, from, to) => {
  "worklet";
  const next = {};
  Object.keys(positions).forEach((id) => {
    const place = positions[id];
    if (place === from) next[id] = to;
    else if (from < to && place > from && place <= to) next[id] = place - 1;
    else if (from > to && place < from && place >= to) next[id] = place + 1;
    else next[id] = place;
  });
  return next;
};

const toPositions = (ids) => Object.fromEntries(ids.map((id, index) => [id, index]));
const toOrder = (positions) =>
  Object.keys(positions).sort((a, b) => positions[a] - positions[b]);

// One film in the list, at its place. Hold it and it lifts and follows your
// finger; the others slide out of the way as it passes them.
const DraggableRow = ({ id, place, positions, count, onLift, onReorder, children, styles }) => {
  const active = useSharedValue(false);
  const top = useSharedValue(place * SLOT);
  const start = useSharedValue(0);

  // Slide to a new place when the order changes — unless it's the one
  // being dragged.
  useAnimatedReaction(
    () => positions.value[id],
    (place, previous) => {
      if (place !== previous && place != null && !active.value) {
        top.value = withTiming(place * SLOT, SETTLE);
      }
    },
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(LIFT_DELAY)
    .onStart(() => {
      active.value = true;
      start.value = top.value;
      runOnJS(onLift)(true);
    })
    .onUpdate((event) => {
      top.value = start.value + event.translationY;
      const to = Math.min(count - 1, Math.max(0, Math.round(top.value / SLOT)));
      const from = positions.value[id];
      if (to !== from) {
        positions.value = moveTo(positions.value, from, to);
        runOnJS(onReorder)(positions.value);
      }
    })
    .onFinalize(() => {
      top.value = withTiming(positions.value[id] * SLOT, SETTLE);
      active.value = false;
      runOnJS(onLift)(false);
    });

  const style = useAnimatedStyle(() => ({
    top: top.value,
    zIndex: active.value ? 10 : 0,
    transform: [{ scale: withTiming(active.value ? 1.03 : 1, { duration: 120 }) }],
    shadowOpacity: withTiming(active.value ? 0.35 : 0, { duration: 120 }),
    elevation: active.value ? 8 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.rowWrap, style]}>{children}</Animated.View>
    </GestureDetector>
  );
};

// Put your S tier — your favourites — in order: each film a row, #1 first.
// Hold a row and drag it to its place, or use its arrows for one step. The
// moves are a draft until "Done", which saves the order in one go; closing
// it any other way leaves the order as it was. A film you tier S later
// joins at the end.
export const STierOrderSheet = ({ visible, onClose }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const watched = useMovieStore((state) => state.watched);
  const order = useProfileStore((state) => state.topTen) ?? [];
  const setSTierOrder = useProfileStore((state) => state.setSTierOrder);

  const saved = orderSTier(watched, order).map((entry) => entry.movieId);
  // The order being arranged — started fresh each time the sheet opens.
  const [draft, setDraft] = useState(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (visible) setDraft(null);
  }, [visible]);
  const ids = draft ?? saved;

  // Where each film sits, shared with the rows as they're dragged.
  const positions = useSharedValue(toPositions(ids));
  const key = ids.join();
  useEffect(() => {
    positions.value = toPositions(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reorder = (next) => {
    Haptics.selectionAsync();
    setDraft(toOrder(next));
  };
  const lift = (on) => {
    setDragging(on);
    if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  const move = (index, step) => {
    const to = index + step;
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[index], next[to]] = [next[to], next[index]];
    Haptics.selectionAsync();
    setDraft(next);
  };

  // Saves only when something moved.
  const done = () => {
    if (draft && draft.join() !== saved.join()) setSTierOrder(draft);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("Order your S tier")}
      subtitle={t("Your favourites, #1 first — hold and drag, or use the arrows.")}
      footer={<PrimaryButton label={t("Done")} onPress={done} />}
    >
      <ScrollView
        scrollEnabled={!dragging}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {ids.length === 0 ? (
          <Text style={styles.empty}>{t("Tier a film S and it shows here.")}</Text>
        ) : (
          <View style={[styles.list, { height: ids.length * SLOT }]}>
            {saved.map((id) => {
              const movie = getMovieById(id);
              const index = ids.indexOf(id);
              if (!movie || index === -1) return null;
              return (
                <DraggableRow
                  key={id}
                  id={id}
                  place={index}
                  positions={positions}
                  count={ids.length}
                  onLift={lift}
                  onReorder={reorder}
                  styles={styles}
                >
                  <View style={styles.row}>
                    <GripVertical size={18} color={colors.textMuted} />
                    <Text style={[styles.rank, index === 0 && styles.rankFirst]}>{index + 1}</Text>
                    <MoviePoster uri={movie.poster} style={styles.poster} />
                    <View style={styles.text}>
                      <Text style={styles.title} numberOfLines={2}>
                        {movie.title}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {[movie.year, movie.director].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.arrow, index === 0 && styles.arrowOff]}
                      disabled={index === 0}
                      onPress={() => move(index, -1)}
                      hitSlop={4}
                      accessibilityRole="button"
                      accessibilityLabel={t("Move {title} up", { title: movie.title })}
                    >
                      <ChevronUp size={20} color={colors.textPrimary} />
                    </Pressable>
                    <Pressable
                      style={[styles.arrow, index === ids.length - 1 && styles.arrowOff]}
                      disabled={index === ids.length - 1}
                      onPress={() => move(index, 1)}
                      hitSlop={4}
                      accessibilityRole="button"
                      accessibilityLabel={t("Move {title} down", { title: movie.title })}
                    >
                      <ChevronDown size={20} color={colors.textPrimary} />
                    </Pressable>
                  </View>
                </DraggableRow>
              );
            })}
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    scroll: {
      paddingBottom: spacing.lg,
    },
    // The rows sit at their places (absolutely), so the list holds their
    // full height.
    list: {
      marginHorizontal: -spacing.md,
    },
    rowWrap: {
      position: "absolute",
      start: 0,
      end: 0,
      height: ROW_HEIGHT,
      shadowColor: "#000000",
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    row: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    rank: {
      ...typography.title,
      fontSize: 18,
      lineHeight: 24,
      width: 26,
      textAlign: "center",
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    rankFirst: {
      color: colors.textPrimary,
    },
    poster: {
      width: POSTER_WIDTH,
      height: POSTER_WIDTH * 1.5,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    arrow: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSoft,
      borderRadius: shape.control,
    },
    arrowOff: {
      opacity: 0.3,
    },
    empty: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xl,
    },
  });

export default STierOrderSheet;

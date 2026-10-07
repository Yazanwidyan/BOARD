import { LinearGradient } from "expo-linear-gradient";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";
import { ShelfLedge } from "./PosterShelf";

const NUM_COLUMNS = 3;
const GAP = spacing.md;
// Case proportions within each column, and how much of the disc slides
// out past the case's right edge.
const CASE_WIDTH_RATIO = 0.76;
const CASE_ASPECT = 1.42; // height / width, like a real DVD case
const DISC_RATIO = 0.78; // disc diameter / case height
const DISC_PEEK = 0.3; // share of the disc showing past the case
const HINGE_WIDTH = 7;

// One watched movie as a DVD: the poster in a black case (hinge on the
// left, a gloss across the cover) with the disc sliding out the right
// side, as if it was just played. The disc's label is the poster; a
// rewatch prints ×N on it.
// The DVD on its own (no touch handling), so other screens can stand it
// on their own shelves — Home's "Recently watched" rail uses it.
export const DvdCase = ({ movie, watchCount, columnWidth }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const caseWidth = columnWidth * CASE_WIDTH_RATIO;
  const caseHeight = caseWidth * CASE_ASPECT;
  const disc = caseHeight * DISC_RATIO;
  const label = disc * 0.72;
  const hole = disc * 0.16;

  return (
    <View style={{ width: columnWidth, height: caseHeight }}>
      {/* Disc — behind the case, sliding out to the right */}
      <View
        style={[
          styles.disc,
          {
            width: disc,
            height: disc,
            borderRadius: disc / 2,
            top: (caseHeight - disc) / 2,
            left: caseWidth - disc * (1 - DISC_PEEK),
          },
        ]}
      >
        <LinearGradient
          colors={["#E6E8F2", "#9C9EB4", "#DADCE8", "#8A8CA3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* The rainbow sheen a real disc catches */}
        <LinearGradient
          colors={[
            "rgba(255, 143, 216, 0.35)",
            "rgba(143, 227, 255, 0.4)",
            "rgba(199, 255, 143, 0.3)",
            "rgba(255, 213, 143, 0.35)",
          ]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.discLabel,
            { width: label, height: label, borderRadius: label / 2 },
          ]}
        >
          <MoviePoster uri={movie.poster} style={StyleSheet.absoluteFill} />
          {watchCount > 1 && (
            <View style={styles.rewatch}>
              <Text style={styles.rewatchText}>×{watchCount}</Text>
            </View>
          )}
        </View>
        <View
          style={[
            styles.discHole,
            { width: hole, height: hole, borderRadius: hole / 2 },
          ]}
        />
      </View>

      {/* Case */}
      <View style={[styles.case, { width: caseWidth, height: caseHeight }]}>
        <View style={styles.hinge}>
          <View style={styles.hingeRidge} />
          <View style={styles.hingeRidge} />
        </View>
        <MoviePoster uri={movie.poster} style={styles.cover} />
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.22)", "rgba(255, 255, 255, 0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0.5 }}
          style={[StyleSheet.absoluteFill, styles.gloss]}
          pointerEvents="none"
        />
      </View>
    </View>
  );
};

const Dvd = ({ movie, watchCount, columnWidth, onPress, styles }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => pressed && styles.pressed}
    accessibilityLabel={movie.title}
  >
    <DvdCase movie={movie} watchCount={watchCount} columnWidth={columnWidth} />
  </Pressable>
);

// The Watched tab as DVD shelves: each group (a month, a tier…) gets a
// shelf tag, then its DVDs three to a shelf.
// groups: [{ key, label?, color?, items: [{ movie, watchCount }] }]
export const DvdShelf = ({ groups, onPressMovie }) => {
  const { width } = useWindowDimensions();
  const colors = useColors();
  const styles = createStyles(colors);
  const columnWidth =
    (width - spacing.md * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  return (
    <View>
      {groups.map((group) => {
        const rows = [];
        for (let index = 0; index < group.items.length; index += NUM_COLUMNS) {
          rows.push(group.items.slice(index, index + NUM_COLUMNS));
        }
        return (
          <View key={group.key} style={styles.group}>
            {group.label && (
              <View style={styles.tag}>
                <Text
                  style={[
                    styles.tagText,
                    group.color && { color: group.color },
                  ]}
                >
                  {group.label.toUpperCase()}
                </Text>
                <Text style={styles.tagCount}>{group.items.length}</Text>
              </View>
            )}
            {rows.map((row) => (
              <View key={row[0].movie.id} style={styles.shelf}>
                <View style={styles.row}>
                  {row.map(({ movie, watchCount }) => (
                    <Dvd
                      key={movie.id}
                      movie={movie}
                      watchCount={watchCount}
                      columnWidth={columnWidth}
                      onPress={() => onPressMovie(movie)}
                      styles={styles}
                    />
                  ))}
                </View>
                <ShelfLedge />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    group: {
      marginTop: spacing.xs,
    },
    // The little label clipped to the front of a store shelf.
    tag: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: spacing.sm,
      marginLeft: spacing.md,
      marginBottom: spacing.sm + 2,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      borderRadius: radius.xs,
      backgroundColor: colors.cardElevated,
    },
    tagText: {
      ...typography.label,
      color: colors.textSecondary,
      letterSpacing: 1.2,
    },
    tagCount: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
    },
    shelf: {
      marginBottom: spacing.lg,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: GAP,
      paddingHorizontal: spacing.md,
      paddingBottom: 2,
    },
    pressed: {
      opacity: 0.75,
    },
    disc: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    discLabel: {
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "flex-end",
      borderWidth: 1.5,
      borderColor: "rgba(0, 0, 0, 0.25)",
    },
    discHole: {
      position: "absolute",
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: "#C9CBD8",
    },
    rewatch: {
      marginBottom: "12%",
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: radius.pill,
      backgroundColor: "rgba(2, 0, 2, 0.75)",
    },
    rewatchText: {
      ...typography.label,
      fontSize: 10,
      color: "#FFFFFF",
    },
    case: {
      flexDirection: "row",
      padding: 3,
      paddingLeft: 0,
      borderRadius: 3,
      backgroundColor: "#0D0D12",
      // No overflow: hidden — iOS would clip the shadow with it.
      shadowColor: "#000000",
      shadowOpacity: 0.5,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    hinge: {
      width: HINGE_WIDTH,
      flexDirection: "row",
      justifyContent: "space-evenly",
      paddingVertical: 4,
    },
    hingeRidge: {
      width: 1,
      height: "100%",
      backgroundColor: "rgba(255, 255, 255, 0.12)",
    },
    gloss: {
      borderRadius: 3,
    },
    cover: {
      flex: 1,
      height: "100%",
    },
  });

export default DvdShelf;

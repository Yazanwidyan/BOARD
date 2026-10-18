import { Plus } from "lucide-react-native";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { getMovieById } from "../data/movies";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { t } from "../i18n";
import { Text } from "./AppText";
import { BoardCover } from "./BoardCover";

const COLUMNS = 2;

// A profile's boards — the lists you made ("Best Nolan", "Comfort movies")
// as a two-up grid of square covers, edge to edge. Yours ends with a "New
// board" tile (`onCreate`); a friend's shows `emptyText` when there are
// none.
export const ProfileBoards = ({ boards, onOpen, onCreate, emptyText }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const size = Math.floor((width - 2 * (COLUMNS - 1)) / COLUMNS);

  if (boards.length === 0 && !onCreate) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return (
    <View style={styles.grid}>
      {boards.map((board) => {
        const movies = board.movieIds.map(getMovieById).filter(Boolean);
        return (
          <Pressable
            key={board.id}
            style={({ pressed }) => [{ width: size }, pressed && styles.pressed]}
            onPress={() => onOpen(board)}
            accessibilityLabel={board.name}
          >
            <BoardCover movies={movies} size={size} />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {board.name}
              </Text>
              <Text style={styles.count}>
                {t("{count} movies", { count: board.movieIds.length })}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {onCreate && (
        <Pressable
          style={({ pressed }) => [{ width: size }, pressed && styles.pressed]}
          onPress={onCreate}
          accessibilityRole="button"
        >
          <View style={[styles.newTile, { width: size, height: size }]}>
            <Plus size={32} color={colors.textSecondary} strokeWidth={1.5} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{t("New board")}</Text>
            <Text style={styles.count}>
              {boards.length === 0 ? t("Rainy day, date night…") : t("Another mood")}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Cancels the page's side padding: edge to edge, 2px apart.
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 2,
      rowGap: spacing.md,
      marginHorizontal: -spacing.md,
    },
    pressed: {
      opacity: 0.8,
    },
    info: {
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.xs,
    },
    name: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    count: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    newTile: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    emptyText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      paddingVertical: spacing.xl,
    },
  });

export default ProfileBoards;

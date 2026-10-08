import { CheckCircle, Circle, Plus } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "./AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMovieById } from "../data/movies";
import { BOARD_NAME_MAX, useBoardStore } from "../store/boardStore";
import { showToast } from "../store/toastStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { BoardCover } from "./BoardCover";
import { BottomSheet } from "./BottomSheet";
import { t } from "../i18n";

const COVER_SIZE = 52;

// From a movie: tick the boards it belongs on (a movie can be on several),
// or make a new board right here and drop it in.
export const AddToBoardSheet = ({ visible, onClose, movieId }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const boards = useBoardStore((state) => state.boards);
  const createBoard = useBoardStore((state) => state.createBoard);
  const toggleBoardMovie = useBoardStore((state) => state.toggleBoardMovie);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!visible) setNewName("");
  }, [visible]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createBoard(name, [movieId]);
    setNewName("");
    showToast(t("Added to {name}", { name }), { tone: "success" });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      size="half"
      title={t("Add to board")}
    >
      <View style={styles.newRow}>
        <Plus size={18} color={colors.textSecondary} />
        <TextInput
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleCreate}
          placeholder={t("New board…")}
          placeholderTextColor={colors.textMuted}
          maxLength={BOARD_NAME_MAX}
          returnKeyType="done"
          style={styles.newInput}
        />
        {!!newName.trim() && (
          <Pressable onPress={handleCreate} hitSlop={8}>
            <Text style={styles.createText}>{t("Create")}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
      >
        {boards.length === 0 && (
          <Text style={styles.empty}>
            {t("No boards yet — name one above to start.")}
          </Text>
        )}
        {boards.map((board) => {
          const isOn = board.movieIds.includes(movieId);
          const movies = board.movieIds.map(getMovieById).filter(Boolean);
          return (
            <Pressable
              key={board.id}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => toggleBoardMovie(board.id, movieId)}
              accessibilityState={{ checked: isOn }}
            >
              <BoardCover movies={movies} size={COVER_SIZE} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {board.name}
                </Text>
                <Text style={styles.rowMeta}>
                  {t("{count} movies", { count: movies.length })}
                </Text>
              </View>
              {isOn ? (
                <CheckCircle size={22} color={colors.success} />
              ) : (
                <Circle size={22} color={colors.textMuted} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    newRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    newInput: {
      ...typography.body,
      flex: 1,
      paddingVertical: spacing.sm + 2,
      color: colors.textPrimary,
    },
    createText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    pressed: {
      opacity: 0.7,
    },
    rowInfo: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    rowMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      paddingVertical: spacing.xl,
    },
  });

export default AddToBoardSheet;

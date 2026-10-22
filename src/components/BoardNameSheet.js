import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "./AppText";

import { BOARD_NAME_MAX } from "../store/boardStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { BottomSheet } from "./BottomSheet";
import { PrimaryButton } from "./PrimaryButton";
import { t } from "../i18n";

// Starting points for a new board — tap one to fill the name.
const SUGGESTIONS = [
  "Rainy day",
  "Date night",
  "Comfort rewatches",
  "Mind-benders",
  "Family night",
  "Halloween",
];

// Name a new board, or rename one (pass `initialName`). Suggestions only
// show when creating.
export const BoardNameSheet = ({ visible, onClose, onSave, initialName }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const isRename = initialName !== undefined;
  const [name, setName] = useState(initialName ?? "");

  useEffect(() => {
    if (visible) setName(initialName ?? "");
  }, [visible, initialName]);

  const trimmed = name.trim();
  const save = () => {
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      size="auto"
      title={isRename ? t("Rename board") : t("New board")}
      subtitle={
        isRename ? undefined : t("Your own list — for a mood, a person, a night")
      }
      footer={
        <PrimaryButton
          label={isRename ? t("Save") : t("Create board")}
          disabled={!trimmed}
          onPress={save}
        />
      }
    >
      <TextInput
        value={name}
        onChangeText={setName}
        onSubmitEditing={save}
        placeholder={t("Board name")}
        placeholderTextColor={colors.textMuted}
        maxLength={BOARD_NAME_MAX}
        returnKeyType="done"
        autoFocus
        style={styles.input}
      />
      {!isRename && (
        <View style={styles.chips}>
          {SUGGESTIONS.map((suggestion) => {
            const label = t(suggestion);
            const selected = name === label;
            return (
              <Pressable
                key={suggestion}
                onPress={() => setName(label)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    input: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 27,
      color: colors.textPrimary,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      borderRadius: shape.control,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: shape.tab,
    },
    chipSelected: {
      backgroundColor: colors.selected,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.segmentText,
    },
    chipTextSelected: {
      color: colors.selectedText,
    },
  });

export default BoardNameSheet;

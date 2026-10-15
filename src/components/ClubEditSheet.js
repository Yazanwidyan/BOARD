import { useEffect, useState } from "react";
import { StyleSheet, TextInput } from "react-native";

import { CLUB_DESCRIPTION_MAX, CLUB_NAME_MAX } from "../store/clubsStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { t } from "../i18n";
import { Text } from "./AppText";
import { BottomSheet } from "./BottomSheet";
import { PrimaryButton } from "./PrimaryButton";

// The owner's edit: the club's name and what it's about.
export const ClubEditSheet = ({ visible, onClose, onSave, club }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [name, setName] = useState(club?.name ?? "");
  const [description, setDescription] = useState(club?.description ?? "");

  useEffect(() => {
    if (visible) {
      setName(club?.name ?? "");
      setDescription(club?.description ?? "");
    }
  }, [visible, club]);

  const save = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      size="auto"
      title={t("Edit club")}
      footer={
        <PrimaryButton
          label={t("Save")}
          disabled={!name.trim()}
          onPress={save}
        />
      }
    >
      <Text style={styles.label}>{t("Name")}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("Club name")}
        placeholderTextColor={colors.textMuted}
        maxLength={CLUB_NAME_MAX}
        returnKeyType="next"
        style={styles.input}
      />
      <Text style={styles.label}>{t("About")}</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={t("What's this club watching?")}
        placeholderTextColor={colors.textMuted}
        maxLength={CLUB_DESCRIPTION_MAX}
        multiline
        style={[styles.input, styles.multiline]}
      />
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    label: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    input: {
      ...typography.body,
      color: colors.textPrimary,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    multiline: {
      minHeight: 80,
      textAlignVertical: "top",
    },
  });

export default ClubEditSheet;

import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { t } from "../i18n";
import { api } from "../services/api";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";
import { BottomSheet } from "./BottomSheet";
import { PrimaryButton } from "./PrimaryButton";

const REASONS = [
  { key: "spam", label: "Spam or a scam" },
  { key: "offensive", label: "Offensive or hateful" },
  { key: "harassment", label: "Harassment or bullying" },
  { key: "impersonation", label: "Pretending to be someone" },
  { key: "other", label: "Something else" },
];
const NOTE_MAX = 500;

// One choice in a list: a row with a check when it's the one.
const Choice = ({ selected, label, sublabel, onPress, styles, colors }) => (
  <Pressable
    style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
  >
    <View style={styles.choiceText}>
      <Text style={styles.choiceLabel} numberOfLines={1}>
        {label}
      </Text>
      {!!sublabel && <Text style={styles.choiceSub}>{sublabel}</Text>}
    </View>
    {selected && <Check size={18} color={colors.textPrimary} strokeWidth={2.4} />}
  </Pressable>
);

// Reporting something to ReelBoard (POST /api/reports, the admin site's
// Reports queue): what — when there's a choice, like a person or one of
// their lists — then why, and a note if they want. Nobody is told who
// reported them.
// `targets`: [{ type: "user" | "list" | "club", id, label }].
export const ReportSheet = ({ visible, onClose, targets }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [targetIndex, setTargetIndex] = useState(0);
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTargetIndex(0);
    setReason(null);
    setNote("");
  }, [visible]);

  const target = targets[targetIndex];
  const send = async () => {
    if (!target || !reason || sending) return;
    setSending(true);
    try {
      const result = await api.post("/reports", {
        targetType: target.type,
        targetId: target.id,
        reason,
        note: note.trim(),
      });
      onClose();
      showToast(result?.alreadyReported ? t("You've already reported this — we're on it.") : t("Thanks — we'll take a look."));
    } catch (err) {
      showToast(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      size="auto"
      flush
      title={t("Report")}
      subtitle={t("Only ReelBoard sees who reported it.")}
      footer={
        <PrimaryButton
          label={sending ? t("Sending…") : t("Send report")}
          disabled={!reason || sending}
          onPress={send}
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {targets.length > 1 && (
          <>
            <Text style={styles.label}>{t("What are you reporting?")}</Text>
            <View style={styles.group}>
              {targets.map((item, index) => (
                <Choice
                  styles={styles}
                  colors={colors}
                  key={`${item.type}:${item.id}`}
                  selected={index === targetIndex}
                  label={item.label}
                  sublabel={item.type === "user" ? t("Their profile") : item.type === "list" ? t("A list") : t("The club")}
                  onPress={() => setTargetIndex(index)}
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>{t("What's wrong?")}</Text>
        <View style={styles.group}>
          {REASONS.map((item) => (
            <Choice styles={styles} colors={colors} key={item.key} selected={reason === item.key} label={t(item.label)} onPress={() => setReason(item.key)} />
          ))}
        </View>

        <Text style={styles.label}>{t("Anything else? (optional)")}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t("Tell us what you saw")}
          placeholderTextColor={colors.textMuted}
          maxLength={NOTE_MAX}
          multiline
          style={styles.input}
        />
      </ScrollView>
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    label: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: colors.textSecondary,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    // Full-width rows, a hairline apart.
    group: {
      gap: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    choice: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      backgroundColor: colors.card,
    },
    choicePressed: {
      backgroundColor: colors.cardElevated,
    },
    choiceText: {
      flex: 1,
      gap: 1,
    },
    choiceLabel: {
      ...typography.body,
      color: colors.textPrimary,
    },
    choiceSub: {
      ...typography.caption,
      color: colors.textMuted,
    },
    input: {
      ...typography.body,
      color: colors.textPrimary,
      backgroundColor: colors.card,
      borderRadius: shape.control,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      minHeight: 88,
      textAlignVertical: "top",
    },
  });

export default ReportSheet;
